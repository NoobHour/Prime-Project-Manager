import { Component, HostListener, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { mayReplace } from '../../editor-state';
import { IUserService } from '@mgmt/user/shared';
import { shiftDate, wallToInstant } from '@mgmt/shared/common/src/lib/workspace-time';
@Component({
  standalone: false,
  selector: 'mgmt-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {
  @ViewChild('teamDiscussion') discussion?: { hasDraft: boolean; busy: boolean };
  /** Accepts no input; returns navigation permission while protecting team messages and pending sends. */
  canLeave() { return !this.discussion || mayReplace(this.discussion, 'Discard your unsent team messages?'); }
  /** Accepts a browser unload event; requests the standard warning for unsent or pending team messages. */
  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent) {
    if (this.discussion?.hasDraft || this.discussion?.busy) { event.preventDefault(); event.returnValue = ''; }
  }
  jobs: any[] = [];
  appointments: any[] = [];
  today = '';
  timezone = '';
  scope = 'mine';
  setupRequired = false;
  private revision = 0;
  total = 0;
  loading = true;
  error = '';
  /** Accepts HTTP transport; initializes the dashboard's work overview. */
  constructor(private http: HttpClient, public users: IUserService) {}
  /** Accepts no input; loads twelve upcoming or overdue jobs and six shared appointments with links to the full lists. */
  async ngOnInit() {
    const request = ++this.revision;
    this.loading = true;
    this.error = '';
    try {
      const settings = await firstValueFrom(this.http.get<any>('/api/workspace'));
      if (request !== this.revision) return;
      this.today = settings.today;
      this.timezone = settings.data.timezone;
      this.setupRequired = !this.timezone;
      if (this.setupRequired) return;
      const result: any = await firstValueFrom(
        this.http.get('/api/jobs', { params: { scope: this.scope, dueSoon: true, limit: 12 } }),
      );
      if (request !== this.revision) return;
      this.jobs = result.listData;
      this.total = result.total;
      const agenda = await firstValueFrom(this.http.get<any>('/api/schedule', { params: { from: wallToInstant(this.today + 'T00:00', this.timezone, 'earlier'), to: wallToInstant(shiftDate(this.today, 7) + 'T00:00', this.timezone, 'later'), type: 'appointment', limit: 6 } }));
      if (request === this.revision) this.appointments = agenda.listData;
    } catch {
      if (request === this.revision) this.error = 'Could not load upcoming work. Try again.';
    } finally {
      if (request === this.revision) this.loading = false;
    }
  }
  /** Accepts no input; invalidates outstanding reads when the dashboard is closed. */
  ngOnDestroy() { this.revision++; }
  /** Accepts a job; returns whether its deadline precedes today in the workspace timezone. */
  isOverdue(job: any) {
    return this.today && job.dueDate && job.dueDate < this.today;
  }
  /** Accepts an appointment instant; returns its workspace-local date and time. */
  time(value: string) { return new Intl.DateTimeFormat('en', { timeZone: this.timezone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
}
