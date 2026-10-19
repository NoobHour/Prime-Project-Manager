import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedCommonModule, TabViewModule } from '@mgmt/shared/common';
import { A11yModule } from '@angular/cdk/a11y';
import { CustomerCalendarModule } from '../calendar/calendar.module';
import { FileUtilModule } from '../file-util/file-util.module';
import { ViewCommentsModule } from '../view-comments/view-comments.module';
import { JobViewComponent } from './job-view.component';

/** Accepts the routed job and router states; protects record changes while allowing mounted resource switches. */
export function canLeaveJob(component: JobViewComponent, _route?: any, currentState?: any, nextState?: any) {
  // Resource and calendar query changes reuse the same mounted editors; only leaving their record risks losing drafts.
  if (!component.creating && currentState && nextState && currentState.url.split('?')[0] === nextState.url.split('?')[0]) return true;
  return component.canLeave();
}

@NgModule({
  declarations: [JobViewComponent],
  imports: [SharedCommonModule, TabViewModule, A11yModule, CustomerCalendarModule, FileUtilModule, ViewCommentsModule,
    RouterModule.forChild([{ path: '', component: JobViewComponent, canDeactivate: [canLeaveJob], runGuardsAndResolvers: 'always' }])],
})
export class JobViewModule {}
