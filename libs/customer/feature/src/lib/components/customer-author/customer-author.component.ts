import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { ICustomer } from '@mgmt/customer/api-interfaces';
import { IUser } from '@mgmt/user/api-interfaces';

@Component({
  standalone: false,
  selector: 'mgmt-customer-author',
  templateUrl: './customer-author.component.html',
  styleUrls: ['./customer-author.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerAuthorComponent {
  @Input() customer: ICustomer;
  @Input() currentUser: IUser;

  @Output() toggleArchived = new EventEmitter<boolean>();
}
