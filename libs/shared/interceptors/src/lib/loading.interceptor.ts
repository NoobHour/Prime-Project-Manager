import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ILoadingService } from '@mgmt/shared/loading';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  /** Accepts loadingService; initializes LoadingInterceptor and its dependencies. */
  constructor(private loadingService: ILoadingService) {}

  /** Accepts an HTTP request and next handler; returns the event stream and tracks loading state until completion and strips the internal loading header. */
  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    const loadingHeader = 'loading';
    if (
      request.headers.has(loadingHeader) &&
      request.headers.get(loadingHeader) === 'show'
    ) {
      request = request.clone(
        // remove loading header from headers object
        { headers: request.headers.delete(loadingHeader) },
      );

      this.loadingService.loading();

      return next.handle(request).pipe(
        finalize(() => {
          this.loadingService.loaded();
        }),
      );
    }
    return next.handle(request);
  }
}
