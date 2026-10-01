import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';

export const REQUEST_TIMEOUT = 30000;

@Injectable()
export class TimeoutInterceptor implements HttpInterceptor {
  /** Accepts an HTTP request and next handler; returns the event stream and applies the configured request timeout. */
  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(timeout(REQUEST_TIMEOUT));
  }
}
