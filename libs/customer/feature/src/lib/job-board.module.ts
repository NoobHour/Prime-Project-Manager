import { Component, OnInit, OnDestroy, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Subscription } from 'rxjs';
import { IUserService } from '@mgmt/user/shared';
@Component({
  standalone: false,
  selector: 'mgmt-job-board',
  templateUrl: './job-board.html',
  styleUrls: ['./job-board.scss'],
})
export class JobBoardComponent implements OnInit, OnDestroy {
  jobs: any[] = [];
  team: any[] = [];
  total = 0;
  complete = false;
  archived = false;
  today = '';
  label = '';
  scope = '';
  dueSoon = false;
  views: any[] = [];
  viewName = '';
  /** Accepts no input; returns the current bookmarkable board URL for workspace return links. */
  get returnUrl() { return this.router.url; }
  error = '';
  search = '';
  assignee = '';
  priority = '';
  lane = '';
  overdue = false;
  attention = false;
  saving = '';
  loading = false;
  expanded = '';
  private timer: ReturnType<typeof setTimeout>;
  private request?: Subscription;
  private routeChanges?: Subscription;
  private destroyed = false;
  /** Accepts transport, route and account services; restores filters supplied by dashboard links. */
  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private users: IUserService,
  ) {
    this.complete = router.url.startsWith('/completed');
  }
  /** Accepts no input; loads owners independently of the initial job search. */
  ngOnInit() {
    this.http.get<any>('/api/views').subscribe({ next: (result) => { this.views = result.listData; }, error: () => { this.error = 'Could not load saved views.'; } });
    this.http.get<any>('/api/team').subscribe({
      next: (r) => {
        if (!this.destroyed) this.team = r.listData;
      },
      error: () => {
        if (!this.destroyed) this.error = 'Could not load team.';
      },
    });
    this.routeChanges = this.route.queryParamMap.subscribe((params) => {
      this.archived = params.get('archived') === 'true';
      this.complete = this.router.url.startsWith('/completed') || params.get('complete') === 'true';
      this.scope = params.get('scope') || '';
      this.dueSoon = params.get('dueSoon') === 'true';
      this.label = params.get('label') || '';
      this.search = (params.get('search') || '').slice(0, 200);
      this.assignee = params.get('assignee') || '';
      this.priority = params.get('priority') || '';
      this.lane = this.complete ? '' : params.get('lane') || '';
      this.overdue = !this.complete && params.get('overdue') === 'true';
      this.attention = !this.complete && params.get('attention') === 'true';
      this.load();
    });
  }
  /** Accepts no input; cancels the pending search and prevents updates after navigation. */
  ngOnDestroy() {
    this.destroyed = true;
    clearTimeout(this.timer);
    this.request?.unsubscribe();
    this.routeChanges?.unsubscribe();
  }
  /** Accepts an optional debounce flag; cancels stale results immediately and searches after a short typing pause. */
  filterChanged(debounce = false) {
    clearTimeout(this.timer);
    this.request?.unsubscribe();
    this.loading = true;
    this.timer = setTimeout(() => this.applyFilters(), debounce ? 250 : 0);
  }
  /** Accepts no input; stores filters in the URL so reload, bookmarks and Back restore the current search. */
  applyFilters() {
    const queryParams = {
      archived: this.archived || null,
      complete: this.complete || null,
      scope: this.scope || null,
      dueSoon: this.dueSoon || null,
      label: this.label || null,
      search: this.search || null,
      assignee: this.assignee || null,
      priority: this.priority || null,
      lane: this.lane || null,
      overdue: this.overdue || null,
      attention: this.attention || null,
    };
    const target = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams,
    });
    if (this.router.serializeUrl(target) === this.router.url) this.load();
    else void this.router.navigateByUrl(target, { replaceUrl: true });
  }
  /** Accepts an append flag; replaces the prior request so an older search can never overwrite newer results. */
  load(append = false) {
    clearTimeout(this.timer);
    this.request?.unsubscribe();
    this.loading = true;
    this.error = '';
    this.request = this.http
      .get<any>('/api/jobs', {
        params: {
          complete: this.complete,
          archived: this.archived,
          scope: this.scope,
          dueSoon: this.dueSoon,
          label: this.label,
          limit: 30,
          offset: append ? this.jobs.length : 0,
          search: this.search,
          assignee: this.assignee,
          priority: this.priority,
          lane: this.lane,
          overdue: this.overdue,
          attention: this.attention,
        },
      })
      .subscribe({
        next: (r) => {
          this.jobs = append ? [...this.jobs, ...r.listData] : r.listData;
          this.total = r.total;
          this.today = r.today;
          this.loading = false;
        },
        error: (e) => {
          this.error = e.error?.message || 'Could not load jobs. Try again.';
          this.loading = false;
        },
      });
  }
  /** Accepts no input; toggles the signed-in user's assignments and immediately applies the filter. */
  mine() {
    this.scope = '';
    this.assignee =
      this.assignee === this.users.userInfo?.id
        ? ''
        : this.users.userInfo?.id || '';
    this.filterChanged();
  }
  /** Accepts no input; returns whether the current account is selected. */
  get onlyMine() {
    return !!this.assignee && this.assignee === this.users.userInfo?.id;
  }
  /** Accepts no input; resets all filters and reloads the first page. */
  clear() {
    this.search = '';
    this.assignee = '';
    this.priority = '';
    this.lane = '';
    this.overdue = false;
    this.attention = false;
    this.scope = this.label = '';
    this.dueSoon = false;
    this.filterChanged();
  }
  /** Accepts an index and job; returns stable identity to preserve row controls during refresh. */
  trackJob(_index: number, job: any) {
    return job.jobSlug;
  }
  /** Accepts an owner ID; returns its name or a readable fallback. */
  owner(id: string) {
    return (
      this.team.find((member) => member.id === id)?.username ||
      (id ? 'Former team member' : 'Unassigned')
    );
  }
  /** Accepts a job; returns the completed checklist count. */
  done(job: any) {
    return (job.taskList || []).filter((item) => item.done).length;
  }
  /** Accepts a job; returns whether its deadline has passed using the API's workspace-local Today. */
  isOverdue(job: any) {
    return (
      !job.isComplete &&
      job.dueDate &&
      this.today && job.dueDate < this.today
    );
  }
  /** Accepts no input; returns whether the current list is filtered rather than an empty workspace view. */
  get filtered() { return !!(this.search || this.assignee || this.priority || this.lane || this.label || this.scope || this.overdue || this.attention || this.dueSoon); }
  /** Accepts no input; stores the current URL filters as a private named view for this account. */
  async saveView() {
    if (!this.viewName.trim()) return;
    try { const result = await firstValueFrom(this.http.post<any>('/api/views', { name: this.viewName, query: this.router.url.split('?')[1] || (this.complete ? 'complete=true' : '') })); this.views = result.listData; this.viewName = ''; }
    catch (e: any) { this.error = e.error?.message || 'Could not save view.'; }
  }
  /** Accepts a private view; restores its supported filters through the same bookmarkable Jobs route. */
  openView(view: any) { void this.router.navigateByUrl('/jobs' + (view.query ? '?' + view.query : '')); }
  /** Accepts a job and status; persists the versioned change then reloads the current search. */
  async move(job: any, lane: string) {
    if (this.saving) return;
    this.saving = job.jobSlug;
    try {
      await firstValueFrom(
        this.http.put('/api/customers/jobs/' + job.jobSlug, {
          ...job,
          lane,
          isActive: lane === 'active',
          isComplete: lane === 'complete',
          isArchived: lane === 'archived',
        }),
      );
      if (!this.destroyed) this.load();
    } catch (e) {
      if (!this.destroyed)
        this.error = e.error?.message || 'Could not update status.';
    } finally {
      this.saving = '';
    }
  }
  /** Accepts an archived job; restores its version to Planned and retains any conflict as a visible error. */
  async restore(job: any) {
    if (this.saving || job.customerArchived) return;
    this.saving = job.jobSlug;
    this.error = '';
    try {
      await firstValueFrom(this.http.post('/api/jobs/' + job.jobSlug + '/restore', { version: job.version }));
      if (!this.destroyed) this.load();
    } catch (e: any) { this.error = e.error?.message || 'Could not restore this job.'; }
    finally { this.saving = ''; }
  }
  /** Accepts a job and checklist item; persists only the toggled checklist and merges the confirmed version without collapsing details. */
  async toggleTask(job: any, task: any) {
    if (this.saving || this.loading) return;
    this.saving = job.jobSlug;
    this.error = '';
    try {
      const result = await firstValueFrom(
        this.http.put<any>('/api/customers/jobs/' + job.jobSlug, {
          ...job,
          taskList: job.taskList.map((item) =>
            item.id === task.id ? { ...item, done: !item.done } : item,
          ),
        }),
      );
      if (!this.destroyed) Object.assign(job, result.data);
    } catch (e) {
      if (!this.destroyed)
        this.error =
          e.error?.message || 'Could not update checklist. Try again.';
    } finally {
      this.saving = '';
    }
  }
}
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([{ path: '', component: JobBoardComponent }]),
  ],
  declarations: [JobBoardComponent],
})
export class JobBoardModule {}
