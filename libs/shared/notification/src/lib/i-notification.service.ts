import { Injectable } from '@angular/core';
import { INotification } from './i-notification';
import { Observable } from 'rxjs';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root',
  useClass: NotificationService,
})
export abstract class INotificationService {
  notification$: Observable<INotification>;

  abstract showError(m: string, translate?: boolean);
  abstract showSuccess(m: string, translate?: boolean);
  abstract showInfo(m: string, translate?: boolean);
  abstract showWarning(m: string, translate?: boolean);
}
