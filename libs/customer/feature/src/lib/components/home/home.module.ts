import { ViewCommentsModule } from '../../view-comments/view-comments.module';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedCommonModule } from '@mgmt/shared/common';
import { ListCustomersModule } from '../list-customers/list-customers.module';
import { HomeComponent } from './home.component';

/** Accepts the Home page; returns permission to leave its team composer. */
export function canLeaveHome(component: HomeComponent) { return component.canLeave(); }

@NgModule({
  imports: [
    SharedCommonModule,
    ListCustomersModule,
    ViewCommentsModule,
    RouterModule.forChild([
      {
        path: '',
        component: HomeComponent,
        canDeactivate: [canLeaveHome],
      },
    ]),
  ],
  declarations: [HomeComponent],
})
export class HomeModule {}
