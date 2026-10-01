import { Observable } from 'rxjs';
import { IEndpoint } from '../service/i-endpoint';

export interface IOrder<T> {
  orderBy: keyof T;
  orderType: 'asc' | 'desc';
}

/**
 * Provide a paging info for a specific request.
 * If the request does not require sorting, omit order.
 * If the request does not require paging, omit offset and limit.
 */
export interface IPageRequest<T> {
  pageIndex?: number;
  limit?: number;
  order?: IOrder<T>;
}

export interface IPage<T> {
  data: T[];
  total: number;
  limit: number;
  pageIndex: number;
}

export interface IQuery {
  [name: string]: any | any[];
}

export type PaginatedRequest<T> = (
  req: IPageRequest<T>,
  query: IQuery,
  endpoint?: IEndpoint,
) => Observable<IPage<T>>;
