import { ViewCommentsModule } from '../../view-comments/view-comments.module';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedCommonModule } from '@mgmt/shared/common';
import { ListCustomersModule } from '../list-customers/list-customers.module';
import { HomeComponent } from './home.component';

@NgModule({
  imports: [
    SharedCommonModule,
    ListCustomersModule,
    ViewCommentsModule,
    RouterModule.forChild([
      {
        path: '',
        component: HomeComponent,
      },
    ]),
  ],
  declarations: [HomeComponent],
})
export class HomeModule {}
