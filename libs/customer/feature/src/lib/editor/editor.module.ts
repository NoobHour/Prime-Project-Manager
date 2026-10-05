import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedCommonModule } from '@mgmt/shared/common';
import { EditorComponent } from './editor.component';
import { A11yModule } from '@angular/cdk/a11y';

/** Accepts the customer editor; returns its draft-safe navigation decision. */
export function canLeaveCustomerEditor(component: EditorComponent) { return component.canLeave(); }
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { FileUploadModule } from 'primeng/fileupload';
import { HttpClientModule } from '@angular/common/http';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

@NgModule({
  imports: [
    SharedCommonModule,
    A11yModule,
    InputTextModule,
    ButtonModule,
    ConfirmPopupModule,
    FileUploadModule,
    HttpClientModule,
    RadioButtonModule,
    ToggleSwitchModule,
    RouterModule.forChild([
      {
        path: '',
        component: EditorComponent,
        canDeactivate: [canLeaveCustomerEditor],
      },
      {
        path: ':slug',
        component: EditorComponent,
        canDeactivate: [canLeaveCustomerEditor],
      },
    ]),
  ],
  declarations: [EditorComponent],
})
export class EditorModule {}
