import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { NbSpinnerComponent } from './nb-spinner/nb-spinner.component';
import { ISpinnerService } from './public/i-spinner.service';
import { InitSpinnerFactory } from './public/init-spinner.factory';

@NgModule({
  imports: [CommonModule, OverlayModule],
  declarations: [NbSpinnerComponent],
  exports: [],
  providers: [
    {
      provide: APP_INITIALIZER,
      deps: [ISpinnerService],
      multi: true,
      useFactory: InitSpinnerFactory,
    },
  ],
})
export class SharedSpinnerModule {}
