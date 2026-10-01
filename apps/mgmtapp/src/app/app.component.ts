import { Component } from '@angular/core';
import { APP_BRAND } from '@mgmt/shared/client-server';

@Component({
  standalone: false,
  selector: 'mgmt-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  // Shared identity keeps the global footer and sign-in branding consistent.
  readonly brand = APP_BRAND;
}
