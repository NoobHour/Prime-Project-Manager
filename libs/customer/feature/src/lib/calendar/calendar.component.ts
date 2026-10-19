import { Component, Input, OnChanges, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { EditorState, mayReplace } from '../editor-state';
import { wallTime, wallToInstant, calendarDate, shiftDate } from '@mgmt/shared/common/src/lib/workspace-time';
/** Accepts an appointment form; returns a timeRange error for invalid/reversed dates, otherwise null. */
export function appointmentTimeRange(control: AbstractControl) {
  const { start, end } = control.value;
  if (!start || !end) return null;
  const from = Date.parse(start + ':00Z');
  const to = Date.parse(end + ':00Z');
  return Number.isFinite(from) && Number.isFinite(to) && to > from
    ? null
    : { timeRange: true };
}
@Component({
  standalone: false,
  selector: 'customercalendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
})
export class CustomerCalendarComponent implements OnInit, OnChanges, OnDestroy, EditorState {
  @Input() customerSlug = '';
  @Input() jobSlug = '';
  @Input() jobs: any[] = [];
  form: FormGroup;
  slug = '';
  selected: any;
  error = '';
  busy = false;
  loading = false;
  notice = '';
  editorOpen = false;
  timezone = '';
  occurrence: 'reject' | 'earlier' | 'later' = 'reject';
  private savedForm = '';
  private destroyed = false;
  private requestId = 0;
  private openedLink = '';
  view = CalendarView.Month;
  CalendarView = CalendarView;
  viewDate = new Date();
  activeDayIsOpen = false;
  events$ = new BehaviorSubject<CalendarEvent[]>([]);
  /** Accepts Angular services; creates a required subject and local-time appointment form. */
  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    fb: FormBuilder,
    private router: Router,
  ) {
    this.form = fb.group(
      {
        subject: ['', Validators.required],
        start: ['', Validators.required],
        end: ['', Validators.required],
        body: [''],
        jobSlug: [''],
      },
      { validators: appointmentTimeRange },
    );
    this.savedForm = JSON.stringify(this.form.value);
  }
  /** Accepts no arguments; loads appointments belonging to the routed customer. */
  ngOnInit() {
    this.http.get<any>('/api/workspace').subscribe({
      // Accepts persisted settings; renders the calendar in that timezone without changing stored instants.
      next: (response) => {
        this.timezone = response.data.timezone;
        if (this.timezone) {
          const selected = this.route.snapshot.queryParamMap?.get('calendarDate');
          this.viewDate = selected ? calendarDate(selected + 'T12:00:00Z', 'UTC') : calendarDate(new Date().toISOString(), this.timezone);
          void this.fetchEvents();
        }
      },
      error: () => { this.error = 'Could not load the workspace timezone.'; },
    });
    const params = this.route.snapshot.queryParamMap;
    const view = params?.get('calendarView');
    if (['month', 'week', 'day'].includes(view)) this.view = view as CalendarView;
    const day = params?.get('calendarDate');
    if (day && /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day))) this.viewDate = new Date(day + 'T12:00:00');
    if (this.customerSlug || this.jobSlug) return;
    this.slug = this.route.snapshot.params['slug'];
    this.fetchEvents();
  }
  /** Accepts changed inputs; clears old job state and loads the explicitly supplied customer/job context. */
  ngOnChanges(changes: any) {
    if ((this.customerSlug || this.jobSlug) && (changes.customerSlug || changes.jobSlug)) {
      this.slug = this.customerSlug;
      this.discardDraft();
      this.error = this.notice = '';
      this.events$.next([]);
      this.fetchEvents();
    }
  }
  /** Accepts no input; stops pagination and prevents calendar updates after navigating away. */
  ngOnDestroy() {
    this.destroyed = true;
    this.requestId++;
  }
  /** Accepts no arguments; fetches bounded pages and maps persisted appointments to calendar events. */
  async fetchEvents() {
    if (!this.timezone) return;
    const request = ++this.requestId;
    const slug = this.slug;
    const scope = this.jobSlug ? `&jobSlug=${encodeURIComponent(this.jobSlug)}` : '';
    this.loading = true;
    this.error = '';
    try {
      const endpoint = this.jobSlug ? `/api/jobs/${this.jobSlug}/calendar` : `/api/customers/calendar/${slug}`;
      const linked = this.route.snapshot.queryParamMap?.get('appointment');
      if (linked && linked !== this.openedLink) {
        const result: any = await firstValueFrom(this.http.get(endpoint, { params: { id: linked, limit: 1 } }));
        if (this.destroyed || request !== this.requestId) return;
        this.openedLink = linked;
        if (result.listData[0]) {
          this.viewDate = calendarDate(result.listData[0].start, this.timezone);
          this.eventClicked({ meta: result.listData[0] } as CalendarEvent);
        } else this.notice = 'The linked appointment is no longer available in this workspace.';
      }
      // A padded month includes the leading/trailing week cells without loading older appointment history.
      const month = `${this.viewDate.getFullYear()}-${String(this.viewDate.getMonth() + 1).padStart(2, '0')}-01`;
      const from = wallToInstant(shiftDate(month, -7) + 'T00:00', this.timezone, 'earlier');
      const to = wallToInstant(shiftDate(month, 39) + 'T00:00', this.timezone, 'later');
      const range = `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const rows: any[] = [];
      let total = 1;
      while (!this.destroyed && request === this.requestId && rows.length < total) {
        const r: any = await firstValueFrom(
          this.http.get(
            `${endpoint}?limit=100&offset=${rows.length}${scope}${range}`,
          ),
        );
        rows.push(...r.listData);
        total = r.total;
        // Concurrent deletions may leave the final page empty; never loop forever.
        if (!r.listData.length) break;
      }
      if (this.destroyed || request !== this.requestId) return;
      this.events$.next(
        rows.map((row) => ({
          title: row.subject,
          start: this.timezone ? calendarDate(row.start, this.timezone) : new Date(row.start),
          end: this.timezone ? calendarDate(row.end, this.timezone) : new Date(row.end),
          meta: row,
          color: { primary: '#8dd0ff', secondary: '#2a323d' },
        })),
      );
    } catch (e) {
      if (request === this.requestId) this.error = e.error?.message || 'Could not load appointments.';
    } finally {
      if (request === this.requestId) this.loading = false;
    }
  }
  /** Accepts no arguments; converts local input to UTC and creates or updates the selected appointment. */
  async submit() {
    if (this.form.invalid || this.busy) return;
    if (!this.timezone) { this.error = 'Choose a workspace timezone before scheduling appointments.'; return; }
    this.busy = true;
    this.error = '';
    this.notice = '';
    try {
      const data = {
        ...this.form.value,
        start: wallToInstant(this.form.value.start, this.timezone, this.occurrence),
        end: wallToInstant(this.form.value.end, this.timezone, this.occurrence),
        version: this.selected?.version,
        jobSlug: this.jobSlug || this.form.value.jobSlug || '',
      };
      await firstValueFrom(
        this.selected
          ? this.http.put('/api/calendar/' + this.selected.calendarSlug, data)
          : this.http.post(this.jobSlug ? `/api/jobs/${this.jobSlug}/calendar` : `/api/customers/${this.slug}/calendar`, data),
      );
      this.discardDraft();
      this.notice = 'Appointment saved.';
      await this.fetchEvents();
    } catch (e) {
      this.error = e.error?.message || e.message || 'Enter a valid appointment time range.';
    } finally {
      this.busy = false;
    }
  }
  /** Accepts an ISO timestamp; returns a datetime-local value without changing its local clock time. */
  local(value: string) {
    if (this.timezone) return wallTime(value, this.timezone);
    const d = new Date(value);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  }
  /** Accepts PrimeNG's initialized Quill editor event; exposes the appointment notes as a labelled multiline textbox. */
  initializeNotes(event: any) {
    event.editor.root.setAttribute('role', 'textbox');
    event.editor.root.setAttribute('aria-labelledby', 'appointment-notes-label');
    event.editor.root.setAttribute('aria-multiline', 'true');
  }
  /** Accepts a clicked calendar event; fills the editor with its persisted values. */
  eventClicked(event: CalendarEvent) {
    if (!mayReplace(this, 'Discard the appointment draft and open this appointment?')) return;
    this.editorOpen = true;
    this.notice = '';
    this.selected = event.meta;
    this.form.patchValue({
      ...event.meta,
      start: this.local(event.meta.start),
      end: this.local(event.meta.end),
    });
    this.savedForm = JSON.stringify(this.form.value);
  }
  /** Accepts no input; returns whether appointment values differ from their last loaded or saved state. */
  get hasDraft() { return JSON.stringify(this.form.value) !== this.savedForm; }
  /** Accepts no input; clears a draft after a confirmed discard or successful write. */
  discardDraft() {
    this.selected = null;
    this.form.reset({ subject: '', start: '', end: '', body: '', jobSlug: this.jobSlug });
    this.savedForm = JSON.stringify(this.form.value);
    this.editorOpen = false;
  }
  /** Accepts no input; opens a blank appointment only after protecting the current draft. */
  addAppointment() {
    if (!mayReplace(this, 'Discard the current appointment draft?')) return;
    this.discardDraft();
    this.editorOpen = true;
  }
  /** Accepts no arguments; clears the editor only when no pending write or retained draft prevents it. */
  cancel() {
    if (mayReplace(this, 'Discard this appointment draft?')) this.discardDraft();
  }
  /** Accepts no arguments; asks before removing the selected appointment and refreshes the calendar. */
  async remove() {
    if (this.busy || !this.selected || !confirm('Delete this appointment?'))
      return;
    this.busy = true;
    this.error = '';
    this.notice = '';
    try {
      await firstValueFrom(
        this.http.delete('/api/calendar/' + this.selected.calendarSlug),
      );
      this.discardDraft();
      this.notice = 'Appointment deleted.';
      await this.fetchEvents();
    } catch (e) {
      this.error = e.error?.message || 'Could not delete appointment.';
    } finally {
      this.busy = false;
    }
  }
  /** Accepts a selected day; opens its events and selects that date. */
  dayClicked(day: any) {
    this.viewDate = day.date;
    this.activeDayIsOpen = day.events.length > 0;
  }
  /** Accepts no arguments; closes the expanded month day. */
  closeOpenMonthViewDay() {
    this.activeDayIsOpen = false;
    this.rememberPeriod();
  }
  /** Accepts no input; returns to Today in the workspace timezone, preserving the wall-clock date adapter. */
  today() {
    if (!this.timezone) return;
    this.viewDate = calendarDate(new Date().toISOString(), this.timezone);
    this.closeOpenMonthViewDay();
  }
  /** Accepts a calendar view; switches between month, week and day. */
  setView(view: CalendarView) {
    this.view = view;
    this.rememberPeriod();
  }
  /** Accepts no input; preserves the calendar's visible period in a shareable URL without reloading editors. */
  private rememberPeriod() {
    const day = `${this.viewDate.getFullYear()}-${String(this.viewDate.getMonth() + 1).padStart(2, '0')}-${String(this.viewDate.getDate()).padStart(2, '0')}`;
    void this.router?.navigate([], { relativeTo: this.route, queryParams: { calendarView: this.view, calendarDate: day }, queryParamsHandling: 'merge', replaceUrl: true });
    void this.fetchEvents();
  }
}
