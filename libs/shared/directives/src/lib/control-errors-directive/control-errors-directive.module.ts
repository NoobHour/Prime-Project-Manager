import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlErrorsDirective } from './control-errors.directive';
import { ControlErrorComponent } from './control-error.component';

@NgModule({
  declarations: [ControlErrorsDirective, ControlErrorComponent],
  exports: [ControlErrorsDirective],
  imports: [CommonModule],
})
export class ControlErrorsDirectiveModule {}
