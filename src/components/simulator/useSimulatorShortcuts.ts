import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';

/** Atajos: Espacio = reproducir/pausa, R = reiniciar, ← / → = paso (19.5). */
export function useSimulatorShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t) {
        const tag = t.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          tag === 'BUTTON' ||
          tag === 'SUMMARY' ||
          tag === 'A' ||
          t.isContentEditable ||
          t.closest('dialog')
        ) {
          return;
        }
      }
      const st = useAppStore.getState();
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        st.togglePlay();
      } else if (e.key === 'r' || e.key === 'R') {
        st.seek(0);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        st.stepFrame(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        st.stepFrame(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
