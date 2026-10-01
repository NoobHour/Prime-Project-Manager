import { Component, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';

@Component({
  standalone: false,
  selector: 'ppm-job-view',
  templateUrl: './job-view.component.html',
  styleUrls: ['./job-view.component.scss'],
})
export class JobViewComponent implements OnInit, OnDestroy {
  @ViewChild('jobDiscussion') discussion?: { hasDraft: boolean; busy: boolean };
  job: any;
  draft: any;
  customer: any;
  jobs: any[] = [];
  team: any[] = [];
  loading = false;
  saving = false;
  error = '';
  notice = '';
  slug = '';
  leavePrompt = false;
  private leaveDecision?: (discard: boolean) => void;
  private routeChanges?: Subscription;
  private requestId = 0;
  private savedDraft = '';

  /** Accepts HTTP and route services; initializes a job editor that keeps server state separate from its draft. */
  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  /** Accepts no input; loads the job on initial navigation and when opening another job from this page. */
  ngOnInit() {
    this.routeChanges = this.route.paramMap.subscribe((params) => this.load(params.get('jobSlug') || ''));
  }
  /** Accepts no input; releases route subscriptions and prevents late reads from replacing another page's state. */
  ngOnDestroy() {
    this.routeChanges?.unsubscribe();
    this.requestId++;
  }
  /** Accepts no input; returns whether the editable values differ from the last confirmed save. */
  get dirty() {
    return !!this.draft && JSON.stringify(this.draft) !== this.savedDraft;
  }
  /** Accepts no input; returns whether job edits or unsent messages need protection before navigation. */
  get unsaved() { return this.dirty || !!this.discussion?.hasDraft; }
  /** Accepts no input; returns whether the title and every checklist row contain meaningful text before saving. */
  get validDraft() {
    return !!this.draft?.name?.trim() && this.draft.taskList.every((task) => task.title.trim());
  }
  /** Accepts no input; returns completed and total checklist counts for the page summary. */
  get progress() {
    const tasks = this.draft?.taskList || [];
    return `${tasks.filter((task) => task.done).length} of ${tasks.length} complete`;
  }
  /** Accepts no input; returns whether the stored owner is disabled or otherwise absent from the enabled staff list. */
  get unavailableOwner() {
    return !!this.draft?.assigneeId && !this.team.some((member) => member.id === this.draft.assigneeId);
  }
  /** Accepts a job slug; loads its customer, related jobs and enabled staff, ignoring superseded requests. */
  async load(slug: string) {
    this.slug = slug;
    const request = ++this.requestId;
    this.loading = true;
    this.error = this.notice = '';
    this.job = this.draft = this.customer = null;
    this.jobs = [];
    try {
      const detail = await firstValueFrom(this.http.get<any>(`/api/customers/jobs/${encodeURIComponent(slug)}`));
      if (request !== this.requestId) return;
      const job = detail.detailData;
      const [customer, team] = await Promise.all([
        firstValueFrom(this.http.get<any>(`/api/customers/${job.customerSlug}`)),
        firstValueFrom(this.http.get<any>('/api/team')),
      ]);
      const jobs: any[] = [];
      let total = 1;
      while (request === this.requestId && jobs.length < total) {
        const page = await firstValueFrom(this.http.get<any>(`/api/customers/${job.customerSlug}/jobs`, { params: { limit: 100, offset: jobs.length } }));
        jobs.push(...page.listData);
        total = page.total;
        if (!page.listData.length) break;
      }
      if (request !== this.requestId) return;
      this.job = job;
      this.customer = customer.detailData;
      this.team = team.listData;
      this.jobs = jobs;
      this.resetDraft();
    } catch (e: any) {
      if (request === this.requestId) this.error = e.error?.message || 'Unable to load this job.';
    } finally {
      if (request === this.requestId) this.loading = false;
    }
  }
  /** Accepts no input; restores editable fields from the last confirmed job, including a separate checklist copy. */
  resetDraft() {
    this.draft = {
      name: this.job.name,
      body: this.job.body,
      lane: this.job.isArchived ? 'archived' : this.job.isComplete ? 'complete' : this.job.lane || 'planned',
      assigneeId: this.job.assigneeId,
      dueDate: this.job.dueDate,
      priority: this.job.priority,
      taskList: (this.job.taskList || []).map((task) => ({ ...task })),
    };
    this.savedDraft = JSON.stringify(this.draft);
  }
  /** Accepts no input; saves only this job with its version, preserving the draft on validation or conflict failure. */
  async save() {
    if (this.saving || !this.validDraft) return;
    this.saving = true;
    this.error = this.notice = '';
    try {
      const data = {
        ...this.draft,
        version: this.job.version,
        isActive: this.draft.lane === 'active',
        isComplete: this.draft.lane === 'complete',
        isArchived: this.draft.lane === 'archived',
      };
      const result = await firstValueFrom(this.http.put<any>(`/api/customers/jobs/${this.job.jobSlug}`, data));
      this.job = result.data;
      this.jobs = this.jobs.map((job) => job.jobSlug === this.job.jobSlug ? this.job : job);
      this.resetDraft();
      this.notice = 'Job saved.';
    } catch (e: any) {
      this.error = e.error?.message || 'Unable to save this job. Your changes are still here.';
    } finally {
      this.saving = false;
    }
  }
  /** Accepts no input; appends a uniquely identified blank checklist row for editing before save. */
  addTask() {
    if (this.draft.taskList.length < 100)
      this.draft.taskList.push({ id: crypto.randomUUID(), title: '', done: false });
  }
  /** Accepts a checklist index; removes that row from the draft without changing persisted work. */
  removeTask(index: number) {
    this.draft.taskList.splice(index, 1);
  }
  /** Accepts PrimeNG's initialized Quill editor event; labels its editable root as the multiline scope textbox for assistive tools. */
  initializeScope(event: any) {
    event.editor.root.setAttribute('role', 'textbox');
    event.editor.root.setAttribute('aria-labelledby', 'scope-label');
    event.editor.root.setAttribute('aria-multiline', 'true');
  }
  /** Accepts no input; reloads confirmed values after explicitly discarding an unsaved draft. */
  async reload() {
    if (await this.canLeave()) this.load(this.job.jobSlug);
  }
  /** Accepts no input; returns a boolean or a pending decision promise so navigation waits for explicit draft-discard consent. */
  canLeave() {
    if (this.saving || this.discussion?.busy) return false;
    if (!this.unsaved) return true;
    if (this.leavePrompt) return false;
    this.leavePrompt = true;
    return new Promise<boolean>((resolve) => { this.leaveDecision = resolve; });
  }
  /** Accepts the user's discard decision; closes the in-page prompt and resolves the pending navigation or reload. */
  resolveLeave(discard: boolean) {
    const decision = this.leaveDecision;
    this.leaveDecision = undefined;
    this.leavePrompt = false;
    decision?.(discard);
  }
  /** Accepts a browser unload event; requests the browser's standard warning when a draft or save is pending. */
  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent) {
    if (this.unsaved || this.saving || this.discussion?.busy) { event.preventDefault(); event.returnValue = ''; }
  }
}
