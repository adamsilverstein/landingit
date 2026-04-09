import type { StorageAdapter } from '../../shared/storage.js';

/** localStorage-backed StorageAdapter for the web app. */
export const webStorage: StorageAdapter = {
  getItem: (key) => Promise.resolve(localStorage.getItem(key)),
  setItem: (key, value) => {
    localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key) => {
    localStorage.removeItem(key);
    return Promise.resolve();
  },
};
