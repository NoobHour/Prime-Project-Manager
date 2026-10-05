import { Component, HostListener, OnInit } from '@angular/core';
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

  custSlug = '';
  tcustomer: any;

  error = '';
  busy = false;


  notice = '';
  leavePrompt = false;
  private savedForm = '';
  private leaveDecision?: (discard: boolean) => void;
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
    this.savedForm = JSON.stringify(this.form.value);
  }
  /** Accepts no arguments; loads the current customer directly from the server. */
  async ngOnInit() {
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
      this.savedForm = JSON.stringify(this.form.value);
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
  /** Accepts no arguments; saves only customer fields and opens the customer; job creation uses its own page. */
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
      this.savedForm = JSON.stringify(this.form.value);
      this.busy = false;
      await this.router.navigate(['/customer', this.custSlug]);
    } catch (e) {
      this.error = e.error?.message || 'Could not save customer.';
    } finally {
      this.busy = false;
    }
  }
  /** Accepts no input; returns whether customer fields differ from their last confirmed save. */
  get dirty() { return JSON.stringify(this.form.value) !== this.savedForm; }
  /** Accepts no input; returns permission to leave, or a pending discard decision that protects customer edits. */
  canLeave() {
    if (this.busy) return false;
    if (!this.dirty) return true;
    if (this.leavePrompt) return false;
    this.leavePrompt = true;
    return new Promise<boolean>(
      /** Accepts a promise resolver; stores it until the user decides whether to discard, returning nothing. */
      (resolve) => { this.leaveDecision = resolve; },
    );
  }
  /** Accepts the discard decision; closes the prompt and resolves the pending navigation, returning nothing. */
  resolveLeave(discard: boolean) {
    this.leavePrompt = false;
    this.leaveDecision?.(discard);
    this.leaveDecision = undefined;
  }
  /** Accepts the unload event; requests the native warning for unsaved customer edits or a pending save. */
  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent) {
    if (this.dirty || this.busy) { event.preventDefault(); event.returnValue = ''; }
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
      // Uploading an avatar advances only the baseline version, preserving dirty contact fields.
      this.savedForm = JSON.stringify({ ...JSON.parse(this.savedForm), version: result.detailData.version });
    } catch (e) {
      this.error = e.error?.message || 'Could not upload avatar.';
    } finally {
      input.value = '';
    }
  }
}
