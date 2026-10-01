export interface INotification {
  type: NotificationType;
  message: string;
}

export enum NotificationType {
  error,
  sussess,
  warning,
  info,
}
