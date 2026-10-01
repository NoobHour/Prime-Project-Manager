import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  ActionSuccessResponse,
  DetailSuccessResponse,
} from '@mgmt/shared/client-server';
import { IConfigurationService } from '@mgmt/shared/configuration';
import { BaseDataService } from '@mgmt/shared/foundation';
import { UserStorageUtil } from '@mgmt/shared/storage';
import { ILoginUser, INewUser, IUser } from '@mgmt/user/api-interfaces';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { IUserService } from './i-user.service';

@Injectable()
export class UserService
  extends BaseDataService<IUser>
  implements IUserService
{
  /** Accepts no input; returns the API path used by this service. */
  protected get endpoint(): string {
    return 'users';
  }

  isAuth: boolean;
  userInfo: IUser | null;

  /** Accepts config, http, userStorageUtil; initializes UserService and its dependencies. */
  constructor(
    config: IConfigurationService,
    protected http: HttpClient,
    private userStorageUtil: UserStorageUtil,
  ) {
    super(config, http);
    this.updateAuthState(this.userStorageUtil.userInfo as IUser);
  }

  /** Accepts no input; requests server logout and immediately clears local profile state. Returns nothing. */
  logout() {
    this.http.post('/api/users/logout', {}).subscribe({ error: () => {} });
    this.userStorageUtil.clearUserData();
    this.updateAuthState(null);
  }

  /** Accepts a profile or null; updates the displayed account and authentication flag. Returns nothing. */
  updateAuthState(user: IUser | null) {
    this.userInfo = user;
    this.isAuth = !!user;
  }

  /** Accepts credentials and a loading flag; returns a login response observable and stores confirmed account state. */
  login(
    body: ILoginUser,
    loading = true,
  ): Observable<ActionSuccessResponse<IUser>> {
    let url = this.getURLFromEndpoint({ endpoint: 'users/login' });
    this.setLoading(loading ? 'show' : 'not-show');
    let options = { ...this.defaultOptions };
    return this.http
      .post<ActionSuccessResponse<IUser>>(url, body, options)
      .pipe(
        tap((res) => {
          this.updateAuthState(res.data as IUser);
          this.userStorageUtil.setUserData(res);
        }),
      );
  }

  /** Accepts new staff fields; creates the account without replacing the administrator's session. */
  register(
    data: INewUser,
    loading = true,
  ): Observable<ActionSuccessResponse<IUser>> {
    return this.http.post<ActionSuccessResponse<IUser>>(
      '/api/users',
      data,
      this.defaultOptions,
    );
  }
  /** Accepts record identity, editable fields and a loading flag; returns the observable update response. */
  update(
    id: string,
    body: Partial<IUser> & { id: string },
    loading = true,
  ): Observable<ActionSuccessResponse<IUser>> {
    let url = this.getURL();
    this.setLoading(loading ? 'show' : 'not-show');
    let options = { ...this.defaultOptions };
    return this.http.put<ActionSuccessResponse<IUser>>(url, body, options).pipe(
      tap((res) => {
        this.updateAuthState(res.data as IUser);
        this.userStorageUtil.setUserData(res);
      }),
    );
  }

  /** Accepts a loading flag; returns the authenticated account response as an observable. */
  getCurrentUser(
    loading = true,
  ): Observable<DetailSuccessResponse<Partial<IUser>>> {
    let url = this.getURLFromEndpoint({ endpoint: 'user' });
    this.setLoading(loading ? 'show' : 'not-show');
    return this.http.get<DetailSuccessResponse<Partial<IUser>>>(
      url,
      this.defaultOptions,
    );
  }
}
