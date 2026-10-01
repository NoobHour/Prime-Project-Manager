import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormSubmitDirective } from './form-submit.directive';

@NgModule({
  declarations: [FormSubmitDirective],
  exports: [FormSubmitDirective],
  imports: [CommonModule],
})
export class FormSubmitDirectiveModule {}
