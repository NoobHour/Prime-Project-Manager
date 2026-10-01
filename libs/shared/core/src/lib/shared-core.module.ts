import {
  CommonModule,
  CurrencyPipe,
  DatePipe,
  DecimalPipe,
} from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import {
  ModuleWithProviders,
  NgModule,
  Optional,
  SkipSelf,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import {
  IConfiguration,
  SharedConfigurationModule,
} from '@mgmt/shared/configuration';
import { SharedErrorHandlerModule } from '@mgmt/shared/error-handler';
import { SharedInterceptorsModule } from '@mgmt/shared/interceptors';
import { SharedLoggingModule } from '@mgmt/shared/logging';
import { SharedSpinnerModule } from '@mgmt/shared/spinner';
import {
  SharedToasterModule,
  ToastNotificationsConfig,
} from '@mgmt/shared/toaster';

import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';

const config: ToastNotificationsConfig = {
  duration: 3000,
};

@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    SharedSpinnerModule,
    SharedErrorHandlerModule,
    SharedLoggingModule,
    SharedInterceptorsModule,
    SharedToasterModule.initializeConfig(config),
    CalendarModule.forRoot({
      provide: DateAdapter,
      useFactory: adapterFactory,
    }),
  ],
  providers: [DatePipe, CurrencyPipe, DecimalPipe],
})
export class SharedCoreModule {
  /** Accepts parentModule; initializes SharedCoreModule and its dependencies. */
  constructor(@Optional() @SkipSelf() parentModule: SharedCoreModule) {
    if (parentModule) {
      throw new Error(
        `CoreModule is already loaded. Import it in the AppModule only.`,
      );
    }
  }

  /** Accepts root application configuration; returns this module with its configured providers. */
  static forRoot(
    configs: Partial<IConfiguration>,
  ): ModuleWithProviders<SharedCoreModule> {
    return {
      ngModule: SharedCoreModule,
      providers: [...SharedConfigurationModule.forRoot(configs).providers],
    };
  }
}
