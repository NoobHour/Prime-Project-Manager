import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import {
  animate,
  animateChild,
  query,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { Toast } from '../toast';
import { ToastConfig } from '../toast-config/toast-config';
import { ToastPosition } from '../toast-config/toast-notifications.config';
import { NotificationType } from '@mgmt/shared/notification';

const nestedTransition = transition('* => *', [
  query('@*', animateChild(), { optional: true }),
]);

const shrinkInTransition = transition('void => *', [
  style({ height: 0, opacity: 0, 'margin-top': 0 }),
  animate(100, style({ height: '*', opacity: 1, 'margin-top': '1rem' })),
]);

const shrinkOutTransition = transition('* => void', [
  style({ height: '!', opacity: 1, 'margin-top': '1rem' }),
  animate(100, style({ height: 0, opacity: 0, 'margin-top': 0 })),
]);

const progressTransition = transition('void => *', [
  style({ width: 0, opacity: 0 }),
  animate('{{duration}}', style({ width: '100%', opacity: 1 })),
]);

@Component({
  standalone: false,
  selector: 'mgmt-toast-container',
  templateUrl: './toast-container.component.html',
  styleUrls: ['./toast-container.component.scss'],
  animations: [
    trigger('nested', [nestedTransition]),
    trigger('shrink', [shrinkInTransition, shrinkOutTransition]),
    trigger('progress', [progressTransition]),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainerComponent {
  tl: Toast[] = [];
  tc: Toast[] = [];
  tr: Toast[] = [];
  bl: Toast[] = [];
  bc: Toast[] = [];
  br: Toast[] = [];
  NotificationType = NotificationType;

  /** Accepts changeDetector; initializes ToastContainerComponent and its dependencies. */
  constructor(private changeDetector: ChangeDetectorRef) {}

  /** Accepts toast configuration; returns the new toast, or null when duplicate suppression applies. */
  add(config: ToastConfig): Toast | null {
    const collection = this._getCollection(config.position);
    if (config.preventDuplicates && this._isDuplicate(collection, config)) {
      return null;
    }
    const toast = new Toast(config, (t) => this._delete(collection, t));
    collection.push(toast);
    this.changeDetector.detectChanges();
    return toast;
  }

  /** Accepts a toast collection and toast; removes that toast and updates the view. Returns nothing. */
  private _delete(collection: Toast[], toast: Toast): void {
    collection.splice(collection.indexOf(toast), 1);
    this.changeDetector.detectChanges();
  }

  /** Accepts a toast collection and configuration; returns whether type, caption and text already match. */
  private _isDuplicate(collection: Toast[], config: ToastConfig): boolean {
    return collection.some((t) => {
      return (
        t.type === config.type &&
        t.caption === config.caption &&
        t.text === config.text
      );
    });
  }

  /** Accepts a toast position; returns the corresponding collection, defaulting to bottom-right. */
  private _getCollection(position: ToastPosition): Toast[] {
    switch (position) {
      case 'top-left':
        return this.tl;
      case 'top-center':
        return this.tc;
      case 'top-right':
        return this.tr;
      case 'bottom-left':
        return this.bl;
      case 'bottom-center':
        return this.bc;
      default:
        return this.br;
    }
  }
}
