import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedCommonModule } from '@mgmt/shared/common';
import { AuthContainerComponent } from '../auth-container/auth-container.component';
import { AuthContainerModule } from '../auth-container/auth-container.module';
import { LoginComponent } from './login.component';

@NgModule({
  imports: [
    SharedCommonModule,
    AuthContainerModule,
    RouterModule.forChild([
      {
        path: '',
        component: AuthContainerComponent,
        children: [
          {
            path: '',
            component: LoginComponent,
          },
        ],
      },
    ]),
  ],
  declarations: [LoginComponent],
})
export class LoginModule {}
