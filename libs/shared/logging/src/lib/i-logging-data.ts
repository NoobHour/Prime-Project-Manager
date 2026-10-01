export interface ILoggingData {
  message?: string;
  errorName?: string;
  errorCode?: number;
  stack?: string;
  action?: string;
  [name: string]: any;
}

// for internal use in logging service only
export interface ILoggingFullData extends ILoggingData {
  applicationName: string;
  timestamp: number;
  level: LoggingLevel;
  userId?: string;
}

export type LoggingLevel = 'error' | 'warn' | 'info' | 'debug';
