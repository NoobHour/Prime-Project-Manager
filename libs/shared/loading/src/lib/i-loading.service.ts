import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LoadingService } from './loading.service';

@Injectable({
  providedIn: 'root',
  useClass: LoadingService,
})
export abstract class ILoadingService {
  loader$: Observable<boolean>;

  abstract loading();
  abstract loaded();
}
