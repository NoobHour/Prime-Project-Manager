import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { ICustomer } from '@mgmt/customer/api-interfaces';

@Component({
  standalone: false,
  selector: 'mgmt-list-customers',
  templateUrl: './list-customers.component.html',
  styleUrls: ['./list-customers.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListCustomersComponent {
  @Input()
  customers: ICustomer[];
  @Input()
  pageSize: number;
  @Input()
  collectionSize: number;
  // page start at 1
  @Input()
  page: number;

  @Output()
  pageChange = new EventEmitter<number>();

  /** Accepts a list index and customer; returns its stable slug for DOM reuse. */
  trackByItems(index: number, item: ICustomer): string {
    return item.slug;
  }
  /** Accepts a zero-based card index; returns whether a four-card row ends at this position. */
  isRowEven(index: number) {
    index = index + 1;
    return index % 4 == 0;
  }
}
