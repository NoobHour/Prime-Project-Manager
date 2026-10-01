import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
@Component({
  standalone: false,
  selector: 'mgmt-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  jobs: any[] = [];
  total = 0;
  loading = true;
  error = '';
  /** Accepts HTTP transport; initializes the dashboard's work overview. */
  constructor(private http: HttpClient) {}
  /** Accepts no input; loads the six most pressing open jobs, with a link to every matching result. */
  async ngOnInit() {
    // The shared header owns the application title across dashboard navigation.
    try {
      const result: any = await firstValueFrom(
        this.http.get('/api/jobs', { params: { attention: true, limit: 6 } }),
      );
      this.jobs = result.listData;
      this.total = result.total;
    } catch {
      this.error = 'Could not load priority work.';
    } finally {
      this.loading = false;
    }
  }
  /** Accepts a job; returns whether its deadline is before the API's current UTC date. */
  isOverdue(job: any) {
    return job.dueDate && job.dueDate < new Date().toISOString().slice(0, 10);
  }
}
