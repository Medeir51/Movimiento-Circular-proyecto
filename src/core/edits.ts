import { instantFromMotion } from './kinematics';
import { AXIS_DISABLED, solveMCU } from './mcu';
import { solveMCUV } from './mcuv';
import { formatExact, parseNumber } from './numberFormat';
import { fromSI, toSI } from './units';
import type {
  AppState,
  Direction,
  KinVar,
  McuvField,
  Mode,
  PointKind,
  Quantity,
  RadiusPolicy,
  RateField,
  ReferenceSnapshot,
  SolveResult,
  TimeField,
  UnitId,
  WheelStyle,
} from './types';

/**
 * Transiciones puras del estado del simulador (secciones 9.2, 9.4, 10.1 y 10.2).
 * Cada función recibe un estado y devuelve uno nuevo; no modifica el original.
 */

export function solve(state: AppState): SolveResult {
  return state.mode === 'MCU' ? solveMCU(state, state.settings) : solveMCUV(state, state.settings);
}

const clone = <T>(x: T): T => structuredClone(x);

/** Reescribe un campo con un valor en SI (15 cifras, sin perder precisión). */
function writeSI(q: Quantity, valueSI: number, g: number): void {
  q.text = formatExact(fromSI(valueSI, q.unit, g));
}

function setRateSource(s: AppState, field: RateField, valueSI: number): void {
  writeSI(s.mcu.rate[field], valueSI, s.settings.g);
  s.mcu.rateSource = field;
}

function setTimeSource(s: AppState, field: TimeField, valueSI: number): void {
  writeSI(s.mcu.time[field], valueSI, s.settings.g);
  s.mcu.timeSource = field;
}

const isAxisDisabled = (f: RateField): boolean => (AXIS_DISABLED as readonly string[]).includes(f);

/** Escribir en un campo de rapidez lo convierte en la fuente del grupo (9.2). */
export function editRate(state: AppState, field: RateField, text: string): AppState {
  const next = clone(state);
  next.mcu.rate[field].text = text;
  next.mcu.rateSource = field;
  return next;
}

/** Escribir en t, Δθ o s lo convierte en la fuente del panel D (9.5). */
export function editTime(state: AppState, field: TimeField, text: string): AppState {
  const next = clone(state);
  next.mcu.time[field].text = text;
  next.mcu.timeSource = field;
  return next;
}

/**
 * Aplica un cambio de radio, diámetro o punto respetando la política elegida (9.4)
 * y las restricciones del eje (9.2).
 */
function applyGeometryChange(state: AppState, mutate: (s: AppState) => void): AppState {
  const before = solve(state);
  const next = clone(state);
  const bsi = before.si;
  if (state.mode === 'MCU') {
    const src = next.mcu.rateSource;
    if (src !== null) {
      if (next.mcu.radiusPolicy === 'keepOmega') {
        if (isAxisDisabled(src) && bsi.omega !== undefined) setRateSource(next, 'omega', bsi.omega);
      } else if (src !== 'v' && bsi.v !== undefined && bsi.rp !== undefined && bsi.rp > 0) {
        setRateSource(next, 'v', bsi.v);
      }
    }
  }
  mutate(next);
  if (next.mode === 'MCU') {
    const after = solve(next);
    if (after.si.rp === 0) {
      const src = next.mcu.rateSource;
      if (src !== null && isAxisDisabled(src)) {
        const w = bsi.omega ?? after.si.omega;
        if (w !== undefined) setRateSource(next, 'omega', w);
        else next.mcu.rateSource = null;
      }
      if (next.mcu.timeSource === 's') {
        if (bsi.dtheta !== undefined) setTimeSource(next, 'dtheta', bsi.dtheta);
        else next.mcu.timeSource = null;
      }
    }
  }
  return next;
}

/** Editar el radio o el diámetro (vinculados, con una sola unidad). */
export function editRadius(state: AppState, which: 'r' | 'd', text: string): AppState {
  return applyGeometryChange(state, (s) => {
    s.geometry.radius.text = text;
    s.geometry.radiusEditedAs = which;
  });
}

export function setPointKind(state: AppState, kind: PointKind): AppState {
  if (state.geometry.point.kind === kind) return state;
  const before = solve(state);
  return applyGeometryChange(state, (s) => {
    s.geometry.point.kind = kind;
    const custom = s.geometry.point.custom;
    if (kind === 'custom' && parseNumber(custom.text).status !== 'ok') {
      const { R, rp } = before.si;
      if (R !== undefined && rp !== undefined) {
        if (custom.unit === '%') custom.text = formatExact((rp / R) * 100);
        else writeSI(custom, rp, s.settings.g);
      } else if (custom.unit === '%') custom.text = '100';
    }
  });
}

export function editPointCustom(state: AppState, text: string): AppState {
  return applyGeometryChange(state, (s) => {
    s.geometry.point.custom.text = text;
  });
}

/** Cambiar la masa nunca cambia el movimiento (9.4). */
export function editMass(state: AppState, text: string): AppState {
  const before = solve(state);
  const next = clone(state);
  if (state.mode === 'MCU' && next.mcu.rateSource === 'Fc' && before.si.omega !== undefined) {
    setRateSource(next, 'omega', before.si.omega);
  }
  next.mass.text = text;
  return next;
}

export function editTheta0(state: AppState, text: string): AppState {
  const next = clone(state);
  next.geometry.theta0.text = text;
  return next;
}

export function setDirection(state: AppState, direction: Direction): AppState {
  const next = clone(state);
  next.geometry.direction = direction;
  return next;
}

export function setStyle(state: AppState, style: WheelStyle): AppState {
  const next = clone(state);
  next.geometry.style = style;
  return next;
}

export function setRadiusPolicy(state: AppState, policy: RadiusPolicy): AppState {
  const next = clone(state);
  next.mcu.radiusPolicy = policy;
  return next;
}

/** Identifica cualquier campo con texto y unidad. */
export type FieldPath =
  | { kind: 'radius' }
  | { kind: 'point' }
  | { kind: 'theta0' }
  | { kind: 'mass' }
  | { kind: 'rate'; field: RateField }
  | { kind: 'time'; field: TimeField }
  | { kind: 'mcuv'; field: McuvField };

export function getQuantity(state: AppState, path: FieldPath): Quantity {
  switch (path.kind) {
    case 'radius':
      return state.geometry.radius;
    case 'point':
      return state.geometry.point.custom;
    case 'theta0':
      return state.geometry.theta0;
    case 'mass':
      return state.mass;
    case 'rate':
      return state.mcu.rate[path.field];
    case 'time':
      return state.mcu.time[path.field];
    case 'mcuv':
      return state.mcuv.fields[path.field];
  }
}

/** Variable cinemática a la que corresponde un campo del MCUV. */
export function kinVarOf(field: McuvField): KinVar {
  return field === 'at' ? 'alpha' : field === 's' ? 'dtheta' : field;
}

/** ¿El campo del MCUV es el que el usuario escribió como dato? */
export function isMcuvInput(state: AppState, field: McuvField): boolean {
  const mv = state.mcuv;
  const v = kinVarOf(field);
  if (!mv.knowns.includes(v)) return false;
  if (v === 'alpha') return (field === 'at') === (mv.alphaEnteredAs === 'at');
  if (v === 'dtheta') return (field === 's') === (mv.dthetaEnteredAs === 's');
  return true;
}

/** ¿El campo es un dato (y por tanto su número se convierte al cambiar la unidad)? */
export function isDataField(state: AppState, path: FieldPath): boolean {
  switch (path.kind) {
    case 'radius':
    case 'theta0':
    case 'mass':
      return true;
    case 'point':
      return state.geometry.point.kind === 'custom';
    case 'rate':
      return state.mcu.rateSource === path.field;
    case 'time':
      return state.mcu.timeSource === path.field;
    case 'mcuv':
      return isMcuvInput(state, path.field);
  }
}

/**
 * Cambiar la unidad de un dato convierte el número (66 cm → 0,66 m);
 * cambiar la de un calculado solo cambia cómo se muestra (sección 7).
 */
export function setUnit(state: AppState, path: FieldPath, unit: UnitId): AppState {
  const next = clone(state);
  const q = getQuantity(next, path);
  const oldUnit = q.unit;
  if (oldUnit === unit) return state;
  const g = state.settings.g;
  if (isDataField(state, path)) {
    const p = parseNumber(q.text);
    if (p.status === 'ok') {
      if (path.kind === 'point' && (oldUnit === '%' || unit === '%')) {
        const R = solve(state).si.R;
        if (R !== undefined) {
          const rpSI = oldUnit === '%' ? (R * p.value) / 100 : toSI(p.value, oldUnit, g);
          q.text =
            unit === '%' ? formatExact((rpSI / R) * 100) : formatExact(fromSI(rpSI, unit, g));
        }
      } else {
        q.text = formatExact(fromSI(toSI(p.value, oldUnit, g), unit, g));
      }
    }
  }
  q.unit = unit;
  return next;
}

/** Resultado de editar un campo del MCUV. */
export interface McuvEditResult {
  state: AppState;
  /** Variable que dejó de ser dato (había más de 3). */
  dropped?: KinVar;
  /** La edición se rechazó porque los otros 3 datos tienen alfiler. */
  rejected?: boolean;
}

/** Regla de «3 datos de 5» (10.2). */
export function editMcuv(state: AppState, field: McuvField, text: string): McuvEditResult {
  const v = kinVarOf(field);
  const mv = state.mcuv;
  const next = clone(state);
  const nmv = next.mcuv;
  if (text.trim() === '') {
    nmv.fields[field].text = '';
    if (isMcuvInput(state, field)) {
      nmv.knowns = nmv.knowns.filter((k) => k !== v);
      nmv.pinned = nmv.pinned.filter((k) => k !== v);
    }
    return { state: next };
  }
  const isKnown = mv.knowns.includes(v);
  if (!isKnown && mv.knowns.length >= 3 && mv.knowns.every((k) => mv.pinned.includes(k))) {
    return { state, rejected: true };
  }
  nmv.fields[field].text = text;
  if (field === 'at') nmv.alphaEnteredAs = 'at';
  if (field === 'alpha') nmv.alphaEnteredAs = 'alpha';
  if (field === 's') nmv.dthetaEnteredAs = 's';
  if (field === 'dtheta') nmv.dthetaEnteredAs = 'dtheta';
  const knowns = nmv.knowns.filter((k) => k !== v);
  knowns.push(v);
  let dropped: KinVar | undefined;
  if (knowns.length > 3) {
    const idx = knowns.findIndex((k) => k !== v && !nmv.pinned.includes(k));
    dropped = knowns[idx];
    knowns.splice(idx, 1);
  }
  nmv.knowns = knowns;
  return dropped ? { state: next, dropped } : { state: next };
}

/** Alfiler: fija un campo como dato (con su valor actual) o lo libera. Máximo 3. */
export function togglePin(state: AppState, v: KinVar): McuvEditResult {
  const next = clone(state);
  const nmv = next.mcuv;
  if (nmv.pinned.includes(v)) {
    nmv.pinned = nmv.pinned.filter((k) => k !== v);
    return { state: next };
  }
  if (nmv.pinned.length >= 3) return { state, rejected: true };
  let dropped: KinVar | undefined;
  if (!nmv.knowns.includes(v)) {
    const value = solve(state).si[v];
    if (value === undefined) return { state, rejected: true };
    writeSI(nmv.fields[v], value, state.settings.g);
    if (v === 'alpha') nmv.alphaEnteredAs = 'alpha';
    if (v === 'dtheta') nmv.dthetaEnteredAs = 'dtheta';
    nmv.knowns.push(v);
    if (nmv.knowns.length > 3) {
      const idx = nmv.knowns.findIndex((k) => k !== v && !nmv.pinned.includes(k));
      dropped = nmv.knowns[idx];
      nmv.knowns.splice(idx, 1);
    }
  }
  nmv.pinned.push(v);
  return dropped ? { state: next, dropped } : { state: next };
}

/** Cambio de modo (10.1). `tau` es el instante actual de la animación. */
export function setMode(state: AppState, mode: Mode, tau: number): AppState {
  if (state.mode === mode) return state;
  const before = solve(state);
  const next = clone(state);
  next.mode = mode;
  const g = state.settings.g;
  if (mode === 'MCUV') {
    const mv = next.mcuv;
    for (const k of Object.keys(mv.fields) as McuvField[]) mv.fields[k].text = '';
    mv.knowns = [];
    mv.pinned = [];
    mv.alphaEnteredAs = 'alpha';
    mv.dthetaEnteredAs = 'dtheta';
    const w = before.si.omega;
    if (w !== undefined) {
      mv.fields.omega0.unit = 'rpm';
      writeSI(mv.fields.omega0, w, g);
      mv.knowns.push('omega0');
    }
    const t = before.si.t;
    if (t !== undefined && t > 0) {
      writeSI(mv.fields.t, t, g);
      mv.knowns.push('t');
    }
  } else if (before.motion) {
    const inst = instantFromMotion(before.motion, tau);
    if (inst.omega < 0) next.geometry.direction = state.geometry.direction === 'ccw' ? 'cw' : 'ccw';
    setRateSource(next, 'omega', Math.abs(inst.omega));
  }
  next.playback = { ...next.playback, tau: 0 };
  return next;
}

/** Datos (en SI) con los que se obtuvo un resultado, para la comparación (14). */
export function inputValues(state: AppState, result: SolveResult): Partial<Record<string, number>> {
  const si = result.si;
  const inputs: Partial<Record<string, number>> = { R: si.R, m: si.m };
  if (state.geometry.point.kind !== 'rim') inputs.rp = si.rp;
  if (state.mode === 'MCU') {
    const src = state.mcu.rateSource;
    if (src) inputs[src] = si[src];
    const tsrc = state.mcu.timeSource;
    if (tsrc) inputs[tsrc] = si[tsrc];
  } else {
    for (const k of state.mcuv.knowns) inputs[k] = si[k];
  }
  return inputs;
}

/** Congela los resultados actuales como referencia (14). Devuelve null si no hay resultados. */
export function makeReference(state: AppState, result: SolveResult): ReferenceSnapshot | null {
  if (!result.ok || result.incomplete || result.si.R === undefined || result.si.rp === undefined) {
    return null;
  }
  return {
    mode: state.mode,
    si: { ...result.si },
    R: result.si.R,
    rp: result.si.rp,
    inputs: inputValues(state, result),
  };
}
