import { useCallback, useState } from 'react';

/** Syncs a piece of state with `localStorage`, tolerating storage/serialization failures. */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setAndPersist = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = next instanceof Function ? next(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // storage unavailable (private mode, quota) — state still updates in-memory
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, setAndPersist] as const;
}
