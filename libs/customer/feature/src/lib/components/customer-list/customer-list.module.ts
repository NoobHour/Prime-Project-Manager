import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedCommonModule } from '@mgmt/shared/common';
import { CustomerListComponent } from './customer-list.component';

@NgModule({
  imports: [
    SharedCommonModule,
    RouterModule.forChild([
      {
        path: '',
        component: CustomerListComponent,
      },
    ]),
  ],
  declarations: [CustomerListComponent],
})
export class CustomerListModule {}
