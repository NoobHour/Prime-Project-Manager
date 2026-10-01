import { NgModule } from '@angular/core';
import { SharedCommonModule } from '@mgmt/shared/common';
import { CustomerAuthorComponent } from './customer-author.component';

@NgModule({
  imports: [SharedCommonModule],
  declarations: [CustomerAuthorComponent],
  exports: [CustomerAuthorComponent],
})
export class CustomerAuthorModule {}
