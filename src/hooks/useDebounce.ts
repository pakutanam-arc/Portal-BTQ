import { useState, useEffect } from 'react';

/**
 * Hook to debounce any fast-changing value (e.g. search input).
 *
 * @param value The value to debounce
 * @param delay Delay in milliseconds (defaults to 250ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
