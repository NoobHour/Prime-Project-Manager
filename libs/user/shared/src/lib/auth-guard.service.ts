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
export class AuthGuardService implements CanActivate {
  /** Accepts router, userService; initializes AuthGuardService and its dependencies. */
  constructor(
    private router: Router,
    private userService: IUserService,
  ) {}

  /** Accepts route and router-state snapshots; returns whether the account is signed in and redirects others to login. */
  canActivate(_: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const isAuth = this.userService.isAuth;
    if (!isAuth) {
      this.router.navigate(['login']);
    }

    return isAuth;
  }
}
