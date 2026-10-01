import { Optional } from '@angular/core';
import {
  IConfiguration,
  IConfigurationService,
  ILoggingConfiguration,
} from '@mgmt/shared/configuration';
import { UserStorageUtil } from '@mgmt/shared/storage';
import { ILoggingData, ILoggingFullData } from '../i-logging-data';
import { ILoggingService } from '../i-logging.service';
import { ILogWriter } from './i-log-writer';

export abstract class LogWriter implements ILogWriter {
  protected configs: ILoggingConfiguration;
  protected targetEntry: ILoggingFullData;
  protected debug: boolean;
  private applicationName: string;
  /** Accepts no input; returns the cached user ID, or null when signed out. */
  protected get userId(): string {
    if (this.userStorageUtil?.userInfo?.id) {
      return this.userStorageUtil.userInfo.id;
    }
    return null;
  }

  /** Accepts loggingService, configuration, userStorageUtil; initializes LogWriter and its dependencies. */
  constructor(
    loggingService: ILoggingService,
    @Optional() configuration: Partial<IConfigurationService>,
    private userStorageUtil: UserStorageUtil,
  ) {
    if (configuration) {
      configuration.configs$.subscribe((configs) => {
        this.handleConfigs(configs);
        loggingService.logEntries$.subscribe((log) => this.handleLogEntry(log));
      });
    }
  }

  /** Accepts no input; runs validation, writing and cleanup for the current log entry. Returns nothing. */
  execute() {
    this.preWritting();
    if (this.validateEntry()) {
      this.write();
    }
    this.finish();
  }

  /** Accepts no input; provides an optional pre-write hook. The base implementation returns nothing. */
  preWritting() {}

  /** Accepts no input; returns whether the current entry may be written. The base implementation accepts it. */
  validateEntry(): boolean {
    // Subclasses may reject entries; the base writer accepts every entry.
    return true;
  }

  /** Accepts no input; writes the current entry through a concrete writer. Returns nothing. */
  abstract write();

  /** Accepts no input; provides an optional cleanup hook. The base implementation returns nothing. */
  finish() {}

  /** Accepts application configuration; updates writer settings when logging configuration exists. Returns nothing. */
  private handleConfigs(configs: Partial<IConfiguration>) {
    if (!configs || !configs.logging) {
      return;
    }
    this.applicationName = configs.applicationName;
    this.debug = configs.debug;
    this.configs = configs.logging;
  }

  /** Accepts a log entry; adds context and runs the writer. Returns nothing. */
  private handleLogEntry(logEntry: ILoggingData) {
    this.targetEntry = this.getLoggingData(logEntry);
    this.execute();
  }

  /** Accepts log fields; returns an entry with timestamp, application and user context. */
  private getLoggingData(data: ILoggingData): ILoggingFullData {
    return {
      timestamp: new Date().getTime(),
      applicationName: this.applicationName,
      level: data.level,
      userId: this.userId,
      ...data,
    };
  }
}
