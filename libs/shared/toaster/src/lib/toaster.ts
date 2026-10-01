import { ToastConfig } from './toast-config/toast-config';
import { Inject, Injectable, Type } from '@angular/core';
import {
  TOAST_NOTIFICATIONS_CONFIG,
  ToastNotificationsConfig,
} from './toast-config/toast-notifications.config';
import { ToastContainerService } from './toast-container.service';
import { Toast } from './toast';
import { ToastContainerComponent } from './toast-container/toast-container.component';
import { INotificationService, INotification } from '@mgmt/shared/notification';

const DEFAULT_CONFIG: ToastConfig = {
  autoClose: true,
  duration: 8000,
  type: 1,
  position: 'top-right',
};

@Injectable({
  providedIn: 'root',
})
export class Toaster {
  /** Accepts config, containerService, noti; initializes Toaster and its dependencies. */
  constructor(
    @Inject(TOAST_NOTIFICATIONS_CONFIG)
    private config: ToastNotificationsConfig,
    private containerService: ToastContainerService,
    private noti: INotificationService,
  ) {
    this.noti.notification$.subscribe((message: INotification) => {
      this.open({
        caption: message.message,
        type: message.type,
      });
    });
  }

  open(config: ToastConfig): Toast | null;
  open(text: string, config?: ToastConfig): Toast | null;
  open(component: Type<any>, config?: ToastConfig): Toast | null;
  /** Accepts text, a component or toast configuration plus overrides; returns the created toast or null for a duplicate. */
  open(
    config: ToastConfig | string | Type<any>,
    componentConfig?: ToastConfig,
  ): Toast | null {
    if (typeof config === 'string') {
      config = { text: config as string, ...componentConfig };
    }
    if (config instanceof Type) {
      config = { ...componentConfig, component: config as Type<any> };
    }
    config = { ...DEFAULT_CONFIG, ...this.config, ...config };
    const ref = <ToastContainerComponent>this.containerService.ref.instance;
    return ref.add(config);
  }
}
