import { useEffect, useRef } from 'react';

// Keep page transition timers scoped to the mounted page.
export function useAuthEffects() {
  const mounted = useRef(false);
  const timers = useRef(new Set());

  useEffect(() => {
    mounted.current = true;
    const pendingTimers = timers.current;
    return () => {
      mounted.current = false;
      pendingTimers.forEach(clearTimeout);
      pendingTimers.clear();
    };
  }, []);

  const schedule = (callback, delay) => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      if (mounted.current) callback();
    }, reduceMotion ? 0 : delay);
    timers.current.add(timer);
  };

  return { schedule, isMounted: () => mounted.current };
}
