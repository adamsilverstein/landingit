import * as SecureStore from 'expo-secure-store';
import type { StorageAdapter } from '../../shared/storage.js';

export const secureStorageAdapter: StorageAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};
