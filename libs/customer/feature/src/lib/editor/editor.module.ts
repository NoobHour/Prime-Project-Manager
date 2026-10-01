import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedCommonModule } from '@mgmt/shared/common';
import { EditorComponent } from './editor.component';
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
      },
      {
        path: ':slug',
        component: EditorComponent,
      },
    ]),
  ],
  declarations: [EditorComponent],
})
export class EditorModule {}
