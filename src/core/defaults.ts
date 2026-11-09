import { DEFAULT_G } from './constants';
import type {
  AppState,
  DisplayOptions,
  McuState,
  McuvState,
  Playback,
  Quantity,
  Settings,
  UnitId,
} from './types';

/** Valores por defecto: ajustes, unidades de cada campo y estado vacío. */

export const DEFAULT_SETTINGS: Settings = {
  g: DEFAULT_G,
  gPreset: '9.8',
  sigFigs: 4,
  theme: 'system',
  textSize: 'normal',
  startUnits: 'practical',
};

export const DEFAULT_DISPLAY: DisplayOptions = {
  showV: true,
  showAc: true,
  showAt: true,
  showA: true,
  showTrail: true,
  showAngle: false,
  showAxes: false,
  lockVectorScale: false,
};

export const DEFAULT_PLAYBACK: Playback = {
  playing: true,
  tau: 0,
  loop: true,
  timeScaleOverride: null,
};

export interface DefaultUnits {
  radius: UnitId;
  point: UnitId;
  theta0: UnitId;
  mass: UnitId;
  rpm: UnitId;
  f: UnitId;
  T: UnitId;
  omega: UnitId;
  v: UnitId;
  ac: UnitId;
  Fc: UnitId;
  t: UnitId;
  dtheta: UnitId;
  s: UnitId;
  omega0: UnitId;
  omegaF: UnitId;
  alpha: UnitId;
  at: UnitId;
  mcuvDtheta: UnitId;
  appRadius: UnitId;
  appSpeed: UnitId;
  orbitLength: UnitId;
  orbitPeriod: UnitId;
}

/** Unidades por defecto según el ajuste «Unidades al iniciar». */
export function defaultUnits(kind: Settings['startUnits']): DefaultUnits {
  const si = kind === 'si';
  return {
    radius: si ? 'm' : 'cm',
    point: '%',
    theta0: si ? 'rad' : 'deg',
    mass: 'kg',
    rpm: 'rev/min',
    f: 'Hz',
    T: 's',
    omega: 'rad/s',
    v: 'm/s',
    ac: 'm/s2',
    Fc: 'N',
    t: 's',
    dtheta: si ? 'rad' : 'rev',
    s: 'm',
    omega0: si ? 'rad/s' : 'rpm',
    omegaF: si ? 'rad/s' : 'rpm',
    alpha: 'rad/s2',
    at: 'm/s2',
    mcuvDtheta: si ? 'rad' : 'rev',
    appRadius: 'm',
    appSpeed: si ? 'm/s' : 'km/h',
    orbitLength: si ? 'm' : 'km',
    orbitPeriod: si ? 's' : 'min',
  };
}

const q = (text: string, unit: UnitId): Quantity => ({ text, unit });

export function blankMcu(u: DefaultUnits): McuState {
  return {
    rateSource: null,
    rate: {
      rpm: q('', u.rpm),
      f: q('', u.f),
      T: q('', u.T),
      omega: q('', u.omega),
      v: q('', u.v),
      ac: q('', u.ac),
      Fc: q('', u.Fc),
    },
    timeSource: null,
    time: { t: q('', u.t), dtheta: q('', u.dtheta), s: q('', u.s) },
    radiusPolicy: 'keepOmega',
  };
}

export function blankMcuv(u: DefaultUnits): McuvState {
  return {
    fields: {
      omega0: q('', u.omega0),
      omegaF: q('', u.omegaF),
      alpha: q('', u.alpha),
      at: q('', u.at),
      t: q('', u.t),
      dtheta: q('', u.mcuvDtheta),
      s: q('', u.s),
    },
    knowns: [],
    pinned: [],
    alphaEnteredAs: 'alpha',
    dthetaEnteredAs: 'dtheta',
  };
}

/** Estado sin datos (la rueda de 66 cm vacía), con las unidades de los ajustes. */
export function blankState(settings: Settings = DEFAULT_SETTINGS): AppState {
  const u = defaultUnits(settings.startUnits);
  return {
    mode: 'MCU',
    geometry: {
      radius: q('', u.radius),
      radiusEditedAs: 'd',
      point: { kind: 'rim', custom: q('', u.point) },
      theta0: q('0', u.theta0),
      direction: 'ccw',
      style: 'wheel',
    },
    mass: q('', u.mass),
    mcu: blankMcu(u),
    mcuv: blankMcuv(u),
    reference: null,
    playback: { ...DEFAULT_PLAYBACK },
    display: { ...DEFAULT_DISPLAY },
    settings: { ...settings },
  };
}
