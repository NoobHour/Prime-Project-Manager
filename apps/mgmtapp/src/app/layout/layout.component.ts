import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { IUserService } from '@mgmt/user/shared';
import { MenuItem } from 'primeng/api';

@Component({
  standalone: false,
  selector: 'mgmt-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
})
export class LayoutComponent {
  items: MenuItem[];
  demo = false;
  sandbox = false;
  resetTime = '';
  activeItem: MenuItem;

  /** Accepts account and HTTP services; provides navigation and the demo workspace indicator. */
  constructor(
    public userService: IUserService,
    private http: HttpClient,
  ) {}

  /** Accepts no input; builds existing navigation and reads the server's demo flag. */
  ngOnInit() {
    this.http.get<any>('/api/setup').subscribe({
      // Accepts setup metadata; updates the visible demo notice and local reset time. Returns nothing.
      next: (status) => {
        this.demo = status.demo === true;
        this.sandbox = status.sandbox === true;
        this.resetTime = status.resetAt ? new Date(status.resetAt).toLocaleTimeString() : '';
      },
      error: () => {},
    });
    this.items = [
      { label: 'Home', icon: 'pi pi-fw pi-home', routerLink: '/' },
      { label: 'Team', icon: 'pi pi-users', routerLink: '/team' },
      { label: 'Job Board', routerLink: '/jobs', icon: 'pi pi-fw pi-calendar' },
      {
        label: 'New Customer',
        icon: 'pi pi-fw pi-file',
        routerLink: '/editor',
      },
      {
        label: 'Completed Jobs',
        routerLink: '/completed',
        icon: 'pi pi-fw pi-calendar',
      },
      {
        label: 'Customer List',
        icon: 'pi pi-fw pi-calendar',
        routerLink: '/customers',
      },
    ];

    this.activeItem = this.items[0];
  }
}
