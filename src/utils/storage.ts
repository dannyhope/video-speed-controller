import browser from 'webextension-polyfill';

interface StorageResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
}

export async function safeStorageGet<T extends Record<string, any>>(
  keys: string[] | Record<string, any> | null,
  defaults: T = {} as T
): Promise<StorageResult<T>> {
  try {
    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await browser.storage.sync.get(keys || defaults);
        return { success: true, result: result as T, attempts: attempt };
      } catch (error) {
        lastError = error as Error;
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    return { success: false, error: lastError, attempts: 3 };
  } catch (error) {
    return { success: false, error: error as Error, attempts: 0 };
  }
}

export async function safeStorageSet<T extends Record<string, any>>(
  items: T
): Promise<StorageResult<T>> {
  try {
    // Check quota first (simplified check)
    const dataSize = JSON.stringify(items).length;
    if (dataSize > 100000) {
      // 100KB limit
      throw new Error('Data too large for storage');
    }

    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await browser.storage.sync.set(items);
        return { success: true, result: items, attempts: attempt };
      } catch (error) {
        lastError = error as Error;
        if (attempt < 3 && !lastError.message.includes('quota')) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        } else {
          break; // Don't retry quota errors
        }
      }
    }
    return { success: false, error: lastError, attempts: 3 };
  } catch (error) {
    return { success: false, error: error as Error, attempts: 0 };
  }
}
