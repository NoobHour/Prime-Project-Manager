import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedCommonModule } from '@mgmt/shared/common';
import { ProfileComponent } from './profile.component';

@NgModule({
  imports: [
    SharedCommonModule,
    RouterModule.forChild([
      {
        path: '',
        component: ProfileComponent,
      },
    ]),
  ],
  declarations: [ProfileComponent],
})
export class ProfileModule {}
