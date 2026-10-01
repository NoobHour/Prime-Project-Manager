import { Injectable } from '@angular/core';
import { NbSpinnerService } from '../nb-spinner/nb-spinner.service';

@Injectable({
  providedIn: 'root',
  useClass: NbSpinnerService,
})
export abstract class ISpinnerService {
  abstract show();
  abstract hide();
}
