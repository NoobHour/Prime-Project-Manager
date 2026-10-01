import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IConfiguration } from './i-configuration';
import { ConfigurationService } from './configuration.service';

@Injectable({
  providedIn: 'root',
  useClass: ConfigurationService,
})
export abstract class IConfigurationService {
  readonly configs$: Observable<Partial<IConfiguration>>;
}
