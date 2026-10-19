import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedCommonModule } from '@mgmt/shared/common';
import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { WorkspaceComponent } from './workspace.component';

/** Accepts the workspace page; returns whether its settings or template editor can safely be left. */
export function canLeaveWorkspace(component: WorkspaceComponent) { return component.canLeave(); }

@NgModule({
  imports: [SharedCommonModule, CalendarModule.forRoot({ provide: DateAdapter, useFactory: adapterFactory }), RouterModule.forChild([{ path: '', component: WorkspaceComponent, canDeactivate: [canLeaveWorkspace] }])],
  declarations: [WorkspaceComponent],
})
export class WorkspaceModule {}
