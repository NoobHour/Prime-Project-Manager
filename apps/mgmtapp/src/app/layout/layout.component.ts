import { HttpClient } from '@angular/common/http';
import { Component, HostListener } from '@angular/core';
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
      { label: 'My work', icon: 'pi pi-fw pi-home', routerLink: '/' },
      { label: 'Jobs', routerLink: '/jobs', icon: 'pi pi-fw pi-calendar' },
      {
        label: 'Customers',
        icon: 'pi pi-fw pi-calendar',
        routerLink: '/customers',
      },
      { label: 'Team', icon: 'pi pi-users', routerLink: '/team' },
      { label: 'Schedule', icon: 'pi pi-calendar', routerLink: '/schedule' },
      { label: 'Updates', icon: 'pi pi-bell', routerLink: '/updates' },
      { label: 'Search', icon: 'pi pi-search', routerLink: '/search' },
    ];

    this.activeItem = this.items[0];
    this.applyTerminology();
  }
  /** Accepts no input; applies the persisted terminology preset to primary navigation. */
  @HostListener('window:workspace-settings-changed')
  applyTerminology() {
    this.http.get<any>('/api/workspace').subscribe({
      next: (result) => { const projects = result.data.terminology === 'projects'; for (const item of this.items) { if (item.routerLink === '/jobs') item.label = projects ? 'Projects' : 'Jobs'; if (item.routerLink === '/customers') item.label = projects ? 'Contacts' : 'Customers'; } },
      error: () => {},
    });
  }
}
