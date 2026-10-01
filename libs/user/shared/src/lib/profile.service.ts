import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DetailSuccessResponse } from '@mgmt/shared/client-server';
import { IConfigurationService } from '@mgmt/shared/configuration';
import { BaseDataService } from '@mgmt/shared/foundation';
import { IProfile, IUser } from '@mgmt/user/api-interfaces';
import { Observable } from 'rxjs';
import { IProfileService } from './i-profile.service';

@Injectable()
export class ProfileService
  extends BaseDataService<IUser>
  implements IProfileService
{
  /** Accepts no input; returns the API path used by this service. */
  protected get endpoint(): string {
    return 'profiles';
  }

  /** Accepts config, http; initializes ProfileService and its dependencies. */
  constructor(
    config: IConfigurationService,
    protected http: HttpClient,
  ) {
    super(config, http);
  }

  /** Accepts a username and loading flag; returns the observable profile response. */
  getProfile(
    username: string,
    loading = true,
  ): Observable<DetailSuccessResponse<IProfile>> {
    let url = this.getURL(username);
    this.setLoading(loading ? 'show' : 'not-show');
    return this.http.get<DetailSuccessResponse<Partial<IProfile>>>(
      url,
      this.defaultOptions,
    );
  }
}
