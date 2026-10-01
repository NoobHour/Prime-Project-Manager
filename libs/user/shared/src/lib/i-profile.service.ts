import { Injectable } from '@angular/core';
import { DetailSuccessResponse } from '@mgmt/shared/client-server';
import { IBaseDataService } from '@mgmt/shared/foundation';
import { IProfile, IUser } from '@mgmt/user/api-interfaces';
import { Observable } from 'rxjs';
import { ProfileService } from './profile.service';

@Injectable({
  providedIn: 'root',
  useClass: ProfileService,
})
export abstract class IProfileService extends IBaseDataService<IUser> {
  abstract getProfile(
    username: string,
    loading?: boolean,
  ): Observable<DetailSuccessResponse<IProfile>>;
}
