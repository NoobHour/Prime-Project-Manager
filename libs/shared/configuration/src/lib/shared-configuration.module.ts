import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { IConfiguration } from './i-configuration';

@NgModule({
  imports: [CommonModule],
  providers: [],
})
export class SharedConfigurationModule {
  /** Accepts root application configuration; returns this module with its configured providers. */
  static forRoot(
    configs: Partial<IConfiguration>,
  ): ModuleWithProviders<SharedConfigurationModule> {
    return {
      ngModule: SharedConfigurationModule,
      providers: [
        {
          provide: IConfiguration,
          useValue: configs,
        },
      ],
    };
  }
}
