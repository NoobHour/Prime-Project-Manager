import { Inject, Injectable } from '@angular/core';
import { STORAGE_KEY } from './constants';
import { IUser, IUserData } from './interfaces';
import { StorageUtil } from './storage.util';
import { WA_LOCAL_STORAGE as LOCAL_STORAGE } from '@ng-web-apis/common';

@Injectable({
  providedIn: 'root',
})
export class UserStorageUtil extends StorageUtil {
  private userCache: IUser;

  /** Accepts sessionStorage; initializes UserStorageUtil and its dependencies. */
  constructor(@Inject(LOCAL_STORAGE) readonly sessionStorage: Storage) {
    super(sessionStorage);
  }

  /** Accepts an account response; stores its profile and CSRF proof, never the authentication cookie. Returns nothing. */
  setUserData(res: IUserData) {
    this.setUserInfo(res.data);
  }

  /** Accepts no input; returns the cached or stored user profile, or null. */
  get userInfo(): IUser | null {
    if (this.userCache) {
      return this.userCache;
    }
    const data = this.getItem(STORAGE_KEY.USER_INFO);
    this.userCache = JSON.parse(data);
    return this.userCache;
  }

  /** Accepts no input; returns the stored CSRF proof or null. Authentication uses the HttpOnly cookie. */
  get token(): string | null {
    let userInfo = this.userInfo;
    return userInfo ? userInfo.token : null;
  }

  /** Accepts no input; clears the cached and stored profile. Returns nothing. */
  clearUserData() {
    this.userCache = null;
    this.removeItem(STORAGE_KEY.USER_INFO);
  }

  /** Accepts a user profile; updates the cache and serialized browser record. Returns nothing. */
  private setUserInfo(user: IUser) {
    this.userCache = user;
    const data = JSON.stringify(user);
    this.setItem(STORAGE_KEY.USER_INFO, data);
  }
}
