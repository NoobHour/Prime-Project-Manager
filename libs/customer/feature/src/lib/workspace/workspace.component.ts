import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { IUserService } from '@mgmt/user/shared';
import { calendarDate, shiftDate, wallTime, wallToInstant } from '@mgmt/shared/common/src/lib/workspace-time';
import { mayReplace } from '../editor-state';

@Component({ standalone: false, selector: 'ppm-workspace', templateUrl: './workspace.component.html', styleUrls: ['./workspace.component.scss'] })
export class WorkspaceComponent implements OnInit, OnDestroy {
  mode = 'schedule';
  settings: any;
  draft: any;
  template: any;
  checklistText = '';
  rows: any[] = [];
  total = 0;
  offset = 0;
  search = '';
  from = '';
  to = '';
  type = '';
  customerSlug = '';
  jobSlug = '';
  scopeSearch = '';
  scopeChoices: any[] = [];
  view = 'agenda';
  viewDate = new Date();
  events: any[] = [];
  busy = false;
  loading = false;
  error = '';
  notice = '';
  private saved = '';
  private revision = 0;
  private scopeRevision = 0;
  private routeChanges?: Subscription;
  private timer?: ReturnType<typeof setInterval>;
  /** Accepts transport, route and account services; creates a workspace page with isolated form drafts. */
  constructor(private http: HttpClient, private route: ActivatedRoute, private router: Router, public users: IUserService) {}
  /** Accepts no input; returns whether settings or template content differs from the loaded snapshot. */
  get hasDraft() { return !!this.saved && JSON.stringify([this.draft, this.template, this.checklistText]) !== this.saved; }
  /** Accepts no input; clears editable state after a confirmed discard. */
  discardDraft() { this.draft = this.settings ? { ...this.settings } : undefined; this.template = undefined; this.checklistText = ''; this.remember(); }
  /** Accepts no input; snapshots editor values after successful reads or saves. */
  private remember() { this.saved = JSON.stringify([this.draft, this.template, this.checklistText]); }
  /** Accepts no input; protects drafts and pending writes during route navigation. */
  canLeave() { return mayReplace(this, 'Discard these unsaved settings or template changes?'); }
  /** Accepts a browser unload event; asks the browser to protect unsaved work and pending writes. */
  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent) { if (this.hasDraft || this.busy) { event.preventDefault(); event.returnValue = ''; } }
  /** Accepts no input; loads persisted settings and binds URL-backed query state for this page. */
  async ngOnInit() {
    this.mode = this.router.url.split('?')[0].slice(1);
    try {
      const result = await firstValueFrom(this.http.get<any>('/api/workspace'));
      if (this.revision < 0) return;
      this.settings = result.data;
      this.draft = { ...this.settings, timezone: this.settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone };
      this.remember();
      this.routeChanges = this.route.queryParamMap.subscribe((params) => {
        const today = result.today || wallTime(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone).slice(0, 10);
        this.search = params.get('q') || '';
        this.from = params.get('from') || today;
        this.to = params.get('to') || shiftDate(today, 30);
        this.type = params.get('type') || '';
        this.customerSlug = params.get('customer') || '';
        this.jobSlug = params.get('job') || '';
        this.view = ['agenda', 'month', 'week', 'day'].includes(params.get('view')) ? params.get('view') : 'agenda';
        this.viewDate = calendarDate(this.from + 'T12:00:00Z', 'UTC');
        void this.load();
      });
      if (this.mode === 'updates') this.timer = setInterval(() => { if (!document.hidden && !this.loading && !this.busy && this.offset === 0) void this.load(); }, 30000);
    } catch (e: any) { this.error = e.error?.message || 'Could not load workspace settings.'; }
  }
  /** Accepts no input; releases polling and route listeners and ignores late requests. */
  ngOnDestroy() { this.routeChanges?.unsubscribe(); clearInterval(this.timer); this.revision = -1; this.scopeRevision++; }
  /** Accepts no input; writes filters to the URL so refresh and Back restore the same screen. */
  async apply() {
    const params = this.mode === 'search' ? { q: this.search || null } : { from: this.from, to: this.to, type: this.type || null, customer: this.customerSlug || null, job: this.jobSlug || null, view: this.view };
    await this.router.navigate([], { relativeTo: this.route, queryParams: params });
    if (!this.loading) await this.load();
  }
  /** Accepts a page offset; returns bounded results, ignoring superseded requests and preserving editor state on failure. */
  async load(offset = 0) {
    if (this.revision < 0 || this.mode === 'workspace') return;
    const request = ++this.revision;
    this.loading = true;
    this.error = '';
    try {
      let url = '/api/' + this.mode;
      let params: any = { limit: 50, offset };
      if (this.mode === 'search') {
        if (!this.search.trim()) { this.rows = []; this.total = 0; return; }
        params.q = this.search;
      }
      if (this.mode === 'schedule') {
        if (!this.settings.timezone) { this.rows = []; return; }
        params = { ...params, from: wallToInstant(this.from + 'T00:00', this.settings.timezone, 'earlier'), to: wallToInstant(shiftDate(this.to, 1) + 'T00:00', this.settings.timezone, 'later'), type: this.type, customerSlug: this.customerSlug, jobSlug: this.jobSlug };
      }
      const result = await firstValueFrom(this.http.get<any>(url, { params }));
      if (request !== this.revision) return;
      this.rows = result.listData;
      this.total = result.total;
      this.offset = offset;
      this.events = this.mode === 'schedule' ? this.rows.map((row) => ({ title: (row.allDay ? 'Deadline: ' : '') + row.title, start: row.allDay ? calendarDate(row.start + 'T00:00:00Z', 'UTC') : calendarDate(row.start, this.settings.timezone), end: row.allDay ? undefined : calendarDate(row.end, this.settings.timezone), allDay: !!row.allDay, meta: row, color: { primary: row.allDay ? '#ffc36a' : '#8dd0ff', secondary: '#2a323d' } })) : [];
    } catch (e: any) { if (request === this.revision) this.error = e.error?.message || e.message || 'Could not load this page.'; }
    finally { if (request === this.revision) this.loading = false; }
  }
  /** Accepts no input; finds a bounded set of jobs/customers for schedule scope selection. */
  async findScope() {
    const request = ++this.scopeRevision;
    if (!this.scopeSearch.trim()) { this.scopeChoices = []; return; }
    try {
      const result = await firstValueFrom(this.http.get<any>('/api/search', { params: { q: this.scopeSearch, limit: 30 } }));
      if (request === this.scopeRevision) this.scopeChoices = result.listData.filter((row) => row.type !== 'file');
    } catch { this.error = 'Could not find schedule scopes.'; }
  }
  /** Accepts a search result; applies its exact customer or project scope to the shared schedule. */
  chooseScope(row: any) { this.customerSlug = row.type === 'customer' ? row.id : ''; this.jobSlug = row.type === 'job' ? row.id : ''; void this.apply(); }
  /** Accepts a result or update; returns the destination workspace route. */
  link(row: any) { return row.jobSlug ? ['/job', row.jobSlug] : ['/customer', row.customerSlug || row.id]; }
  /** Accepts a result or update; returns resource and record identifiers for direct links. */
  linkParams(row: any) { return { resource: row.type === 'file' ? 'files' : row.type === 'appointment' || row.type === 'deadline' ? 'calendar' : row.kind === 'message' ? 'discussion' : undefined, appointment: row.type === 'appointment' ? row.id : undefined, file: row.type === 'file' ? row.id : undefined, message: row.messageId || undefined }; }
  /** Accepts a calendar event; navigates to the affected workspace resource. */
  openEvent(event: any) { void this.router.navigate(this.link(event.meta), { queryParams: this.linkParams(event.meta) }); }
  /** Accepts an instant; returns a readable workspace-local timestamp. */
  time(value: string) { return this.settings?.timezone ? new Intl.DateTimeFormat('en', { timeZone: this.settings.timezone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : value; }
  /** Accepts no input; saves versioned administrator settings and preserves failed drafts. */
  async saveSettings() {
    if (this.busy) return;
    this.busy = true; this.error = '';
    try { const result = await firstValueFrom(this.http.put<any>('/api/workspace', this.draft)); this.settings = result.data; this.draft = { ...result.data }; this.remember(); this.notice = 'Workspace settings saved.'; window.dispatchEvent(new Event('workspace-settings-changed')); }
    catch (e: any) { this.error = e.error?.message || 'Could not save settings.'; }
    finally { this.busy = false; }
  }
  /** Accepts an optional template; opens a separate editable copy after protecting the current draft. */
  editTemplate(row?: any) {
    if (!mayReplace(this, 'Discard this template draft?')) return;
    this.template = row ? { ...row, checklist: [...row.checklist] } : { name: '', body: '', priority: 'normal', checklist: [], dueOffset: null };
    this.checklistText = this.template.checklist.join('\n'); this.remember();
  }
  /** Accepts no input; persists reusable template fields without modifying jobs already created from them. */
  async saveTemplate() {
    if (this.busy || !this.template) return;
    this.busy = true; this.error = '';
    const data = { ...this.template, checklist: this.checklistText.split('\n').map((value) => value.trim()).filter(Boolean) };
    try {
      const result = await firstValueFrom(this.template.id ? this.http.put<any>('/api/templates/' + this.template.id, data) : this.http.post<any>('/api/templates', data));
      this.template = result.data; this.checklistText = result.data.checklist.join('\n'); this.remember(); this.notice = 'Template saved.'; await this.load();
    } catch (e: any) { this.error = e.error?.message || 'Could not save template.'; }
    finally { this.busy = false; }
  }
  /** Accepts a displayed update; marks only that job through that sequence as read. */
  async markRead(row: any) {
    if (this.busy) return;
    this.busy = true; this.error = '';
    try { await firstValueFrom(this.http.post(`/api/jobs/${row.jobSlug}/read`, { sequence: row.sequence })); await this.load(); }
    catch (e: any) { this.error = e.error?.message || 'Could not mark this job read.'; }
    finally { this.busy = false; }
  }
}
