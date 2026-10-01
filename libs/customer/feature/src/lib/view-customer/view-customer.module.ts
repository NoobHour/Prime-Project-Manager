import { FileUtilModule } from '../file-util/file-util.module';
import { NgModule } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { RouterModule } from '@angular/router';
import { SharedCommonModule } from '@mgmt/shared/common';
import { CustomerAuthorModule } from '../components/customer-author/customer-author.module';
import { ViewCustomerComponent } from './view-customer.component';
import { CustomerCalendarModule } from '../calendar/calendar.module';
import { ViewCommentsModule } from '../view-comments/view-comments.module';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { TabViewModule } from '@mgmt/shared/common';
import { DividerModule } from 'primeng/divider';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';

/** Accepts the routed customer view; returns whether navigation can discard its discussion drafts. */
export function canLeaveCustomer(component: ViewCustomerComponent) { return component.canLeave(); }

@NgModule({
  imports: [
    SharedCommonModule,
    A11yModule,
    FileUtilModule,
    CustomerAuthorModule,
    CustomerCalendarModule,
    ViewCommentsModule,
    ScrollPanelModule,
    TabViewModule,
    DividerModule,
    ButtonModule,
    FileUploadModule,
    RouterModule.forChild([
      {
        path: '',
        component: ViewCustomerComponent,
        canDeactivate: [canLeaveCustomer],
      },
    ]),
  ],
  declarations: [ViewCustomerComponent],
})
export class ViewCustomerModule {}
