import { CommonModule } from '@angular/common';
import { ErrorHandler, NgModule } from '@angular/core';
import { ErrorHandlerService } from './error-handler.service';

@NgModule({
  imports: [CommonModule],
  providers: [
    {
      provide: ErrorHandler,
      useClass: ErrorHandlerService,
    },
  ],
})
export class SharedErrorHandlerModule {}
