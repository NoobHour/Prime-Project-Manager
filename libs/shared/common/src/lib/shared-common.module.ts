import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  ControlErrorsDirectiveModule,
  FormSubmitDirectiveModule,
} from '@mgmt/shared/directives';
import { EditorModule } from 'primeng/editor';

@NgModule({
  imports: [],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    FormSubmitDirectiveModule,
    ControlErrorsDirectiveModule,
    RouterModule,
    EditorModule,
  ],
})
export class SharedCommonModule {}
