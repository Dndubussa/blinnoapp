/**
 * Custom React Hook Utilities
 * Provides helpers for preventing common React errors
 */

import { useEffect, useRef, DependencyList, useCallback, useState } from 'react';

/**
 * Hook that validates useEffect dependencies and warns about missing dependencies
 * Useful during development to catch potential memory leaks
 * 
 * @example
 * useEffectDebug(() => {
 *   console.log(user, profile);
 * }, [user, profile], { name: "UserEffect" });
 */
export function useEffectDebug(
  effect: React.EffectCallback,
  deps: DependencyList,
  { name = 'Effect' }: { name?: string } = {}
) {
  const prevDepsRef = useRef<DependencyList>();
  
  useEffect(() => {
    // Check if dependencies changed
    const depsChanged = !prevDepsRef.current || 
      prevDepsRef.current.length !== deps.length ||
      prevDepsRef.current.some((dep, i) => dep !== deps[i]);
    
    if (depsChanged) {
      console.debug(`[${name}] Dependencies changed, running effect`, {
        prev: prevDepsRef.current,
        current: deps,
      });
    }
    
    prevDepsRef.current = deps;
  }, deps);

  return effect();
}

/**
 * Prevents unnecessary refetches on component mount
 * Useful for expensive operations that should only run once
 * 
 * @example
 * useInitialize(() => {
 *   initializeApp();
 * });
 */
export function useInitialize(callback: () => void | (() => void)) {
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (!hasRunRef.current) {
      hasRunRef.current = true;
      const cleanup = callback();
      return cleanup;
    }
  }, []); // Empty dependency array - only runs once
}

/**
 * Debounced effect - delays execution until dependencies stop changing
 * Useful for search inputs, resize handlers, etc.
 * 
 * @example
 * useDebouncedEffect(() => {
 *   searchProducts(query);
 * }, [query], 500);
 */
export function useDebouncedEffect(
  effect: () => void | (() => void),
  deps: DependencyList,
  delay: number = 500
) {
  useEffect(() => {
    const handler = setTimeout(effect, delay);
    return () => clearTimeout(handler);
  }, [effect, delay, ...deps]);
}

/**
 * Throttled effect - ensures effect doesn't run more than once per interval
 * Useful for expensive handlers
 * 
 * @example
 * useThrottledEffect(() => {
 *   handleScroll();
 * }, [scrollY], 100);
 */
export function useThrottledEffect(
  effect: () => void | (() => void),
  deps: DependencyList,
  throttleMs: number = 1000
) {
  const lastRunRef = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();
    if (now - lastRunRef.current >= throttleMs) {
      lastRunRef.current = now;
      return effect();
    }
  }, deps);
}

/**
 * Safe async effect - handles cleanup properly to prevent memory leaks
 * 
 * @example
 * useSafeAsyncEffect(async () => {
 *   const data = await fetchData();
 *   setData(data);
 * }, []);
 */
export function useSafeAsyncEffect(
  asyncEffect: () => Promise<void>,
  deps: DependencyList
) {
  useEffect(() => {
    let isMounted = true;

    const executeAsync = async () => {
      try {
        if (isMounted) {
          await asyncEffect();
        }
      } catch (error) {
        if (isMounted) {
          console.error('Async effect error:', error);
        }
      }
    };

    executeAsync();

    return () => {
      isMounted = false;
    };
  }, deps);
}

/**
 * Creates stable callback reference that prevents unnecessary re-renders
 * Unlike useCallback, this doesn't require dependency array
 * 
 * @example
 * const handleClick = useStableCallback((id: string) => {
 *   deleteItem(id);
 * });
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: any[]) => callbackRef.current(...args),
    []
  ) as T;
}

/**
 * Memoizes expensive calculations and updates only when deps change
 * 
 * @example
 * const result = useMemoized(() => {
 *   return expensiveCalculation(data);
 * }, [data]);
 */
export function useMemoized<T>(
  computeFn: () => T,
  deps: DependencyList
): T {
  const valueRef = useRef<T>();
  const depsRef = useRef<DependencyList>();

  const depsChanged = !depsRef.current || 
    depsRef.current.length !== deps.length ||
    depsRef.current.some((dep, i) => dep !== deps[i]);

  if (depsChanged) {
    valueRef.current = computeFn();
    depsRef.current = deps;
  }

  return valueRef.current!;
}

/**
 * Debounced state setter - delays state updates
 * Useful for form inputs, search queries
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useDebouncedState("", 300);
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 500
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return [debouncedValue, setValue];
}

/**
 * Mounts indicator - tracks if component is mounted
 * Useful for preventing state updates after unmount
 * 
 * @example
 * const isMounted = useIsMounted();
 * useEffect(() => {
 *   fetchData().then(data => {
 *     if (isMounted()) {
 *       setData(data);
 *     }
 *   });
 * }, []);
 */
export function useIsMounted(): () => boolean {
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return useCallback(() => isMountedRef.current, []);
}

/**
 * Previous value hook - gets the previous value of a variable
 * 
 * @example
 * const prevCount = usePrevious(count);
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Lifecycle hook - runs effect only on mount/unmount
 * 
 * @example
 * useMount(() => {
 *   subscribeToEvents();
 *   return () => unsubscribeFromEvents();
 * });
 */
export function useMount(callback: () => void | (() => void)) {
  useEffect(callback, []); // Empty deps = only on mount/unmount
}
