import { ISpinnerService } from './i-spinner.service';

/** Accepts a spinner service; returns an initializer that retains the injected service. */
export function InitSpinnerFactory(spinner: ISpinnerService) {
  return () => {
    return spinner;
  };
}
