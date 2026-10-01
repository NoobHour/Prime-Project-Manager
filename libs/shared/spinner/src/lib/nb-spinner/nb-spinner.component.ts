import { Component, OnInit } from '@angular/core';

@Component({
  standalone: false,
  selector: 'nb-spinner',
  template: ` <div class="spinner-wrapper">
    <div class="spinner-border text-primary" role="status">
      <span class="sr-only">Loading...</span>
    </div>
  </div>`,
  styles: [
    `
      .spinner-wrapper {
        position: fixed;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        top: 0;
        left: 0;
        background-color: rgba(0, 0, 0, 0.4);
        z-index: 998;
      }
    `,
  ],
})
export class NbSpinnerComponent {}
