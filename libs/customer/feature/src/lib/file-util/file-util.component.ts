import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  OnDestroy,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IUserService } from '@mgmt/user/shared';
@Component({
  standalone: false,
  selector: 'mgmt-file-util',
  templateUrl: './file-util.component.html',
  styleUrls: ['./file-util.component.scss'],
})
export class FileUtilComponent implements OnChanges, OnDestroy {
  @Input() customer: any;
  @Input() jobs: any[] = [];
  @Input() scopeJobSlug = '';
  @Output() changed = new EventEmitter<void>();
  files: any[] = [];
  category = 'document';
  jobSlug = '';
  error = '';
  busy = false;
  total = 0;
  search = '';
  activeTag = '';
  availableTags: string[] = [];
  uploadTags: string[] = [];
  newTag = '';
  editTag = '';
  notice = '';
  editing: any = null;
  loading = false;
  private requestId = 0;
  private context = '';
  /** Accepts no input; returns whether at least one visible file is selected for ZIP download. */
  get hasSelection() {
    return this.files.some((file) => file.selected);
  }
  /** Accepts HTTP and existing account state; initializes the protected file gallery. */
  constructor(
    private http: HttpClient,
    public users: IUserService,
  ) {}
  /** Accepts changed inputs implicitly; refreshes files only after a customer identity is available. */
  ngOnChanges() {
    const context = `${this.customer?.slug || ''}:${this.scopeJobSlug}`;
    if (this.customer?.slug && context !== this.context) {
      this.context = context;
      this.search = this.activeTag = this.newTag = this.editTag = '';
      this.uploadTags = this.availableTags = [];
      this.jobSlug = this.scopeJobSlug;
      this.editing = null;
      this.files = [];
      this.total = 0;
      this.load();
    }
  }
  /** Accepts no input; invalidates file reads when the gallery is removed during job navigation. */
  ngOnDestroy() { this.requestId++; }
  /** Accepts an append flag; fetches a bounded page of private metadata. */
  async load(append = false) {
    const request = ++this.requestId;
    this.loading = true;
    this.error = '';
    try {
      const [response, tags] = await Promise.all([firstValueFrom(
        this.http.get<any>(`/api/customers/${this.customer.slug}/files`, {
          params: {
            offset: append ? this.files.length : 0,
            limit: 50,
            search: this.search.trim(),
            tag: this.activeTag,
            ...(this.scopeJobSlug ? { jobSlug: this.scopeJobSlug } : {}),
          },
        }),
      ), firstValueFrom(this.http.get<any>(`/api/customers/${this.customer.slug}/file-tags`, { params: this.scopeJobSlug ? { jobSlug: this.scopeJobSlug } : {} }))]);
      if (request !== this.requestId) return;
      this.files = append
        ? [...this.files, ...response.listData]
        : response.listData;
      this.total = response.total;
      this.availableTags = tags.listData;
    } catch (e: any) {
      if (request === this.requestId) this.error = e.error?.message || 'Unable to load files.';
    } finally {
      if (request === this.requestId) this.loading = false;
    }
  }
  /** Accepts a tag label; applies an exact tag filter and refreshes the visible file page. */
  filterTag(tag: string) { this.activeTag = tag; this.load(); }
  /** Accepts no input; clears name/tag filters and shows all files in the current customer/job scope. */
  clearFilters() { this.search = this.activeTag = ''; this.load(); }
  /** Accepts the upload/edit target; adds one normalized unique tag and returns whether the pending label is valid. */
  addTag(target: 'upload' | 'edit') {
    const tag = (target === 'upload' ? this.newTag : this.editTag).normalize('NFC').trim().toLowerCase();
    if (!tag) return true;
    const tags = target === 'upload' ? this.uploadTags : this.editing.tags;
    if (tag.length > 200 || (!tags.includes(tag) && tags.length >= 20)) {
      this.error = 'Use at most 20 tags, each up to 200 characters.';
      return false;
    }
    if (!tags.includes(tag)) tags.push(tag);
    if (target === 'upload') this.newTag = ''; else this.editTag = '';
    return true;
  }
  /** Accepts a target and existing tag; removes that label from the unsaved upload or metadata draft. */
  removeTag(target: 'upload' | 'edit', tag: string) {
    if (target === 'upload') this.uploadTags = this.uploadTags.filter((item) => item !== tag);
    else this.editing.tags = this.editing.tags.filter((item) => item !== tag);
  }
  /** Accepts selected browser files; uploads each with its job/category and refreshes the gallery. */
  async upload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (this.busy || !input.files?.length || !this.addTag('upload')) return;
    this.error = '';
    this.busy = true;
    try {
      for (const file of Array.from(input.files || [])) {
        const data = new FormData();
        data.append('file', file);
        data.append('category', this.category);
        data.append('tags', JSON.stringify(this.uploadTags));
        data.append('jobSlug', this.scopeJobSlug || (this.category === 'avatar' ? '' : this.jobSlug));
        await firstValueFrom(
          this.http.post(`/api/customers/${this.customer.slug}/files`, data),
        );
      }
      await this.load();
      this.changed.emit();
      this.notice = 'Files uploaded.';
    } catch (e: any) {
      this.error = e.error?.message || 'Upload failed.';
    } finally {
      this.busy = false;
      input.value = '';
    }
  }
  /** Accepts no arguments; downloads selected files as one authenticated ZIP and releases its temporary URL. */
  async downloadSelected() {
    const ids = this.files.filter((f) => f.selected).map((f) => f.id);
    if (!ids.length) return;
    try {
      const blob = await firstValueFrom(
        this.http.post(
          `/api/customers/${this.customer.slug}/files/download`,
          { ids },
          { responseType: 'blob' },
        ),
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'files.zip';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      this.error =
        e.error instanceof Blob
          ? await e.error.text()
          : 'Unable to download selected files.';
    }
  }
  /** Accepts a file row; opens an editable metadata copy without changing server state. */
  edit(file: any) {
    this.editing = { ...file, tags: [...(file.tags || [])] };
    this.editTag = '';
  }
  /** Accepts no arguments; saves versioned filename, job, category and tags while preserving the draft on conflicts. */
  async save() {
    if (this.busy || !this.addTag('edit')) return;
    this.busy = true;
    this.error = '';
    try {
      await firstValueFrom(
        this.http.put('/api/files/' + this.editing.id, this.editing),
      );
      this.editing = null;
      await this.load();
      this.notice = 'File details saved.';
    } catch (e) {
      this.error = e.error?.message || 'Unable to save file.';
    } finally {
      this.busy = false;
    }
  }
  /** Accepts a file row; removes it only after the user confirms, then refreshes the metadata. */
  async remove(file: any) {
    if (!confirm(`Delete ${file.name}?`)) return;
    try {
      await firstValueFrom(this.http.delete(`/api/files/${file.id}`));
      await this.load();
      this.changed.emit();
    } catch (e: any) {
      this.error = e.error?.message || 'Unable to remove file.';
    }
  }
}
