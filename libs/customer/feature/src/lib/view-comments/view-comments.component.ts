import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  OnChanges,
  ViewChild,
  ElementRef,
  NgZone,
  ChangeDetectorRef,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IUserService } from '@mgmt/user/shared';
@Component({
  standalone: false,
  selector: 'view-comments',
  templateUrl: './view-comments.component.html',
  styleUrls: ['./view-comments.component.scss'],
})
export class ViewCommentsComponent implements OnInit, OnChanges, OnDestroy {
  @Input() slug = '';
  @Input() jobSlug = '';
  @Input() combined = false;
  @Input() jobs: any[] = [];
  filter = 'all';
  destination = '';
  notice = '';
  hiddenSentBoard: string | null = null;
  private boardDrafts = new Map<string, string>();
  private draftDestination = '';
  private initialized = false;
  @ViewChild('messageList') list?: ElementRef<HTMLElement>;
  comments: any[] = [];
  commentForm: FormGroup;
  error = '';
  total = 0;
  busy = false;
  loading = false;
  editing: any = null;
  ordered: any[] = [];
  private revision = 0;
  private draft = '';
  private editor: any;
  private refresh: any;
  private destroyed = false;
  /** Accepts route, transport, forms and current account; initializes the rich message composer. */
  constructor(
    private zone: NgZone,
    private changeDetector: ChangeDetectorRef,
    private route: ActivatedRoute,
    private http: HttpClient,
    fb: FormBuilder,
    public userService: IUserService,
  ) {
    this.commentForm = fb.group({
      body: ['', [Validators.required, Validators.maxLength(20000)]],
    });
  }
  /** Accepts no input; selects a discussion and refreshes its latest page while the browser is visible. */
  ngOnInit() {
    this.slug = this.slug || this.route.snapshot.params['slug'];
    this.initialized = true;
    this.resetContext();
    this.refresh = setInterval(() => {
      if (
        !document.hidden &&
        !this.busy &&
        !this.loading &&
        this.comments.length <= 50
      )
        this.loadComments(false, true);
    }, 5000);
  }
  /** Accepts changed inputs; resets only when the customer or fixed job board changes, preserving drafts during label updates. */
  ngOnChanges(changes: any) {
    if (this.initialized && (changes.slug || changes.jobSlug || changes.combined)) this.resetContext();
    this.editor?.root.setAttribute('aria-label', 'Message for ' + this.boardName(this.destination));
  }
  /** Accepts no input; invalidates old reads and opens the current board with a clean composer and independent draft cache. */
  private resetContext() {
    this.revision++;
    this.loading = false;
    this.comments = this.ordered = [];
    this.total = 0;
    this.filter = 'all';
    this.destination = this.jobSlug;
    this.editing = null;
    this.boardDrafts.clear();
    this.commentForm.reset({ body: '' });
    this.notice = '';
    this.hiddenSentBoard = null;
    this.loadComments();
  }
  /** Accepts a job slug or the empty general board; returns its readable board name for destinations and message labels. */
  boardName(jobSlug: string) {
    return jobSlug ? this.jobs.find((job) => job.jobSlug === jobSlug)?.name || 'Job discussion' : this.slug === '__team__' ? 'Team board' : 'Customer general';
  }
  /** Accepts a new posting destination; caches the old board's unsent draft and restores the selected board's draft. */
  chooseBoard(jobSlug: string) {
    if (this.busy || this.editing || this.jobSlug || jobSlug === this.destination) return;
    this.boardDrafts.set(this.destination, this.commentForm.value.body || '');
    this.destination = jobSlug;
    this.commentForm.patchValue({ body: this.boardDrafts.get(jobSlug) || '' });
    this.editor?.root.setAttribute('aria-label', 'Message for ' + this.boardName(this.destination));
    this.editor?.focus();
  }
  /** Accepts no input; returns the selected feed refresh and aligns an empty composer with a single-board filter. */
  filterChanged() {
    if (this.busy || this.editing) return;
    if (!this.hasText && this.filter !== 'all') this.chooseBoard(this.filter === 'general' ? '' : this.filter);
    this.revision++;
    this.loading = false;
    this.hiddenSentBoard = null;
    this.notice = '';
    return this.loadComments();
  }
  /** Accepts no input; reveals a successfully posted message that was outside the selected feed filter. */
  showSentBoard() {
    this.filter = this.hiddenSentBoard || 'general';
    this.filterChanged();
  }
  /** Accepts no input; returns whether a current, cached or edited message should be protected when leaving the workspace. */
  get hasDraft() {
    return this.hasText || !!this.editing || [...this.boardDrafts.values()].some((body) => body.replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;/g, ' ').trim());
  }
  /** Accepts no input; releases polling and keyboard listeners when the discussion is closed. */
  ngOnDestroy() {
    this.destroyed = true;
    this.revision++;
    clearInterval(this.refresh);
    this.editor?.root.removeEventListener('keydown', this.keydown, true);
  }
  /** Accepts PrimeNG's initialized Quill editor; intercepts Enter before Quill inserts a newline. */
  initEditor(event: any) {
    this.editor?.root.removeEventListener('keydown', this.keydown, true);
    this.editor = event.editor;
    this.editor.root.setAttribute('aria-label', 'Message for ' + this.boardName(this.destination));
    this.editor.root.setAttribute('role', 'textbox');
    this.editor.root.setAttribute('aria-multiline', 'true');
    this.editor.root.addEventListener('keydown', this.keydown, true);
  }
  /** Accepts a composer key event; sends plain Enter while preserving Shift+Enter and IME composition. */
  private keydown = (event: KeyboardEvent) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.isComposing &&
      event.keyCode !== 229 &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.zone.run(() => void this.postComment());
    }
  };
  /** Accepts no input; schedules a UI update for Quill changes emitted outside Angular's zone. */
  composerChanged() {
    this.zone.run(() => this.changeDetector.markForCheck());
  }
  /** Accepts an index and message; returns its stable identity so polling preserves existing DOM nodes. */
  trackMessage(_index: number, message: any) {
    return message.id;
  }
  /** Accepts no input; caches chronological order once per response rather than on every keystroke. */
  orderMessages() {
    this.ordered = [...this.comments].reverse();
  }
  /** Accepts a name; returns at most two initials for profiles without images. */
  initials(name: string) {
    return (name || '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }
  /** Accepts no input; returns whether the editor contains visible text rather than empty HTML. */
  get hasText() {
    return !!(this.commentForm.value.body || '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;|&#160;/g, ' ')
      .trim();
  }
  /** Accepts append/quiet flags; refreshes bounded messages without pulling the reader away from older content. */
  async loadComments(append = false, quiet = false) {
    if (this.loading) return;
    this.loading = true;
    const revision = ++this.revision;
    const element = this.list?.nativeElement;
    const nearBottom =
      !element ||
      element.scrollHeight - element.scrollTop - element.clientHeight < 80;
    const height = element?.scrollHeight || 0;
    const top = element?.scrollTop || 0;
    try {
      const res = await firstValueFrom(
        this.http.get<any>(`/api/customers/${this.slug}/comments`, {
          params: { limit: 50, offset: append ? this.comments.length : 0,
            ...(this.jobSlug ? { jobSlug: this.jobSlug } : this.combined && this.filter !== 'all' ? { jobSlug: this.filter === 'general' ? '' : this.filter } : {}),
          },
        }),
      );
      if (this.destroyed || revision !== this.revision) return;
      this.comments = append
        ? [...new Map([...this.comments, ...res.listData].map((message) => [message.id, message])).values()]
        : res.listData;
      this.orderMessages();
      this.total = res.total;
      if (!quiet) this.error = '';
      setTimeout(() => {
        const list = this.list?.nativeElement;
        if (!list || this.destroyed || revision !== this.revision) return;
        if (append) list.scrollTop = top + list.scrollHeight - height;
        else if (nearBottom || !quiet) list.scrollTop = list.scrollHeight;
      }, 0);
    } catch (e) {
      if (!quiet && revision === this.revision) this.error = e.error?.message || 'Cannot load messages.';
    } finally {
      if (revision === this.revision) this.loading = false;
    }
  }
  /** Accepts a message; opens its existing formatting in the composer and preserves the unsent draft. */
  edit(message: any) {
    if (this.busy) return;
    if (!this.editing) {
      this.draft = this.commentForm.value.body || '';
      this.draftDestination = this.destination;
    }
    this.destination = message.jobSlug || '';
    this.editing = message;
    this.commentForm.patchValue({ body: message.body });
    this.editor?.root.setAttribute('aria-label', 'Message for ' + this.boardName(this.destination));
    this.editor?.focus();
  }
  /** Accepts no input; restores the draft that was present before editing a saved message. */
  cancelEdit() {
    this.editing = null;
    this.destination = this.draftDestination;
    this.commentForm.patchValue({ body: this.draft });
    this.editor?.root.setAttribute('aria-label', 'Message for ' + this.boardName(this.destination));
    this.commentForm.markAsUntouched();
    this.draft = '';
  }
  /** Accepts no input; posts or updates a nonempty message and only clears the composer after success. */
  async postComment() {
    if (this.busy || this.commentForm.invalid || !this.hasText) return;
    this.busy = true;
    ++this.revision; // Invalidate any poll that started before this write.
    this.loading = false;
    this.error = '';
    this.notice = '';
    this.hiddenSentBoard = null;
    const destination = this.destination;
    try {
      const url = `/api/customers/${this.slug}/comments`;
      const response: any = await firstValueFrom(
        this.editing
          ? this.http.put(`${url}/${this.editing.id}`, {
              body: this.commentForm.value.body,
              version: this.editing.version,
            })
          : this.http.post(url, { ...this.commentForm.value, jobSlug: destination }),
      );
      if (this.destroyed) return;
      if (this.editing) {
        this.comments = this.comments.map((message) =>
          message.id === response.data.id
            ? { ...message, ...response.data }
            : message,
        );
        this.cancelEdit();
      } else {
        const visible = !this.combined || this.filter === 'all' || (this.filter === 'general' ? !destination : this.filter === destination);
        if (visible) {
          this.comments = [response.data, ...this.comments.filter((message) => message.id !== response.data.id)];
          this.total++;
        } else this.hiddenSentBoard = destination;
        this.boardDrafts.delete(destination);
        this.notice = 'Message sent to ' + this.boardName(destination) + (visible ? '.' : '. It is hidden by the current filter.');
        this.commentForm.reset({ body: '' });
      }
      this.orderMessages();
      setTimeout(() => {
        const list = this.list?.nativeElement;
        if (list) list.scrollTop = list.scrollHeight;
      }, 0);
    } catch (e) {
      this.error = e.error?.message || 'Cannot save message.';
    } finally {
      this.busy = false;
      // Wait until the readonly binding is removed before restoring focus for the next message.
      setTimeout(() => {
        if (!this.destroyed) this.editor?.focus();
      }, 0);
    }
  }
  /** Accepts a message ID; confirms removal, clears its edit state and refreshes the conversation. */
  async deleteComment(id: string) {
    if (!confirm('Remove this message?')) return;
    try {
      await firstValueFrom(
        this.http.delete(`/api/customers/${this.slug}/comments/${id}`),
      );
      if (this.editing?.id === id) this.cancelEdit();
      await this.loadComments();
    } catch (e) {
      this.error = e.error?.message || 'Cannot remove message.';
    }
  }
}
