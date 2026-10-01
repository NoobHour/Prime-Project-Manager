export abstract class StorageUtil {
  /** Accepts storage; initializes StorageUtil and its dependencies. */
  constructor(private storage: Storage) {}

  /**
   * Accepts no input; removes all entries from this storage. Returns nothing.
   */
  clear() {
    this.storage.clear();
  }

  /**
   * Accepts a key; returns its stored string value, or null if absent.
   */
  getItem(key: string): string | null {
    return this.storage.getItem(key);
  }

  /**
   * Accepts a key; removes its entry if present. Returns nothing.
   */
  removeItem(key: string) {
    this.storage.removeItem(key);
  }

  /**
   * Accepts a key and string value; stores the entry. Returns nothing and propagates storage/quota errors.
   */
  setItem(key: string, value: string) {
    this.storage.setItem(key, value);
  }
}
