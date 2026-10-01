import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { ILoadingService } from './i-loading.service';

@Injectable()
export class LoadingService implements ILoadingService {
  private loader = new Subject<boolean>();
  private countLoading = 0;

  readonly loader$ = this.loader.asObservable();

  /** Accepts no input; increments the pending request count and emits loading state. Returns nothing. */
  loading() {
    this.countLoading++;
    this.loader.next(!!this.countLoading);
  }

  /** Accepts no input; decrements the pending request count and emits loading state. Returns nothing. */
  loaded() {
    this.countLoading--;
    this.loader.next(!!this.countLoading);
  }
}
