import { NgModule } from '@angular/core';
import { RouterModule, Routes, UrlSegment } from '@angular/router';
import { AuthGuardService, NotAuthGuardService } from '@mgmt/user/shared';
import { LayoutComponent } from './layout.component';

/** Accepts URL segments; returns a profile-route match for an @name path, otherwise null. */
export function profilePathMatcher(url: UrlSegment[]) {
  return url.length >= 1 && url[0].path.startsWith('@')
    ? { consumed: url }
    : null;
}

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: 'job/:jobSlug',
        loadChildren: () => import('@mgmt/customer/feature').then((m) => m.JobViewModule),
        canActivate: [AuthGuardService],
      },
      {
        path: 'team',
        loadChildren: () =>
          import('@mgmt/user/feature').then((m) => m.TeamModule),
        canActivate: [AuthGuardService],
      },
      {
        path: 'jobs',
        loadChildren: () =>
          import('@mgmt/customer/feature').then((m) => m.JobBoardModule),
        canActivate: [AuthGuardService],
      },
      {
        path: 'completed',
        loadChildren: () =>
          import('@mgmt/customer/feature').then((m) => m.JobBoardModule),
        canActivate: [AuthGuardService],
      },
      {
        path: '',
        loadChildren: () =>
          import('@mgmt/customer/feature').then((m) => m.HomeModule),
        canActivate: [AuthGuardService],
      },
      {
        matcher: profilePathMatcher,
        loadChildren: () =>
          import('@mgmt/user/feature').then((m) => m.ProfileModule),
        canActivate: [AuthGuardService],
      },
      {
        path: 'customer/:slug',
        loadChildren: () =>
          import('@mgmt/customer/feature').then((m) => m.ViewCustomerModule),
        canActivate: [AuthGuardService],
      },
      {
        path: 'customers',
        loadChildren: () =>
          import('@mgmt/customer/feature').then((m) => m.CustomerListModule),
        canActivate: [AuthGuardService],
      },
      {
        path: 'editor',
        loadChildren: () =>
          import('@mgmt/customer/feature').then((m) => m.EditorModule),
        canActivate: [AuthGuardService],
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('@mgmt/user/feature').then((m) => m.SettingModule),
        canActivate: [AuthGuardService],
      },

      {
        path: 'register',
        loadChildren: () =>
          import('@mgmt/user/feature').then((m) => m.RegisterModule),
        canActivate: [AuthGuardService],
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LayoutRoutingModule {}
