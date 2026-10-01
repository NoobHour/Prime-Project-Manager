import { IPageRequest, IPage, IQuery } from '../paging/paging-types';
import { Observable } from 'rxjs';
import {
  ActionSuccessResponse,
  DetailSuccessResponse,
} from '@mgmt/shared/client-server';

/**
 * This class is intended to be a base class for all data services that have simple endpoints. For example the Booking service that have endpoints for:
 * - Get all, create: /booking
 * - Get one, update, delete: /booking/:bookingId
 *
 * Provides all CRUD actions.
 * If you have a more complex action, you need to implement this action on the concrete class yourself.
 */
export abstract class IBaseDataService<T> {
  /**
   * Get a data object based on an identity
   * @param id string
   */
  abstract getOne(
    id: string,
    loading?: boolean,
  ): Observable<DetailSuccessResponse<T>>;

  /**
   * Get list of data objects
   * @param params QueryParams
   */
  abstract getAll(
    req: IPageRequest<T>,
    query: IQuery,
    loading?: boolean,
  ): Observable<IPage<T>>;

  /**
   * Create a data object
   * @param body Partial<T>
   */
  abstract create(
    body: Partial<T>,
    loading?: boolean,
  ): Observable<ActionSuccessResponse<T>>;

  /**
   * Update a data object
   * @param body Partial<T>
   */
  abstract update(
    id: string,
    body: Partial<T>,
    loading?: boolean,
  ): Observable<ActionSuccessResponse<T>>;

  /**
   * Delete a data object based on an identity
   * @param id string
   */
  abstract delete(
    id: string,
    loading?: boolean,
  ): Observable<ActionSuccessResponse<T>>;
}
