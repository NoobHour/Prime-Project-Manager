import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { IUserService } from '@mgmt/user/shared';
import { firstValueFrom } from 'rxjs';
@Component({
  standalone: false,
  selector: 'mgmt-view-customer',
  templateUrl: './view-customer.component.html',
  styleUrls: ['./view-customer.component.scss'],
})
export class ViewCustomerComponent implements OnInit {
  @ViewChild('customerDiscussion') discussion?: { hasDraft: boolean; busy: boolean };
  leavePrompt = false;
  private leaveDecision?: (discard: boolean) => void;
  customer: any;
  jobsList: any[] = [];
  error = '';
  /** Accepts HTTP, account and routing services; initializes the customer detail view. */
  constructor(
    private http: HttpClient,
    public userService: IUserService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}
  /** Accepts no arguments; loads the routed customer and paginated jobs. */
  async ngOnInit() {
    await this.loadCustomer(this.route.snapshot.params['slug']);
  }
  /** Accepts customer slug; refreshes persisted customer fields and all jobs in bounded pages. */
  async loadCustomer(slug: string) {
    try {
      const r: any = await firstValueFrom(
        this.http.get('/api/customers/' + slug),
      );
      this.customer = r.detailData;
      this.jobsList = [];
      let total = 1;
      while (this.jobsList.length < total) {
        const j: any = await firstValueFrom(
          this.http.get(
            `/api/customers/${slug}/jobs?limit=100&offset=${this.jobsList.length}`,
          ),
        );
        this.jobsList.push(...j.listData);
        total = j.total;
        if (!j.listData.length) break;
      }
    } catch (e) {
      this.error = e.error?.message || 'Could not load customer.';
    }
  }
  /** Accepts no input; returns immediate permission or a pending decision so unsent board drafts survive cancelled navigation. */
  canLeave() {
    if (this.discussion?.busy) return false;
    if (!this.discussion?.hasDraft) return true;
    if (this.leavePrompt) return false;
    this.leavePrompt = true;
    return new Promise<boolean>((resolve) => { this.leaveDecision = resolve; });
  }
  /** Accepts the user's discard choice; closes the prompt and resolves the pending customer-page navigation. */
  resolveLeave(discard: boolean) {
    this.leavePrompt = false;
    this.leaveDecision?.(discard);
    this.leaveDecision = undefined;
  }
  /** Accepts a browser unload event; requests a warning while a discussion draft or message send is pending. */
  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent) {
    if (this.discussion?.hasDraft || this.discussion?.busy) { event.preventDefault(); event.returnValue = ''; }
  }
  /** Accepts no arguments; confirms archival and returns to the customer list. */
  async delete() {
    if (!confirm('Archive this customer and retain their history?')) return;
    try {
      await firstValueFrom(
        this.http.delete('/api/customers/' + this.customer.slug),
      );
      await this.router.navigate(['/customers']);
    } catch (e) {
      this.error = e.error?.message || 'Could not archive customer.';
    }
  }
}
