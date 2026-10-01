import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { ComponentRef, Injectable } from '@angular/core';

import { ILoadingService } from '@mgmt/shared/loading';
import { ISpinnerService } from '../public/i-spinner.service';
import { NbSpinnerComponent } from './nb-spinner.component';

@Injectable()
export class NbSpinnerService implements ISpinnerService {
  private overlayRef: OverlayRef;
  private componentRef: ComponentRef<NbSpinnerComponent>;
  private spinnerOverlayPortal = new ComponentPortal(NbSpinnerComponent);

  /** Accepts loadingService, overlay; initializes NbSpinnerService and its dependencies. */
  constructor(
    private loadingService: ILoadingService,
    private overlay: Overlay,
  ) {
    this.loadingService.loader$.subscribe((isShow) =>
      isShow ? this.show() : this.hide(),
    );
  }

  /** Accepts no input; attaches the loading overlay if it is not already shown. Returns nothing. */
  show() {
    if (this.overlayRef && this.overlayRef.hasAttached()) {
      return;
    }
    this.overlayRef = this.overlay.create();
    this.componentRef = this.overlayRef.attach(this.spinnerOverlayPortal);
  }

  /** Accepts no input; detaches the loading overlay when present. Returns nothing. */
  hide() {
    if (!this.overlayRef) {
      return;
    }
    if (!this.componentRef) {
      throw Error('SpinnerService: componentRef is not initialized properly');
    }

    this.componentRef.destroy();
    this.overlayRef.detach();
  }
}
