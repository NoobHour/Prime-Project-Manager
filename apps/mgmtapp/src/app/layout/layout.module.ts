import { NgModule } from '@angular/core';
import { FooterComponent } from './footer/footer.component';
import { LayoutRoutingModule } from './layout-routing.module';
import { LayoutComponent } from './layout.component';
import { NavbarComponent } from './navbar/navbar.component';
import { SharedCommonModule } from '@mgmt/shared/common';

import { MessageModule } from 'primeng/message';

@NgModule({
  declarations: [LayoutComponent, NavbarComponent, FooterComponent],
  imports: [MessageModule, LayoutRoutingModule, SharedCommonModule],
})
export class LayoutModule {}
