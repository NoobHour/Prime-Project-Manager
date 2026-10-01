import { Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { ILoggingData } from './i-logging-data';
import { ILoggingService } from './i-logging.service';

@Injectable()
export class LoggingService implements ILoggingService {
  private logEntriesSubject = new ReplaySubject<ILoggingData>(1);
  logEntries$ = this.logEntriesSubject.asObservable();

  /** Accepts log fields; emits an information-level entry. Returns nothing. */
  info(data: ILoggingData) {
    this.log({ level: 'info', ...data });
  }

  /** Accepts log fields; emits a warning-level entry. Returns nothing. */
  warn(data: ILoggingData) {
    this.log({ level: 'warn', ...data });
  }

  /** Accepts log fields; emits an error-level entry. Returns nothing. */
  error(data: ILoggingData) {
    this.log({ level: 'error', ...data });
  }

  /** Accepts log fields; emits a debug-level entry for configured writers. Returns nothing. */
  debug(data: ILoggingData) {
    this.log({ level: 'debug', ...data });
  }

  /** Accepts structured log data; publishes it to subscribed writers. Returns nothing. */
  private log(data: ILoggingData) {
    this.logEntriesSubject.next(data);
  }
}
