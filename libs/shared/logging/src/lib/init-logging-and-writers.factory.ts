import { ILoggingService } from './i-logging.service';
import { ConsoleWriter } from './log-writers/console-writer';

/** Accepts the logging service and console writer; returns an initializer that returns the console writer. */
export function InitLoggingAndWriters(
  loggingService: ILoggingService,
  consoleWriter: ConsoleWriter,
) {
  return () => {
    return consoleWriter;
  };
}
