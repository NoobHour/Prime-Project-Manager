import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedCommonModule } from '@mgmt/shared/common';
import { ViewCommentsComponent } from './view-comments.component';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { TabViewModule } from '@mgmt/shared/common';

@NgModule({
  imports: [SharedCommonModule, ScrollPanelModule, TabViewModule],
  declarations: [ViewCommentsComponent],
  exports: [ViewCommentsComponent],
})
export class ViewCommentsModule {}
