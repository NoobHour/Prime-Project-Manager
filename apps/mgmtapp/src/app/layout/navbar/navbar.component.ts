import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { IUser } from '@mgmt/user/api-interfaces';
import { IUserService } from '@mgmt/user/shared';
import { APP_BRAND } from '@mgmt/shared/client-server';
import { Title } from '@angular/platform-browser';
@Component({
  standalone: false,
  selector: 'mgmt-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent implements OnInit {
  @Input() isAuth: boolean;
  @Input() user: IUser;
  brand = APP_BRAND;
  /** Accepts account and document-title services; configures the application header. */
  constructor(
    private userService: IUserService,
    private title: Title,
  ) {}
  /** Accepts no input; starts the existing logout flow and reloads the login screen. */
  logout() {
    this.userService.logout();
    window.location.reload();
  }
  /** Accepts no input; sets the configured public-facing document title. */
  ngOnInit() {
    this.title.setTitle(this.brand.name + ' · ' + this.brand.shortName);
  }
}
