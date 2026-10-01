import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ILoggingService } from '@mgmt/shared/logging';

@Injectable()
export class LoggingInterceptor implements HttpInterceptor {
  /** Accepts loggingService; initializes LoggingInterceptor and its dependencies. */
  constructor(private loggingService: ILoggingService) {}

  /** Accepts an HTTP request and next handler; logs the method and URL, then returns the event stream. */
  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    this.loggingService.info({
      message: `making a ${request.method} request to ${request.url}`,
    });
    return next.handle(request);
  }
}
