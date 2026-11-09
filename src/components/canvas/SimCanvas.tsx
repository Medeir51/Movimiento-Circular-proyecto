import { useRef } from 'react';
import { TWO_PI } from '../../core/constants';
import { instantFromMotion } from '../../core/kinematics';
import type { Motion } from '../../core/types';
import { simClock } from '../../store/clock';
import { useAppStore } from '../../store/useAppStore';
import { buildAnimModel } from './animModel';
import type { AnimModel } from './animModel';
import { computeReadouts, drawScene } from './drawing';
import { useCanvasLoop } from './useCanvasLoop';
import styles from './canvas.module.css';

/**
 * En el MCU, al cambiar los datos se conserva la posición visual del punto
 * (se reajusta τ) para que el cambio de velocidad se vea fluido (12.5).
 */
function rebaseTau(prev: Motion, next: Motion, tau: number): number {
  const prevIv = instantFromMotion(prev, tau);
  if (next.omega0 <= 0) return tau;
  const wanted = (prevIv.theta - next.theta0) * next.dirSign;
  const turns = Math.floor(Math.abs(prevIv.turned) / TWO_PI);
  const rel = (((wanted % TWO_PI) + TWO_PI) % TWO_PI) + turns * TWO_PI;
  return rel / next.omega0;
}

/**
 * Lienzo del simulador: lee el store con getState() y dibuja en cada cuadro.
 * Con `fill`, ocupa el alto disponible (barra fija del celular) en vez de ser cuadrado.
 */
export function SimCanvas({ fill = false }: { fill?: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const aria = useAppStore((s) => buildAnimModel(s).aria);
  const loop = useRef({
    prev: null as AnimModel | null,
    lastSync: 0,
    lastReadout: 0,
    readouts: [] as string[],
    drawnKey: '',
    resumeOnVisible: false,
  });

  useCanvasLoop(
    wrapRef,
    canvasRef,
    ({ ctx, size, colors, dt, now, changed }) => {
      const L = loop.current;
      const st = useAppStore.getState();
      const model = buildAnimModel(st);
      const prev = L.prev;

      // Cambio de datos: en MCUV se reinicia τ; en MCU se conserva la fase.
      if (prev && prev.motionKey !== model.motionKey) {
        let tau = 0;
        if (model.mode === 'MCU' && prev.mode === 'MCU' && prev.motion && model.motion) {
          tau = rebaseTau(prev.motion, model.motion, simClock.tau);
        }
        simClock.set(tau);
        st.syncTau(tau);
        L.lastReadout = 0;
      }
      L.prev = model;

      const m = model.motion;
      if (st.playback.playing && m) {
        let tau = simClock.tau + dt * model.timeScale;
        if (m.tEnd !== null && tau >= m.tEnd) {
          if (st.playback.loop) tau = 0;
          else {
            tau = m.tEnd;
            st.setPlaying(false);
          }
        }
        simClock.set(tau);
        if (now - L.lastSync >= 100) {
          L.lastSync = now;
          st.syncTau(tau);
        }
      }

      if (now - L.lastReadout >= 100) {
        L.lastReadout = now;
        L.readouts = computeReadouts(model, simClock.tau);
      }

      const key = `${model.motionKey}|${simClock.tau}|${L.readouts.join()}`;
      if (!changed && key === L.drawnKey && prev === model) return;
      L.drawnKey = key;
      drawScene(ctx, size, model, simClock.tau, L.readouts, colors);
    },
    (visible) => {
      const st = useAppStore.getState();
      const L = loop.current;
      if (!visible) {
        L.resumeOnVisible = st.playback.playing;
        if (st.playback.playing) st.setPlaying(false);
      } else if (L.resumeOnVisible) {
        L.resumeOnVisible = false;
        st.setPlaying(true);
      }
    },
  );

  return (
    <div ref={wrapRef} className={`${styles.canvasWrap} ${fill ? styles.canvasWrapFill : ''}`}>
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={aria} />
    </div>
  );
}
