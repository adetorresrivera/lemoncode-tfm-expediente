import { useCallback, useEffect, useRef } from "react";

// Returns a stable function that runs the latest `callback` once `ms` have passed since its last
// call. The pending timer is cleared on unmount, so a remounted field never fires a stale call.
export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  ms: number,
): (...args: A) => void {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    [],
  );

  return useCallback(
    (...args: A) => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        callbackRef.current(...args);
      }, ms);
    },
    [ms],
  );
}
