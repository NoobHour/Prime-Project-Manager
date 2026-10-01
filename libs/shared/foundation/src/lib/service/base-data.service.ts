import { HttpClient } from '@angular/common/http';
import {
  ActionSuccessResponse,
  DetailSuccessResponse,
  ListSuccessResponse,
} from '@mgmt/shared/client-server';
import { IConfigurationService } from '@mgmt/shared/configuration';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { IPage, IPageRequest, IQuery } from '../paging/paging-types';
import { BaseService } from './base.service';
import { IBaseDataService } from './i-base-data.service';

export abstract class BaseDataService<T>
  extends BaseService
  implements IBaseDataService<T>
{
  /** Accepts configuration, http; initializes BaseDataService and its dependencies. */
  constructor(
    configuration: IConfigurationService,
    protected http: HttpClient,
  ) {
    super(configuration);
  }

  /** Accepts a record ID and loading flag; returns an observable detail response. */
  getOne(id: string, loading = true): Observable<DetailSuccessResponse<T>> {
    let url = this.getURL(id);
    this.setLoading(loading ? 'show' : 'not-show');
    let options = { ...this.defaultOptions };
    return this.http.get<DetailSuccessResponse<T>>(url, options);
  }

  /** Accepts pagination, filters and a loading flag; returns an observable page of records. */
  getAll(
    req: IPageRequest<T>,
    query: IQuery,
    loading = true,
  ): Observable<IPage<T>> {
    let url = this.getURL();
    this.setLoading(loading ? 'show' : 'not-show');
    let options = this.getAllOptions<T>(req, query);

    return this.http
      .get<ListSuccessResponse<T>>(url, options)
      .pipe(
        map((res) => this.mapGetAllRes<T>(res, req?.pageIndex, req?.limit)),
      );
  }

  /** Accepts record fields and a loading flag; returns the observable create response. */
  create(
    body: Partial<T>,
    loading = true,
  ): Observable<ActionSuccessResponse<T>> {
    let url = this.getURL();
    this.setLoading(loading ? 'show' : 'not-show');
    let options = { ...this.defaultOptions };
    return this.http.post<ActionSuccessResponse<T>>(url, body, options);
  }

  /** Accepts record identity, editable fields and a loading flag; returns the observable update response. */
  update(
    id: string,
    body: Partial<T>,
    loading = true,
  ): Observable<ActionSuccessResponse<T>> {
    let url = this.getURL(id);
    this.setLoading(loading ? 'show' : 'not-show');
    let options = { ...this.defaultOptions };
    return this.http.put<ActionSuccessResponse<T>>(url, body, options);
  }

  /** Accepts an optional record ID and loading flag; returns the observable delete response. */
  delete(id?: string, loading = true): Observable<ActionSuccessResponse<T>> {
    let url = this.getURL(id);
    this.setLoading(loading ? 'show' : 'not-show');
    let options = { ...this.defaultOptions };
    return this.http.delete<ActionSuccessResponse<T>>(url, options);
  }
}
