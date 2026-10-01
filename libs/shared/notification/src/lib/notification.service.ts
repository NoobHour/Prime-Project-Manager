import { Injectable } from '@angular/core';
import { INotification, NotificationType } from './i-notification';
import { Subject } from 'rxjs';
import { INotificationService } from './i-notification.service';

@Injectable()
export class NotificationService implements INotificationService {
  private notification = new Subject<INotification>();
  readonly notification$ = this.notification.asObservable();

  /** Accepts message text; emits an error notification. Returns nothing. */
  showError(m: string, translate = true) {
    this.notification.next({ type: NotificationType.error, message: m });
  }

  /** Accepts message text; emits a success notification. Returns nothing. */
  showSuccess(m: string, translate = true) {
    this.notification.next({ type: NotificationType.sussess, message: m });
  }

  /** Accepts message text; emits an information notification. Returns nothing. */
  showInfo(m: string, translate = true) {
    this.notification.next({ type: NotificationType.info, message: m });
  }

  /** Accepts message text; emits a warning notification. Returns nothing. */
  showWarning(m: string, translate = true) {
    this.notification.next({ type: NotificationType.warning, message: m });
  }
}
