import { Inject, Injectable } from '@angular/core';
import { WA_LOCAL_STORAGE as LOCAL_STORAGE } from '@ng-web-apis/common';
import { STORAGE_KEY } from './constants';
import { StorageUtil } from './storage.util';

@Injectable({
  providedIn: 'root',
})
export class ThemeStorageUtil extends StorageUtil {
  /** Accepts localStorage; initializes ThemeStorageUtil and its dependencies. */
  constructor(@Inject(LOCAL_STORAGE) readonly localStorage: Storage) {
    super(localStorage);
  }

  /** Accepts no input; returns the stored theme name or null. */
  get theme(): string {
    return this.getItem(STORAGE_KEY.THEME);
  }
  /** Accepts a theme name; stores the preference in browser storage. Returns nothing. */
  setTheme(theme: string) {
    this.setItem(STORAGE_KEY.THEME, theme);
  }
  /** Accepts no input; removes the stored theme preference. Returns nothing. */
  clearTheme() {
    this.removeItem(STORAGE_KEY.THEME);
  }
}
