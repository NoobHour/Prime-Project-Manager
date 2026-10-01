import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedCommonModule } from '@mgmt/shared/common';
import { AuthContainerComponent } from '../auth-container/auth-container.component';
import { AuthContainerModule } from '../auth-container/auth-container.module';
import { RegisterComponent } from './register.component';

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
            component: RegisterComponent,
          },
        ],
      },
    ]),
  ],
  declarations: [RegisterComponent],
})
export class RegisterModule {}
