import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
@Component({
  standalone: false,
  selector: 'customer-list',
  templateUrl: './customer-list.component.html',
  styleUrls: ['./customer-list.component.scss'],
})
export class CustomerListComponent implements OnInit {
  customers: any[] = [];
  search = '';
  status = 'current';
  offset = 0;
  total = 0;
  error = '';
  loading = false;
  private requestId = 0;
  /** Accepts HTTP service; stores the customer list filters and pagination. */
  constructor(private http: HttpClient) {}
  /** Accepts no arguments; retrieves the first customer page. */
  ngOnInit() {
    this.load();
  }
  /** Accepts a page offset; resolves after the latest filtered results or error update the view. Older responses are ignored. */
  async load(offset = 0) {
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
