import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { UserStorageUtil } from '@mgmt/shared/storage';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  /** Accepts browser session storage; supports clearing expired authentication state. */
  constructor(private storage: UserStorageUtil) {}
  /** Accepts an HTTP request and handler; propagates failures and returns expired sessions to sign-in. */
  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error) => {
        if (error.status === 401 && !request.url.includes('/users/login')) {
          this.storage.clearUserData();
          window.location.assign('/login');
        }
        return throwError(() => error);
      }),
    );
  }
}
