import { Directive, ElementRef } from '@angular/core';
import { fromEvent } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';

@Directive({
  standalone: false,
  selector: 'form, [formGroup]',
})
export class FormSubmitDirective {
  submit$ = fromEvent(this.element, 'submit').pipe(shareReplay(1));

  /** Accepts host; initializes FormSubmitDirective and its dependencies. */
  constructor(private host: ElementRef<HTMLFormElement>) {}

  /** Accepts no input; returns the native form element. */
  get element() {
    return this.host.nativeElement;
  }
}
