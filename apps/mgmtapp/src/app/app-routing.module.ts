import { NgModule } from '@angular/core';
import { ExtraOptions, RouterModule, Routes } from '@angular/router';
import { AuthGuardService, NotAuthGuardService } from '@mgmt/user/shared';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./layout/layout.module').then((m) => m.LayoutModule),
    canActivate: [AuthGuardService],
  },
  {
    path: 'login',
    loadChildren: () => import('@mgmt/user/feature').then((m) => m.LoginModule),
    canActivate: [NotAuthGuardService],
  },
  { path: '**', redirectTo: '' },
];

const config: ExtraOptions = {
  useHash: true,
  scrollPositionRestoration: 'enabled',
  initialNavigation: 'enabledBlocking',
};

@NgModule({
  imports: [RouterModule.forRoot(routes, config)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
