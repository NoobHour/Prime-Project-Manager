import { Component, Input, OnChanges, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { CalendarEvent, CalendarView } from 'angular-calendar';
/** Accepts an appointment form; returns a timeRange error for invalid/reversed dates, otherwise null. */
export function appointmentTimeRange(control: AbstractControl) {
  const { start, end } = control.value;
  if (!start || !end) return null;
  const from = new Date(start).getTime();
  const to = new Date(end).getTime();
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
export class CustomerCalendarComponent implements OnInit, OnChanges, OnDestroy {
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
  private destroyed = false;
  private requestId = 0;
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
  }
  /** Accepts no arguments; loads appointments belonging to the routed customer. */
  ngOnInit() {
    if (this.customerSlug) return;
    this.slug = this.route.snapshot.params['slug'];
    this.fetchEvents();
  }
  /** Accepts changed inputs; clears old job state and loads the explicitly supplied customer/job context. */
  ngOnChanges(changes: any) {
    if (this.customerSlug && (changes.customerSlug || changes.jobSlug)) {
      this.slug = this.customerSlug;
      this.cancel();
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
    const request = ++this.requestId;
    const slug = this.slug;
    const scope = this.jobSlug ? `&jobSlug=${encodeURIComponent(this.jobSlug)}` : '';
    this.loading = true;
    this.error = '';
    try {
      const rows: any[] = [];
      let total = 1;
      while (!this.destroyed && request === this.requestId && rows.length < total) {
        const r: any = await firstValueFrom(
          this.http.get(
            `/api/customers/calendar/${slug}?limit=100&offset=${rows.length}${scope}`,
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
          start: new Date(row.start),
          end: new Date(row.end),
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
    this.busy = true;
    this.error = '';
    this.notice = '';
    try {
      const data = {
        ...this.form.value,
        start: new Date(this.form.value.start).toISOString(),
        end: new Date(this.form.value.end).toISOString(),
        version: this.selected?.version,
        jobSlug: this.jobSlug || this.form.value.jobSlug || '',
      };
      await firstValueFrom(
        this.selected
          ? this.http.put('/api/calendar/' + this.selected.calendarSlug, data)
          : this.http.post(`/api/customers/${this.slug}/calendar`, data),
      );
      this.cancel();
      this.notice = 'Appointment saved.';
      await this.fetchEvents();
    } catch (e) {
      this.error = e.error?.message || 'Enter a valid appointment time range.';
    } finally {
      this.busy = false;
    }
  }
  /** Accepts an ISO timestamp; returns a datetime-local value without changing its local clock time. */
  local(value: string) {
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
    if (this.busy) return;
    this.notice = '';
    this.selected = event.meta;
    this.form.patchValue({
      ...event.meta,
      start: this.local(event.meta.start),
      end: this.local(event.meta.end),
    });
  }
  /** Accepts no arguments; clears the appointment editor. */
  cancel() {
    this.selected = null;
    this.form.reset({ subject: '', start: '', end: '', body: '', jobSlug: this.jobSlug });
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
      this.cancel();
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
  }
  /** Accepts a calendar view; switches between month, week and day. */
  setView(view: CalendarView) {
    this.view = view;
  }
}
