import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Subscription } from 'rxjs';
@Component({
  standalone: false,
  selector: 'customer-list',
  templateUrl: './customer-list.component.html',
  styleUrls: ['./customer-list.component.scss'],
})
export class CustomerListComponent implements OnInit, OnDestroy {
  customers: any[] = [];
  search = '';
  status = 'current';
  offset = 0;
  total = 0;
  error = '';
  loading = false;
  private requestId = 0;
  private routeChanges?: Subscription;
  /** Accepts HTTP service; stores the customer list filters and pagination. */
  constructor(private http: HttpClient, private route: ActivatedRoute, private router: Router) {}
  /** Accepts no arguments; retrieves the first customer page. */
  ngOnInit() {
    this.routeChanges = this.route.queryParamMap.subscribe((params) => {
      this.search = (params.get('search') || '').slice(0, 200);
      this.status = ['current', 'all', 'lead', 'complete', 'archived'].includes(params.get('status')) ? params.get('status') : 'current';
      const offset = Number(params.get('offset'));
      void this.load(Number.isSafeInteger(offset) && offset >= 0 ? offset : 0, false);
    });
  }
  /** Accepts no input; cancels URL updates and ignores reads that complete after leaving the list. */
  ngOnDestroy() { this.routeChanges?.unsubscribe(); this.requestId++; }
  /** Accepts no input; returns a link that restores this filtered customer page. */
  get returnUrl() { return this.router?.url || '/customers'; }
  /** Accepts a page offset; resolves after the latest filtered results or error update the view. Older responses are ignored. */
  async load(offset = 0, navigate = true) {
    if (navigate && this.router) {
      const target = this.router.createUrlTree([], { relativeTo: this.route, queryParams: { search: this.search || null, status: this.status === 'current' ? null : this.status, offset: offset || null } });
      if (this.router.serializeUrl(target) !== this.router.url) { await this.router.navigateByUrl(target); return; }
    }
    const requestId = ++this.requestId;
    this.loading = true;
    this.error = '';
    const params: any = { limit: 25, offset, search: this.search };
    if (this.status === 'current') params.isArchived = false;
    else if (this.status === 'archived') params.isArchived = true;
    else if (this.status === 'lead') params.isLead = true;
    else if (this.status === 'complete') params.isComplete = true;
    try {
      const r: any = await firstValueFrom(
        this.http.get('/api/customers', { params }),
      );
      if (requestId !== this.requestId) return;
      this.offset = offset;
      this.customers = r.listData;
      this.total = r.total;
    } catch (e) {
      if (requestId !== this.requestId) return;
      this.error = e.error?.message || 'Could not load customers.';
    } finally {
      if (requestId === this.requestId) this.loading = false;
    }
  }
}
