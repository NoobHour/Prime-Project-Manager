import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ILoggingData } from './i-logging-data';
import { LoggingService } from './logging.service';

@Injectable({
  providedIn: 'root',
  useClass: LoggingService,
})
export abstract class ILoggingService {
  logEntries$: Observable<ILoggingData>;
  abstract info(data: ILoggingData);
  abstract warn(data: ILoggingData);
  abstract error(data: ILoggingData);
  // Only send log in debug mode
  abstract debug(data: ILoggingData);
}
