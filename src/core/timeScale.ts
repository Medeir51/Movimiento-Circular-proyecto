import { es, fill } from '../i18n/es';
import { groupDigits } from './numberFormat';

/**
 * Escala de tiempo de la animación (sección 12.4):
 * segundos simulados por cada segundo real.
 */

/** Factores «redondos» 1, 2, 5 × 10ⁿ para n de −4 a 8, en orden creciente. */
export const TIME_SCALE_FACTORS: readonly number[] = (() => {
  const out: number[] = [];
  for (let n = -4; n <= 8; n++) for (const m of [1, 2, 5]) out.push(Number(`${m}e${n}`));
  return out;
})();

const EPS = 1e-12;

/**
 * Factor automático.
 * @param fMaxRevPerSec mayor frecuencia de giro (rev/s) durante la simulación.
 * @param durationSec duración del intervalo (solo MCUV).
 */
export function autoTimeScale(fMaxRevPerSec: number, durationSec?: number): number {
  const list = TIME_SCALE_FACTORS;
  const f = Math.abs(fMaxRevPerSec);
  let factor: number;
  if (!(f > 0) || !Number.isFinite(f)) factor = 1;
  else if (f > 1) {
    const limit = (1 / f) * (1 + EPS);
    const candidates = list.filter((x) => x <= limit);
    factor = candidates.length > 0 ? candidates[candidates.length - 1] : list[0];
  } else if (f < 0.1) {
    const limit = (0.1 / f) * (1 - EPS);
    factor = list.find((x) => x >= limit) ?? list[list.length - 1];
  } else factor = 1;

  if (durationSec !== undefined && durationSec > 0) {
    let i = list.indexOf(factor);
    while (
      durationSec / factor > 60 &&
      i + 1 < list.length &&
      (Number.isFinite(f) ? f : 0) * list[i + 1] <= 1 + EPS
    ) {
      i += 1;
      factor = list[i];
    }
  }
  return factor;
}

/** «Tiempo real», «Cámara lenta ×1/20» o «Acelerado ×500 000». */
export function timeScaleLabel(factor: number): string {
  if (Math.abs(factor - 1) < EPS) return es.canvas.timeReal;
  if (factor < 1) return fill(es.canvas.timeSlow, { n: groupDigits(1 / factor) });
  return fill(es.canvas.timeFast, { n: groupDigits(factor) });
}

/** Etiqueta corta para el selector manual: «×1/20», «×1», «×500 000». */
export function timeScaleOption(factor: number): string {
  if (factor < 1) return `×1/${groupDigits(1 / factor)}`;
  return `×${groupDigits(factor)}`;
}
