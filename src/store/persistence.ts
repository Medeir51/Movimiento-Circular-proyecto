import type { BankedCurveInputs, FlatCurveInputs, OrbitInputs } from '../core/applications/types';
import { UNIT_LISTS, isKnownUnit } from '../core/units';
import {
  KIN_VARS,
  MCUV_FIELDS,
  POINT_KINDS,
  RATE_FIELDS,
  TIME_FIELDS,
  WHEEL_STYLES,
} from '../core/types';
import type {
  AppState,
  DisplayOptions,
  KinVar,
  McuState,
  McuvState,
  Quantity,
  ReferenceSnapshot,
  Settings,
} from '../core/types';

/** Guardado automático en localStorage (19.7) y enlace para compartir (19.8). */

export const STATE_KEY = 'movcirc:v1:state';
export const SETTINGS_KEY = 'movcirc:v1:settings';

/** Parte del estado del simulador que se comparte por enlace. */
export type SharedSim = Pick<AppState, 'mode' | 'geometry' | 'mass' | 'mcu' | 'mcuv'>;

export interface AppsInputs {
  flat: FlatCurveInputs;
  banked: BankedCurveInputs;
  orbit: OrbitInputs;
}

export interface PersistedState {
  v: 1;
  sim: SharedSim & {
    reference: ReferenceSnapshot | null;
    display: DisplayOptions;
    loop: boolean;
    timeScaleOverride: number | null;
  };
  apps: AppsInputs;
  ui: { tab: string; appTab: string; activePreset: string | null; firstVisitDismissed: boolean };
}

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const isBool = (x: unknown): x is boolean => typeof x === 'boolean';
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const oneOf = <T extends string>(x: unknown, list: readonly T[]): x is T =>
  typeof x === 'string' && (list as readonly string[]).includes(x);

function isQuantity(x: unknown, units?: readonly string[]): x is Quantity {
  if (!isObj(x) || typeof x.text !== 'string' || x.text.length > 200) return false;
  if (!isKnownUnit(x.unit)) return false;
  return units ? units.includes(x.unit) : true;
}

const L = UNIT_LISTS;
const RATE_UNITS: Record<string, readonly string[]> = {
  rpm: L.rotationRate,
  f: L.frequency,
  T: L.time,
  omega: L.omegaMcu,
  v: L.velocity,
  ac: L.acceleration,
  Fc: L.force,
};
const TIME_UNITS: Record<string, readonly string[]> = { t: L.time, dtheta: L.angle, s: L.length };
const MCUV_UNITS: Record<string, readonly string[]> = {
  omega0: L.omegaMcuv,
  omegaF: L.omegaMcuv,
  alpha: L.angularAcceleration,
  at: L.acceleration,
  t: L.time,
  dtheta: L.angle,
  s: L.length,
};

function validMcu(x: unknown): x is McuState {
  if (!isObj(x) || !isObj(x.rate) || !isObj(x.time)) return false;
  if (x.rateSource !== null && !oneOf(x.rateSource, RATE_FIELDS)) return false;
  if (x.timeSource !== null && !oneOf(x.timeSource, TIME_FIELDS)) return false;
  if (!oneOf(x.radiusPolicy, ['keepOmega', 'keepV'] as const)) return false;
  const rate = x.rate;
  const time = x.time;
  return (
    RATE_FIELDS.every((f) => isQuantity(rate[f], RATE_UNITS[f])) &&
    TIME_FIELDS.every((f) => isQuantity(time[f], TIME_UNITS[f]))
  );
}

function validKinList(x: unknown, max: number): x is KinVar[] {
  return (
    Array.isArray(x) &&
    x.length <= max &&
    new Set(x).size === x.length &&
    x.every((k) => oneOf(k, KIN_VARS))
  );
}

function validMcuv(x: unknown): x is McuvState {
  if (!isObj(x) || !isObj(x.fields)) return false;
  const fields = x.fields;
  if (!MCUV_FIELDS.every((f) => isQuantity(fields[f], MCUV_UNITS[f]))) return false;
  if (!validKinList(x.knowns, 3) || !validKinList(x.pinned, 3)) return false;
  const knowns = x.knowns;
  if (!x.pinned.every((k) => knowns.includes(k))) return false;
  return (
    oneOf(x.alphaEnteredAs, ['alpha', 'at'] as const) &&
    oneOf(x.dthetaEnteredAs, ['dtheta', 's'] as const)
  );
}

/** Valida la parte compartible del simulador. */
export function validateSharedSim(x: unknown): SharedSim | null {
  if (!isObj(x) || !oneOf(x.mode, ['MCU', 'MCUV'] as const)) return null;
  const g = x.geometry;
  if (!isObj(g) || !isObj(g.point)) return null;
  const point = g.point;
  if (
    !isQuantity(g.radius, L.length) ||
    !oneOf(g.radiusEditedAs, ['r', 'd'] as const) ||
    !oneOf(point.kind, POINT_KINDS) ||
    !isQuantity(point.custom, L.point) ||
    !isQuantity(g.theta0, L.angle) ||
    !oneOf(g.direction, ['ccw', 'cw'] as const) ||
    !oneOf(g.style, WHEEL_STYLES)
  ) {
    return null;
  }
  if (!isQuantity(x.mass, L.mass) || !validMcu(x.mcu) || !validMcuv(x.mcuv)) return null;
  return {
    mode: x.mode,
    geometry: {
      radius: g.radius,
      radiusEditedAs: g.radiusEditedAs,
      point: { kind: point.kind, custom: point.custom },
      theta0: g.theta0,
      direction: g.direction,
      style: g.style,
    },
    mass: x.mass,
    mcu: x.mcu,
    mcuv: x.mcuv,
  };
}

function validDisplay(x: unknown): x is DisplayOptions {
  if (!isObj(x)) return false;
  const keys = [
    'showV',
    'showAc',
    'showAt',
    'showA',
    'showTrail',
    'showAngle',
    'showAxes',
    'lockVectorScale',
  ];
  return keys.every((k) => isBool(x[k]));
}

function validReference(x: unknown): x is ReferenceSnapshot {
  if (x === null) return true;
  if (!isObj(x) || !oneOf(x.mode, ['MCU', 'MCUV'] as const)) return false;
  if (!isNum(x.R) || !isNum(x.rp) || !isObj(x.si) || !isObj(x.inputs)) return false;
  return (
    Object.values(x.si).every((v) => typeof v === 'number') &&
    Object.values(x.inputs).every((v) => v === undefined || typeof v === 'number')
  );
}

export function validateSettings(x: unknown): Settings | null {
  if (!isObj(x)) return null;
  if (!isNum(x.g) || !(x.g > 0) || x.g > 1000) return null;
  if (!isNum(x.sigFigs) || ![3, 4, 5, 6].includes(x.sigFigs)) return null;
  if (!oneOf(x.gPreset, ['9.8', '9.81', '9.80665', 'custom'] as const)) return null;
  if (!oneOf(x.theme, ['light', 'dark', 'system'] as const)) return null;
  if (!oneOf(x.textSize, ['normal', 'large'] as const)) return null;
  if (!oneOf(x.startUnits, ['practical', 'si'] as const)) return null;
  return {
    g: x.g,
    gPreset: x.gPreset,
    sigFigs: x.sigFigs,
    theme: x.theme,
    textSize: x.textSize,
    startUnits: x.startUnits,
  };
}

function validApps(x: unknown): x is AppsInputs {
  if (!isObj(x) || !isObj(x.flat) || !isObj(x.banked) || !isObj(x.orbit)) return false;
  const f = x.flat;
  const b = x.banked;
  const o = x.orbit;
  return (
    isQuantity(f.R, L.length) &&
    isQuantity(f.v, L.velocity) &&
    isQuantity(f.mu, L.dimensionless) &&
    isQuantity(f.m, L.mass) &&
    isQuantity(b.R, L.length) &&
    isQuantity(b.beta, ['deg', 'rad']) &&
    isQuantity(b.mu, L.dimensionless) &&
    isQuantity(b.v, L.velocity) &&
    isQuantity(b.m, L.mass) &&
    oneOf(o.body, ['earth', 'moon', 'mars', 'sun', 'custom'] as const) &&
    oneOf(o.source, ['R', 'h', 'T'] as const) &&
    isQuantity(o.M, L.mass) &&
    isQuantity(o.Rbody, L.length) &&
    isQuantity(o.R, L.length) &&
    isQuantity(o.h, L.length) &&
    isQuantity(o.T, L.time) &&
    isQuantity(o.m, L.mass)
  );
}

/** Lee y valida el estado guardado; null si no existe o no es válido. */
export function parsePersisted(raw: string | null): PersistedState | null {
  if (!raw) return null;
  try {
    const x: unknown = JSON.parse(raw);
    if (!isObj(x) || x.v !== 1 || !isObj(x.sim) || !isObj(x.ui)) return null;
    const shared = validateSharedSim(x.sim);
    const s = x.sim;
    if (!shared || !validDisplay(s.display) || !validReference(s.reference ?? null)) return null;
    if (!isBool(s.loop)) return null;
    const override = s.timeScaleOverride;
    if (override !== null && !(isNum(override) && override > 0)) return null;
    if (!validApps(x.apps)) return null;
    const ui = x.ui;
    return {
      v: 1,
      sim: {
        ...shared,
        reference: (s.reference ?? null) as ReferenceSnapshot | null,
        display: s.display,
        loop: s.loop,
        timeScaleOverride: override as number | null,
      },
      apps: x.apps,
      ui: {
        tab: typeof ui.tab === 'string' ? ui.tab : 'simulator',
        appTab: typeof ui.appTab === 'string' ? ui.appTab : 'flat',
        activePreset: typeof ui.activePreset === 'string' ? ui.activePreset : null,
        firstVisitDismissed: ui.firstVisitDismissed === true,
      },
    };
  } catch {
    return null;
  }
}

export function parseSettings(raw: string | null): Settings | null {
  if (!raw) return null;
  try {
    return validateSettings(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Sin almacenamiento disponible (modo privado, cuota llena): se ignora.
  }
}

export function removeStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Se ignora.
  }
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

/** Codifica la configuración del simulador para el fragmento #s=… */
export function encodeShare(sim: SharedSim): string {
  const compact: SharedSim & { v: 1 } = {
    v: 1,
    mode: sim.mode,
    geometry: sim.geometry,
    mass: sim.mass,
    mcu: sim.mcu,
    mcuv: sim.mcuv,
  };
  return toBase64Url(JSON.stringify(compact));
}

export function decodeShare(encoded: string): SharedSim | null {
  try {
    const x: unknown = JSON.parse(fromBase64Url(encoded));
    if (!isObj(x) || x.v !== 1) return null;
    return validateSharedSim(x);
  } catch {
    return null;
  }
}

export function shareUrl(sim: SharedSim): string {
  const { origin, pathname, search } = window.location;
  return `${origin}${pathname}${search}#s=${encodeShare(sim)}`;
}
