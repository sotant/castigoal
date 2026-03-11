import * as SecureStore from 'expo-secure-store';

const memoryStorage = new Map<string, string>();

let warnedAboutFallback = false;

function logStorageFallback(error: unknown) {
  if (warnedAboutFallback) {
    return;
  }

  warnedAboutFallback = true;
  console.warn('[storage] SecureStore is unavailable. Falling back to in-memory storage for this session.', error);
}

async function withFallback<T>(
  operation: () => Promise<T>,
  fallback: () => T | Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logStorageFallback(error);
    return await fallback();
  }
}

export const sessionStorage = {
  getItem: (name: string) =>
    withFallback(
      () => SecureStore.getItemAsync(name),
      () => memoryStorage.get(name) ?? null,
    ),
  setItem: (name: string, value: string) =>
    withFallback(
      () => SecureStore.setItemAsync(name, value),
      () => {
        memoryStorage.set(name, value);
      },
    ),
  removeItem: (name: string) =>
    withFallback(
      () => SecureStore.deleteItemAsync(name),
      () => {
        memoryStorage.delete(name);
      },
    ),
};
