import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedCommonModule, TabViewModule } from '@mgmt/shared/common';
import { A11yModule } from '@angular/cdk/a11y';
import { CustomerCalendarModule } from '../calendar/calendar.module';
import { FileUtilModule } from '../file-util/file-util.module';
import { ViewCommentsModule } from '../view-comments/view-comments.module';
import { JobViewComponent } from './job-view.component';

/** Accepts the routed job component; returns whether its pending changes can be left safely. */
export function canLeaveJob(component: JobViewComponent) {
  return component.canLeave();
}

@NgModule({
  declarations: [JobViewComponent],
  imports: [SharedCommonModule, TabViewModule, A11yModule, CustomerCalendarModule, FileUtilModule, ViewCommentsModule,
    RouterModule.forChild([{ path: '', component: JobViewComponent, canDeactivate: [canLeaveJob], runGuardsAndResolvers: 'always' }])],
})
export class JobViewModule {}
