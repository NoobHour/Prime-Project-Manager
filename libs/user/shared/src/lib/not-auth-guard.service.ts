import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { IUserService } from './i-user.service';

@Injectable({
  providedIn: 'root',
})
export class NotAuthGuardService implements CanActivate {
  /** Accepts router, userService; initializes NotAuthGuardService and its dependencies. */
  constructor(
    private router: Router,
    private userService: IUserService,
  ) {}

  /** Accepts route and router-state snapshots; returns whether the account is signed out and redirects authenticated users home. */
  canActivate(_: ActivatedRouteSnapshot, __: RouterStateSnapshot): boolean {
    if (this.userService?.isAuth) {
      this.router.navigate(['/']);
    }
    return !this.userService?.isAuth;
  }
}
