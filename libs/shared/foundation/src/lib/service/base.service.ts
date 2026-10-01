import { HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { HTTP_HEADER, ListSuccessResponse } from '@mgmt/shared/client-server';
import {
  IConfiguration,
  IConfigurationService,
} from '@mgmt/shared/configuration';
import { IPage, IPageRequest, IQuery } from '../paging/paging-types';
import { IEndpoint } from './i-endpoint';

/**
 * This class is intended to be a base class for all http service classes.
 * Handle: headers, configs, options, urls, endpoints
 */
export abstract class BaseService {
  private _restURL: string;
  private headers: HttpHeaders;

  /** Accepts no input; returns the configured API base URL or throws if missing. */
  private get restURL(): string {
    if (!this._restURL) {
      throw Error('REST URL is not set, please check the configurations');
    }

    return this._restURL;
  }
  /** Accepts the API base URL; stores it for subsequent requests. Returns nothing. */
  private set restURL(url: string) {
    this._restURL = url;
  }

  /** Accepts no input; returns JSON request options with the current headers. */
  protected get defaultOptions() {
    return {
      headers: this.headers || {},
      observe: 'body' as const,
      responseType: 'json' as const,
    };
  }

  /** Accepts no input; returns the service resource path used by standard CRUD requests. */
  protected abstract get endpoint(): string;

  /** Accepts configSerivce; initializes BaseService and its dependencies. */
  constructor(private configSerivce: Partial<IConfigurationService>) {
    this.setDefaultHeaders();
    this.configSerivce.configs$.subscribe((configs) => {
      this.handleConfigs(configs);
    });
  }

  /** Accepts a map of header names and values; updates request headers. Returns nothing. */
  protected setHeaders(headers: { [name: string]: string | string[] }) {
    if (!this.headers) {
      throw new Error(
        'BaseService: property headers was used but its value was not set',
      );
    }
    Object.keys(headers).forEach(
      (name) => (this.headers = this.headers.set(name, headers[name])),
    );
  }

  /** Accepts a header name; removes it from request headers. Returns nothing. */
  protected deleteHeaders(header: string) {
    if (!this.headers) {
      throw new Error(
        'BaseService: property headers was used but its value was not set',
      );
    }
    this.headers = this.headers.delete(header);
  }

  /** Accepts no input; replaces request headers with an empty collection. Returns nothing. */
  protected emptyHeadersObject() {
    this.headers = new HttpHeaders();
  }

  /** Accepts show or not-show; sets the request loading-indicator header. Returns nothing. */
  protected setLoading(loading: 'show' | 'not-show') {
    this.setHeaders({ loading: loading });
  }

  /** Accepts an optional record ID; returns the API resource URL, including the ID when supplied. */
  protected getURL(id?: string): string {
    if (id) {
      return this.restURL + '/' + this.endpoint + '/' + id;
    }

    return this.restURL + '/' + this.endpoint;
  }
  /** Accepts a custom endpoint and optional bindings; returns its resolved path or throws if binding counts differ. */
  protected getURLFromEndpoint(endpoint: IEndpoint): string {
    if (endpoint.endpoint && !endpoint.bindings) {
      return this.restURL + '/' + endpoint.endpoint;
    }

    let variableIndexes: number[] = [];
    let parsedElements = endpoint.endpoint.split('/');
    parsedElements.forEach((e, index) => {
      if (e.startsWith(':')) {
        variableIndexes.push(index);
      }
    });

    if (variableIndexes.length !== endpoint.bindings.length) {
      throw new Error(
        'BaseService > getURLFromEndpoint: the number of binding elements is not equal to the number of variables',
      );
    }

    variableIndexes.forEach(
      (variableIndex) =>
        (parsedElements[variableIndex] = endpoint.bindings[variableIndex]),
    );

    return parsedElements.join('/');
  }

  /** Accepts paging, ordering and query filters; returns options for a JSON request observing the full response. */
  protected getAllOptions<T>(req: IPageRequest<T>, query: IQuery) {
    let params = {
      // Empty arrays omit optional values from the query string.
      offset:
        req?.pageIndex === null || req?.pageIndex === undefined
          ? []
          : (req?.limit
              ? req?.pageIndex * req?.limit
              : req?.pageIndex
            ).toString(),
      limit:
        req?.limit === null || req?.limit === undefined
          ? []
          : req?.limit.toString(),
      orderBy:
        req?.order === null || req?.order === undefined
          ? []
          : req?.order?.orderBy.toString(),
      orderType:
        req?.order === null || req?.order === undefined
          ? []
          : req?.order?.orderType.toString(),
      ...query,
    };
    let options = {
      params: new HttpParams({ fromObject: params }),
      ...this.defaultOptions,
      observe: 'response' as const,
    };

    return options;
  }

  /** Accepts a list response, page index and limit; returns the normalized page model. */
  protected mapGetAllRes<T>(
    res: HttpResponse<ListSuccessResponse<T>>,
    pageIndex: number,
    limit: number,
  ): IPage<T> {
    let data: IPage<T> = {
      limit: limit,
      total: res?.body?.total,
      pageIndex: pageIndex,
      data: res?.body?.listData as T[],
    };
    return data;
  }

  /** Accepts application configuration; updates the API base URL. Returns nothing. */
  private handleConfigs(configs: Partial<IConfiguration>) {
    this.restURL = configs.rest.url;
  }

  /** Accepts no input; initializes JSON request headers and the loading indicator flag. Returns nothing. */
  private setDefaultHeaders() {
    this.emptyHeadersObject();
    let headers: { [key: string]: string } = {};
    headers[HTTP_HEADER.CONTENT_TYPE] = 'application/json';
    this.setHeaders(headers);
    this.setLoading('show');
  }
}
