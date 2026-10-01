import { Injectable } from '@angular/core';
import { ILoginUser } from '@mgmt/user/api-interfaces';
import { IUserService } from './i-user.service';

@Injectable({
  providedIn: 'root',
})
export class AuthUIService {
  /** Accepts userService; initializes AuthUIService and its dependencies. */
  constructor(private userService: IUserService) {}

  /** Accepts login credentials; returns the account service's login-response observable. */
  login(data: ILoginUser) {
    return this.userService.login(data);
  }
}
