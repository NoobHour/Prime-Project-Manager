import { APP_INITIALIZER, ModuleWithProviders, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastContainerComponent } from './toast-container/toast-container.component';
import { ToastContainerService } from './toast-container.service';
import { Toaster } from './toaster';
import {
  TOAST_NOTIFICATIONS_CONFIG,
  ToastNotificationsConfig,
} from './toast-config/toast-notifications.config';

/** Accepts the toast service; returns an initializer that retains its notification subscription. */
export function InitToastFactory(toast: Toaster) {
  return () => {
    return toast;
  };
}

@NgModule({
  declarations: [ToastContainerComponent],
  imports: [CommonModule],
  providers: [
    ToastContainerService,
    {
      provide: APP_INITIALIZER,
      useFactory: InitToastFactory,
      deps: [Toaster],
      multi: true,
    },
  ],
})
export class SharedToasterModule {
  /** Accepts toast defaults; returns the module and configuration provider. */
  static initializeConfig(
    config: ToastNotificationsConfig,
  ): ModuleWithProviders<SharedToasterModule> {
    return {
      ngModule: SharedToasterModule,
      providers: [
        {
          provide: TOAST_NOTIFICATIONS_CONFIG,
          useValue: config,
        },
      ],
    };
  }
}
