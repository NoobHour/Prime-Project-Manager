import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable()
export class CachingInterceptor implements HttpInterceptor {
  /** Accepts an HTTP request and next handler; returns the event stream and forwards requests unchanged; no response cache is maintained. */
  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    return next.handle(request);
  }
}
