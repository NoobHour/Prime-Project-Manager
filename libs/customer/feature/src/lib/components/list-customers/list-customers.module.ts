import { NgModule } from '@angular/core';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedCommonModule } from '@mgmt/shared/common';
import { CustomerItemModule } from '../customer-item/customer-item.module';
import { ListCustomersComponent } from './list-customers.component';

@NgModule({
  declarations: [ListCustomersComponent],
  exports: [ListCustomersComponent],
  imports: [SharedCommonModule, NgbPaginationModule, CustomerItemModule],
})
export class ListCustomersModule {}
