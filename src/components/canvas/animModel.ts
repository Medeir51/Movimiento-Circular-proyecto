import { es, fill } from '../../i18n/es';
import { TWO_PI } from '../../core/constants';
import { formatNumber, formatQuantity } from '../../core/numberFormat';
import { autoTimeScale } from '../../core/timeScale';
import type {
  DisplayOptions,
  Mode,
  Motion,
  SolveResult,
  UnitId,
  WheelStyle,
} from '../../core/types';
import { selectView } from '../../store/selectors';
import type { StoreState } from '../../store/useAppStore';

/** Datos que necesita el lienzo para dibujar (se recalculan solo cuando cambian los datos). */
export interface AnimModel {
  result: SolveResult;
  mode: Mode;
  motion: Motion | null;
  /** Identifica el movimiento para detectar cambios de datos. */
  motionKey: string;
  message: string | null;
  style: WheelStyle;
  R: number | null;
  refR: number | null;
  display: DisplayOptions;
  autoScale: number;
  timeScale: number;
  manual: boolean;
  strobe: boolean;
  fMax: number;
  /** Escalas de vectores normalizadas: píxeles = k · R_dibujado · valor. */
  kv: number;
  ka: number;
  sig: number;
  radiusUnit: UnitId;
  diameterLabel: string | null;
  tStop: number | null;
  sliderMax: number;
  aria: string;
}

/** Escalas que se conservan mientras «Fijar escala de vectores» está activo. */
let locked: { kv: number; ka: number } | null = null;
let memo: { key: unknown[]; model: AnimModel } | null = null;

function motionKeyOf(mode: Mode, m: Motion | null): string {
  if (!m) return `${mode}:none`;
  return [mode, m.omega0, m.alpha, m.tEnd, m.R, m.rp, m.theta0, m.dirSign].join('|');
}

export function buildAnimModel(s: StoreState): AnimModel {
  const view = selectView(s);
  const key = [
    view.shown,
    s.geometry.style,
    s.display,
    s.reference,
    s.playback.timeScaleOverride,
    s.settings.sigFigs,
    s.geometry.radius.unit,
    s.geometry.direction,
  ];
  if (memo && key.every((k, i) => k === memo?.key[i])) return memo.model;

  const r = view.shown;
  const m = r.motion;
  const mode = r.mode;
  const R = r.si.R ?? null;
  const sig = s.settings.sigFigs;

  let wMax = 0;
  let aMaxRim = 0;
  if (m) {
    const wf = m.tEnd !== null ? m.omega0 + m.alpha * m.tEnd : m.omega0;
    wMax = Math.max(Math.abs(m.omega0), Math.abs(wf));
    aMaxRim = m.R * Math.sqrt(wMax ** 4 + m.alpha ** 2);
  }
  const fMax = wMax / TWO_PI;
  const autoScale = autoTimeScale(fMax, mode === 'MCUV' && m?.tEnd != null ? m.tEnd : undefined);
  const override = s.playback.timeScaleOverride;
  const timeScale = override ?? autoScale;
  const strobe = override !== null && fMax * override > 1;

  let kv = m && wMax > 0 ? 0.45 / (wMax * m.R) : 0;
  let ka = m && aMaxRim > 0 ? 0.45 / aMaxRim : 0;
  if (s.display.lockVectorScale) {
    if (!locked) locked = { kv, ka };
    kv = locked.kv || kv;
    ka = locked.ka || ka;
  } else locked = null;

  let message: string | null = null;
  if (!m) message = mode === 'MCUV' ? es.simulator.kinPrompt : es.canvas.noData;

  const T = r.si.T;
  const t = r.si.t;
  let sliderMax: number;
  if (mode === 'MCUV') sliderMax = m?.tEnd ?? 1;
  else {
    const twoT = T !== undefined && Number.isFinite(T) ? 2 * T : 0;
    sliderMax = Math.max(t ?? 0, twoT) || 10;
  }

  const diameterLabel =
    R !== null
      ? fill(es.canvas.diameter, { value: formatQuantity(2 * R, s.geometry.radius.unit, sig) })
      : null;

  let aria: string = es.simulator.canvasLabelEmpty;
  if (R !== null && m) {
    const d = formatQuantity(2 * R, s.geometry.radius.unit, sig);
    const rpm0 = (Math.abs(m.omega0) * 60) / TWO_PI;
    let rate = `${formatNumber(rpm0, sig)} rpm`;
    if (m.tEnd !== null) {
      const rpmF = (Math.abs(m.omega0 + m.alpha * m.tEnd) * 60) / TWO_PI;
      rate = `${formatNumber(rpm0, sig)} → ${formatNumber(rpmF, sig)} rpm`;
    }
    aria = fill(es.simulator.canvasLabel, {
      d,
      rate,
      dir: m.dirSign === 1 ? es.simulator.ccw.toLowerCase() : es.simulator.cw.toLowerCase(),
    });
  }

  const model: AnimModel = {
    result: r,
    mode,
    motion: m,
    motionKey: motionKeyOf(mode, m),
    message,
    style: s.geometry.style,
    R,
    refR: s.reference ? s.reference.R : null,
    display: s.display,
    autoScale,
    timeScale,
    manual: override !== null,
    strobe,
    fMax,
    kv,
    ka,
    sig,
    radiusUnit: s.geometry.radius.unit,
    diameterLabel,
    tStop: r.si.tStop ?? null,
    sliderMax,
    aria,
  };
  memo = { key, model };
  return model;
}
