import { Component, HostListener, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { IUserService } from '@mgmt/user/shared';
import { firstValueFrom, Subscription } from 'rxjs';
import { EditorState, editorWork } from '../editor-state';
@Component({
  standalone: false,
  selector: 'mgmt-view-customer',
  templateUrl: './view-customer.component.html',
  styleUrls: ['./view-customer.component.scss'],
})
export class ViewCustomerComponent implements OnInit, OnDestroy {
  private changes = new Subscription();
  private revision = 0;
  @ViewChild('customerDiscussion') discussion?: { hasDraft: boolean; busy: boolean };
  @ViewChild('customerCalendar') calendar?: EditorState;
  @ViewChild('customerFiles') files?: EditorState;
  busy = false;
  /** Accepts no input; returns the combined protection state for every mounted customer resource. */
  get resourceWork() { return editorWork([this.discussion, this.calendar, this.files]); }
  leavePrompt = false;
  private leaveDecision?: (discard: boolean) => void;
  customer: any;
  jobsList: any[] = [];
  team: any[] = [];
  returnUrl = '/customers';
  resourceIndex = 0;
  error = '';
  /** Accepts HTTP, account and routing services; initializes the customer detail view. */
  constructor(
    private http: HttpClient,
    public userService: IUserService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}
  /** Accepts no arguments; loads the routed customer and paginated jobs. */
  async ngOnInit() {
    this.changes.add(this.route.queryParamMap.subscribe(() => this.readLocation()));
    this.changes.add(this.route.paramMap.subscribe((params) => void this.loadCustomer(params.get('slug'))));
    try { this.team = (await firstValueFrom(this.http.get<any>('/api/team'))).listData; }
    catch { this.error = 'Could not load owner names.'; }
  }
  /** Accepts no input; applies URL resource and return context without replacing mounted drafts. */
  private readLocation() {
    const returnTo = this.route.snapshot.queryParamMap.get('returnTo') || '';
    if (/^\/customers(\?|$)/.test(returnTo)) this.returnUrl = returnTo;
    this.resourceIndex = Math.max(0, ['jobs', 'discussion', 'calendar', 'files'].indexOf(this.route.snapshot.queryParamMap.get('resource') || 'jobs'));
  }
  /** Accepts no input; releases route listeners and invalidates outstanding record reads. */
  ngOnDestroy() { this.changes.unsubscribe(); this.revision++; }
  /** Accepts a resource index; updates the deep link while keeping every editor mounted. */
  selectResource(index: number) {
    this.resourceIndex = index;
    void this.router.navigate([], { relativeTo: this.route, queryParams: { resource: ['jobs', 'discussion', 'calendar', 'files'][index] }, queryParamsHandling: 'merge', replaceUrl: true });
  }
  /** Accepts an owner ID; returns a readable current or historical owner label. */
  owner(id: string) { return this.team.find((member) => member.id === id)?.username || (id ? 'Former team member' : 'Unassigned'); }
  /** Accepts a job; returns its completed checklist count for the customer overview. */
  progress(job: any) { return `${(job.taskList || []).filter((task) => task.done).length} / ${(job.taskList || []).length} steps`; }
  /** Accepts customer slug; refreshes persisted customer fields and all jobs in bounded pages. */
  async loadCustomer(slug: string) {
    const revision = ++this.revision;
    this.customer = null;
    this.jobsList = [];
    this.error = '';
    try {
      const r: any = await firstValueFrom(
        this.http.get('/api/customers/' + slug),
      );
      if (revision !== this.revision) return;
      this.customer = r.detailData;
      this.jobsList = [];
      let total = 1;
      while (this.jobsList.length < total) {
        const j: any = await firstValueFrom(
          this.http.get(
            `/api/customers/${slug}/jobs?limit=100&offset=${this.jobsList.length}`,
          ),
        );
        if (revision !== this.revision) return;
        this.jobsList.push(...j.listData);
        total = j.total;
        if (!j.listData.length) break;
      }
    } catch (e) {
      if (revision === this.revision) this.error = e.error?.message || 'Could not load customer.';
    }
  }
  /** Accepts no input; returns immediate permission or a pending decision so unsent board drafts survive cancelled navigation. */
  canLeave() {
    if (this.busy || this.resourceWork.pending) return false;
    if (!this.resourceWork.dirty) return true;
    if (this.leavePrompt) return false;
    this.leavePrompt = true;
    return new Promise<boolean>((resolve) => { this.leaveDecision = resolve; });
  }
  /** Accepts the user's discard choice; closes the prompt and resolves the pending customer-page navigation. */
  resolveLeave(discard: boolean) {
    this.leavePrompt = false;
    this.leaveDecision?.(discard);
    this.leaveDecision = undefined;
  }
  /** Accepts a browser unload event; requests a warning while a discussion draft or message send is pending. */
  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent) {
    if (this.busy || this.resourceWork.dirty || this.resourceWork.pending) { event.preventDefault(); event.returnValue = ''; }
  }
  /** Accepts no arguments; confirms archival and returns to the customer list. */
  async delete() {
    if (this.busy || this.resourceWork.pending || !confirm('Archive this customer? Their jobs leave active views but keep their original status and history.')) return;
    this.busy = true;
    try {
      await firstValueFrom(
        this.http.delete('/api/customers/' + this.customer.slug, { body: { version: this.customer.version } }),
      );
      this.customer = { ...this.customer, isArchived: true, version: this.customer.version + 1 };
      this.busy = false;
      await this.router.navigate(['/customers']);
    } catch (e) {
      this.error = e.error?.message || 'Could not archive customer.';
    } finally { this.busy = false; }
  }
}
