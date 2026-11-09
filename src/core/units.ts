import { es } from '../i18n/es';
import { DEFAULT_G } from './constants';
import type { UnitId } from './types';

/**
 * Unidades, factores y conversión (sección 7).
 * Todas las conversiones de la app pasan por toSI y fromSI.
 */

export type Dimension =
  | 'length'
  | 'mass'
  | 'time'
  | 'frequency'
  | 'rotationRate'
  | 'angularVelocity'
  | 'velocity'
  | 'acceleration'
  | 'angularAcceleration'
  | 'angle'
  | 'force'
  | 'ratio'
  | 'count'
  | 'dimensionless';

interface UnitDef {
  dimension: Dimension;
  /** Factor a SI; 'g' significa «el valor de g de los ajustes». */
  factor: number | 'g';
  /** Unidad en KaTeX. */
  tex: string;
}

const DEG = Math.PI / 180;
const RPM = (2 * Math.PI) / 60;

const UNITS: Record<string, UnitDef> = {
  mm: { dimension: 'length', factor: 0.001, tex: '\\mathrm{mm}' },
  cm: { dimension: 'length', factor: 0.01, tex: '\\mathrm{cm}' },
  m: { dimension: 'length', factor: 1, tex: '\\mathrm{m}' },
  km: { dimension: 'length', factor: 1000, tex: '\\mathrm{km}' },
  in: { dimension: 'length', factor: 0.0254, tex: '\\mathrm{in}' },
  gram: { dimension: 'mass', factor: 0.001, tex: '\\mathrm{g}' },
  kg: { dimension: 'mass', factor: 1, tex: '\\mathrm{kg}' },
  t: { dimension: 'mass', factor: 1000, tex: '\\mathrm{t}' },
  ms: { dimension: 'time', factor: 0.001, tex: '\\mathrm{ms}' },
  s: { dimension: 'time', factor: 1, tex: '\\mathrm{s}' },
  min: { dimension: 'time', factor: 60, tex: '\\mathrm{min}' },
  h: { dimension: 'time', factor: 3600, tex: '\\mathrm{h}' },
  d: { dimension: 'time', factor: 86400, tex: '\\mathrm{d}' },
  Hz: { dimension: 'frequency', factor: 1, tex: '\\mathrm{Hz}' },
  /** Campo rpm del MCU: vueltas por minuto, sin conversión. */
  'rev/min': { dimension: 'rotationRate', factor: 1, tex: '\\mathrm{rpm}' },
  'rad/s': { dimension: 'angularVelocity', factor: 1, tex: '\\mathrm{rad/s}' },
  'deg/s': { dimension: 'angularVelocity', factor: DEG, tex: '{}^{\\circ}\\mathrm{/s}' },
  rpm: { dimension: 'angularVelocity', factor: RPM, tex: '\\mathrm{rpm}' },
  'rev/s': { dimension: 'angularVelocity', factor: 2 * Math.PI, tex: '\\mathrm{rev/s}' },
  'cm/s': { dimension: 'velocity', factor: 0.01, tex: '\\mathrm{cm/s}' },
  'm/s': { dimension: 'velocity', factor: 1, tex: '\\mathrm{m/s}' },
  'km/h': { dimension: 'velocity', factor: 1 / 3.6, tex: '\\mathrm{km/h}' },
  'km/s': { dimension: 'velocity', factor: 1000, tex: '\\mathrm{km/s}' },
  'cm/s2': { dimension: 'acceleration', factor: 0.01, tex: '\\mathrm{cm/s^2}' },
  'm/s2': { dimension: 'acceleration', factor: 1, tex: '\\mathrm{m/s^2}' },
  g: { dimension: 'acceleration', factor: 'g', tex: '\\mathrm{g}' },
  'rad/s2': { dimension: 'angularAcceleration', factor: 1, tex: '\\mathrm{rad/s^2}' },
  'deg/s2': { dimension: 'angularAcceleration', factor: DEG, tex: '{}^{\\circ}\\mathrm{/s^2}' },
  'rpm/s': { dimension: 'angularAcceleration', factor: RPM, tex: '\\mathrm{rpm/s}' },
  rad: { dimension: 'angle', factor: 1, tex: '\\mathrm{rad}' },
  deg: { dimension: 'angle', factor: DEG, tex: '^{\\circ}' },
  rev: { dimension: 'angle', factor: 2 * Math.PI, tex: `\\text{ ${es.units.rev.symbol}}` },
  turns: { dimension: 'count', factor: 1, tex: `\\text{ ${es.units.turns.symbol}}` },
  N: { dimension: 'force', factor: 1, tex: '\\mathrm{N}' },
  kN: { dimension: 'force', factor: 1000, tex: '\\mathrm{kN}' },
  '%': { dimension: 'ratio', factor: 0.01, tex: '\\,\\%' },
  one: { dimension: 'dimensionless', factor: 1, tex: '' },
};

/** Listas de unidades por tipo de campo. */
export const UNIT_LISTS = {
  length: ['mm', 'cm', 'm', 'km', 'in'],
  mass: ['gram', 'kg', 't'],
  time: ['ms', 's', 'min', 'h', 'd'],
  frequency: ['Hz'],
  rotationRate: ['rev/min'],
  omegaMcu: ['rad/s', 'deg/s'],
  omegaMcuv: ['rad/s', 'rpm', 'rev/s', 'deg/s'],
  velocity: ['cm/s', 'm/s', 'km/h', 'km/s'],
  acceleration: ['cm/s2', 'm/s2', 'g'],
  angularAcceleration: ['rad/s2', 'deg/s2', 'rpm/s'],
  angle: ['rad', 'deg', 'rev'],
  force: ['N', 'kN'],
  point: ['%', 'mm', 'cm', 'm', 'km', 'in'],
  dimensionless: ['one'],
} as const satisfies Record<string, readonly string[]>;

/** Unidad del SI de cada dimensión (para el paso a paso). */
export const SI_UNIT: Record<Dimension, UnitId> = {
  length: 'm',
  mass: 'kg',
  time: 's',
  frequency: 'Hz',
  rotationRate: 'rev/min',
  angularVelocity: 'rad/s',
  velocity: 'm/s',
  acceleration: 'm/s2',
  angularAcceleration: 'rad/s2',
  angle: 'rad',
  force: 'N',
  ratio: 'one',
  count: 'turns',
  dimensionless: 'one',
};

export function isKnownUnit(unit: unknown): unit is UnitId {
  return typeof unit === 'string' && Object.prototype.hasOwnProperty.call(UNITS, unit);
}

function def(unit: UnitId): UnitDef {
  const d = UNITS[unit];
  if (!d) throw new Error(`Unidad desconocida: ${unit}`);
  return d;
}

export function dimensionOf(unit: UnitId): Dimension {
  return def(unit).dimension;
}

export function siUnitOf(unit: UnitId): UnitId {
  return SI_UNIT[dimensionOf(unit)];
}

/** Factor que multiplica a un valor en `unit` para llevarlo al SI. */
export function factorOf(unit: UnitId, g: number = DEFAULT_G): number {
  const f = def(unit).factor;
  return f === 'g' ? g : f;
}

export function toSI(value: number, unit: UnitId, g: number = DEFAULT_G): number {
  return value * factorOf(unit, g);
}

export function fromSI(valueSI: number, unit: UnitId, g: number = DEFAULT_G): number {
  return valueSI / factorOf(unit, g);
}

export function isSIUnit(unit: UnitId): boolean {
  return factorOf(unit) === 1 && unit !== 'g';
}

export function unitSymbol(unit: UnitId): string {
  const u = (es.units as Record<string, { symbol: string }>)[unit];
  return u ? u.symbol : unit;
}

/** Texto de la opción en el selector de unidad. */
export function unitOptionLabel(unit: UnitId): string {
  const u = (es.units as Record<string, { symbol: string; option?: string }>)[unit];
  if (!u) return unit;
  return u.option ?? u.symbol;
}

export function unitTex(unit: UnitId): string {
  return def(unit).tex;
}

/** Une un número ya formateado con su unidad («12,57 rad/s», «45°»). */
export function joinValueUnit(numberText: string, unit: UnitId): string {
  const symbol = unitSymbol(unit);
  if (symbol === '') return numberText;
  if (unit === 'deg') return `${numberText}°`;
  return `${numberText} ${symbol}`;
}
