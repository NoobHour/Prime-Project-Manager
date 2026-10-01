import { InjectionToken, Type } from '@angular/core';
import { NotificationType } from '@mgmt/shared/notification';

export const TOAST_NOTIFICATIONS_CONFIG =
  new InjectionToken<ToastNotificationsConfig>('ToastNotificationsConfig');

export type ToastType = NotificationType;
export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface ToastNotificationsConfig {
  position?: ToastPosition;
  autoClose?: boolean;
  duration?: number;
  type?: NotificationType;
  component?: Type<any>;
  preventDuplicates?: boolean;
}
