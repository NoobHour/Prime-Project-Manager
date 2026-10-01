import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
@Component({
  standalone: false,
  selector: 'mgmt-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss'],
})
export class EditorComponent implements OnInit {
  form: FormGroup;
  jobsList: any[] = [];
  team: any[] = [];
  custSlug = '';
  tcustomer: any;
  typedJob = '';
  error = '';
  busy = false;
  savingJob = '';
  addingJob = false;
  notice = '';
  /** Accepts Angular form, HTTP and routing services; initializes the customer editor. */
  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.form = fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      phone: [''],
      address: [''],
      email: ['', Validators.email],
      body: [''],
      isLead: [false],
      isActive: [true],
      isComplete: [false],
      isArchived: [false],
      version: [null],
    });
  }
  /** Accepts no arguments; loads the current customer directly from the server. */
  async ngOnInit() {
    try {
      const members: any = await firstValueFrom(this.http.get('/api/team'));
      this.team = members.listData;
    } catch {
      this.error = 'Could not load team members.';
    }
    this.custSlug = this.route.snapshot.params['slug'] || '';
    if (this.custSlug) await this.loadCustomer();
  }
  /** Accepts no arguments; refreshes customer fields and all paginated jobs. */
  async loadCustomer() {
    try {
      const r: any = await firstValueFrom(
        this.http.get('/api/customers/' + this.custSlug),
      );
      this.tcustomer = r.detailData;
      this.form.patchValue(this.tcustomer);
      this.jobsList = [];
      let total = 1;
      while (this.jobsList.length < total) {
        const j: any = await firstValueFrom(
          this.http.get(
            `/api/customers/${this.custSlug}/jobs?limit=100&offset=${this.jobsList.length}`,
          ),
        );
        this.jobsList.push(...j.listData);
        total = j.total;
      }
    } catch (e) {
      this.error = e.error?.message || 'Could not load customer.';
    }
  }
  /** Accepts no arguments; saves customer fields and an optional first job, then opens the customer. */
  async submit() {
    if (this.form.invalid || this.busy) return;
    this.busy = true;
    this.error = '';
    try {
      const creating = !this.custSlug;
      const r: any = await firstValueFrom(
        creating
          ? this.http.post('/api/customers', this.form.value)
          : this.http.put('/api/customers/' + this.custSlug, this.form.value),
      );
      this.custSlug = r.data.slug;
      this.form.patchValue(r.data);
      if (creating && this.typedJob.trim())
        await firstValueFrom(
          this.http.post(`/api/customers/${this.custSlug}/jobs`, {
            name: this.typedJob,
          }),
        );
      await this.router.navigate(['/customer', this.custSlug]);
    } catch (e) {
      this.error = e.error?.message || 'Could not save customer.';
    } finally {
      this.busy = false;
    }
  }
  /** Accepts no arguments; appends the new saved job without discarding unsaved customer or job fields. */
  async addNewJob() {
    if (this.addingJob || !this.typedJob.trim()) return;
    this.addingJob = true;
    this.error = '';
    try {
      const result = await firstValueFrom(
        this.http.post<any>(`/api/customers/${this.custSlug}/jobs`, {
          name: this.typedJob.trim(),
        }),
      );
      this.typedJob = '';
      this.jobsList = [...this.jobsList, result.data];
      this.notice = 'Job added.';
    } catch (e) {
      this.error = e.error?.message || 'Could not add job.';
    } finally {
      this.addingJob = false;
    }
  }
  /** Accepts a job row; persists its title, scope and lifecycle status. */
  async setJob(job: any) {
    if (this.savingJob) return;
    this.savingJob = job.jobSlug;
    this.error = '';
    this.notice = '';
    try {
      job.lane = job.isArchived
        ? 'archived'
        : job.isComplete
          ? 'complete'
          : job.isActive
            ? 'active'
            : 'planned';
      const result = await firstValueFrom(
        this.http.put<any>('/api/customers/jobs/' + job.jobSlug, job),
      );
      // Only the saved row receives server normalization and its new conflict-detection version.
      Object.assign(job, result.data);
      this.notice = 'Job saved.';
    } catch (e) {
      this.error = e.error?.message || 'Could not save job.';
    } finally {
      this.savingJob = '';
    }
  }
  /** Accepts a job; appends a uniquely identified checklist item for the user to name before saving. */
  addTask(job: any) {
    job.taskList = [
      ...(job.taskList || []),
      { id: crypto.randomUUID(), title: '', done: false },
    ];
  }
  /** Accepts a job and item index; removes that unsaved checklist row from the editor. */
  removeTask(job: any, index: number) {
    job.taskList.splice(index, 1);
  }
  /** Accepts a native file event; uploads a protected customer avatar and refreshes its version. */
  async uploadAvatar(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const data = new FormData();
    data.append('file', input.files[0]);
    data.append('category', 'avatar');
    try {
      await firstValueFrom(
        this.http.post(`/api/customers/${this.custSlug}/files`, data),
      );
      const result = await firstValueFrom(
        this.http.get<any>('/api/customers/' + this.custSlug),
      );
      this.tcustomer = result.detailData;
      this.form.patchValue({ version: result.detailData.version });
    } catch (e) {
      this.error = e.error?.message || 'Could not upload avatar.';
    } finally {
      input.value = '';
    }
  }
}
