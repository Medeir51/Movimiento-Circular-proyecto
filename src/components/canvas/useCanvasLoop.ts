import { useEffect } from 'react';
import type { RefObject } from 'react';
import { readColors } from './drawing';
import type { Colors } from './drawing';

export interface LoopFrame {
  ctx: CanvasRenderingContext2D;
  /** Lado del lienzo en píxeles CSS. */
  size: number;
  colors: Colors;
  /** Segundos reales desde el cuadro anterior (máximo 0,1 s). */
  dt: number;
  now: number;
  /** El tamaño o los colores cambiaron desde el último cuadro. */
  changed: boolean;
}

/**
 * Ciclo de requestAnimationFrame con escalado por devicePixelRatio,
 * cambio de tamaño y lectura de los colores del tema. No provoca renderizados de React.
 */
export function useCanvasLoop(
  wrapRef: RefObject<HTMLDivElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  onFrame: (f: LoopFrame) => void,
  onVisibility?: (visible: boolean) => void,
): void {
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let size = 0;
    let changed = true;
    let colors = readColors(canvas);

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const side = Math.max(
        120,
        Math.floor(Math.min(rect.width, rect.height > 0 ? rect.height : rect.width)),
      );
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      if (side !== size || canvas.width !== Math.round(side * dpr)) {
        size = side;
        canvas.width = Math.round(side * dpr);
        canvas.height = Math.round(side * dpr);
        canvas.style.width = `${side}px`;
        canvas.style.height = `${side}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        changed = true;
      }
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    const refreshColors = () => {
      colors = readColors(canvas);
      changed = true;
    };
    const mo = new MutationObserver(refreshColors);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    let last = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      onFrame({ ctx, size, colors, dt, now, changed });
      changed = false;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onVis = () => {
      last = performance.now();
      onVisibility?.(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
    // El ciclo se crea una sola vez; onFrame lee el estado con getState().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
