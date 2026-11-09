import { useSyncExternalStore } from 'react';

/** true si la consulta de medios se cumple (se actualiza al cambiar el tamaño). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const MOBILE_QUERY = '(max-width: 767.98px)';
export const DESKTOP_QUERY = '(min-width: 1024px)';
