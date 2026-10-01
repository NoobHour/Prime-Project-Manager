import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ICustomer } from '@mgmt/customer/api-interfaces';

/** Accepts a customer input; renders its overview card without extra network requests. */
@Component({
  standalone: false,
  selector: 'mgmt-customer-item',
  templateUrl: './customer-item.component.html',
  styleUrls: ['./customer-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerItemComponent {
  @Input() customer: ICustomer;
}
