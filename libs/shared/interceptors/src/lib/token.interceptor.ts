import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpInterceptor,
} from '@angular/common/http';
import { UserStorageUtil } from '@mgmt/shared/storage';
@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  /** Accepts the existing browser profile store; reads only its non-authenticating CSRF token. */
  constructor(private storage: UserStorageUtil) {}
  /** Accepts request and next handler; attaches CSRF only to same-origin API writes. Authentication stays in HttpOnly cookies. */
  intercept(request: HttpRequest<unknown>, next: HttpHandler) {
    if (
      request.url.startsWith('/api/') &&
      !['GET', 'HEAD'].includes(request.method) &&
      this.storage.token
    )
      return next.handle(
        request.clone({ setHeaders: { 'X-CSRF-Token': this.storage.token } }),
      );
    return next.handle(request);
  }
}
