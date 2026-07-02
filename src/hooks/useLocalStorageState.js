import { useEffect, useState } from 'react';

export default function useLocalStorageState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore write failures
    }
  }, [key, state]);

  return [state, setState];
}
