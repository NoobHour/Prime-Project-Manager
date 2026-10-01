import { Injectable, Optional } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { IConfiguration } from './i-configuration';
import { IConfigurationService } from './i-configuration.service';

@Injectable()
export class ConfigurationService implements IConfigurationService {
  private configs = new ReplaySubject<Partial<IConfiguration>>(1);

  readonly configs$ = this.configs.asObservable();

  /** Accepts configs; initializes ConfigurationService and its dependencies. */
  constructor(@Optional() configs: IConfiguration) {
    if (!configs) {
      throw new Error('Failed to load app configs');
    }

    this.configs.next(configs);
  }
}
