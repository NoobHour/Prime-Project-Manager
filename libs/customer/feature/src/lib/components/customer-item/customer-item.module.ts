import { NgModule } from '@angular/core';
import { SharedCommonModule } from '@mgmt/shared/common';
import { CustomerItemComponent } from './customer-item.component';
import { DividerModule } from 'primeng/divider';

@NgModule({
  imports: [SharedCommonModule, DividerModule],
  declarations: [CustomerItemComponent],
  exports: [CustomerItemComponent],
})
export class CustomerItemModule {}
