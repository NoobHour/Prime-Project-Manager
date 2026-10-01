import { ToastConfig } from './toast-config/toast-config';
import { Observable, Subject } from 'rxjs';
import { Type } from '@angular/core';
import { ToastType } from './toast-config/toast-notifications.config';

export class Toast {
  readonly autoClose: boolean;
  readonly duration: number;
  readonly text: string;
  readonly caption: string;
  readonly type: ToastType;
  readonly component: Type<any>;

  private readonly closeFunction: (toast: Toast) => void;
  private readonly _onClose = new Subject<any>();
  private timeoutId: any;

  /** Accepts config, closeFunction; initializes Toast and its dependencies. */
  constructor(config: ToastConfig, closeFunction: (toast: Toast) => void) {
    this.autoClose = config.autoClose;
    this.duration = config.duration > 0 ? config.duration : 0;
    this.text = config.text;
    this.caption = config.caption;
    this.type = config.type;
    this.component = config.component;
    this.closeFunction = closeFunction;
    this._setTimeout();
  }

  /** Accepts no input; returns the observable close result. */
  get onClose(): Observable<any> {
    return this._onClose.asObservable();
  }

  /** Accepts an optional close result; notifies listeners, removes the toast and clears its timer. Returns nothing. */
  close(result?: any) {
    if (!this._onClose.closed) {
      this._onClose.next(result);
      this._onClose.complete();
    }
    this.closeFunction(this);
    this._clearTimeout();
  }

  /** Accepts no input; schedules dismissal when automatic closing is enabled. Returns nothing. */
  private _setTimeout() {
    if (this.autoClose && this.duration > 0) {
      this.timeoutId = setTimeout(() => this.close(), this.duration);
    }
  }

  /** Accepts no input; cancels the dismissal timer if present. Returns nothing. */
  private _clearTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }
}
