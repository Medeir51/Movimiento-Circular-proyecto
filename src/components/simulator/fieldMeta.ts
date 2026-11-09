import { messageText } from '../../core/messages';
import { UNIT_LISTS } from '../../core/units';
import type { McuvField, RateField, SolveResult, TimeField, UnitId } from '../../core/types';

const L = UNIT_LISTS;

export const RATE_UNITS: Record<RateField, readonly UnitId[]> = {
  rpm: L.rotationRate,
  f: L.frequency,
  T: L.time,
  omega: L.omegaMcu,
  v: L.velocity,
  ac: L.acceleration,
  Fc: L.force,
};

export const TIME_UNITS: Record<TimeField, readonly UnitId[]> = {
  t: L.time,
  dtheta: L.angle,
  s: L.length,
};

export const MCUV_UNITS: Record<McuvField, readonly UnitId[]> = {
  omega0: L.omegaMcuv,
  omegaF: L.omegaMcuv,
  alpha: L.angularAcceleration,
  at: L.acceleration,
  t: L.time,
  dtheta: L.angle,
  s: L.length,
};

/** Símbolo del glosario que abre la ventana ⓘ de cada campo. */
export const FIELD_SYMBOL: Record<string, string> = {
  r: 'R',
  d: 'd',
  rp: 'rp',
  theta0: 'theta0',
  m: 'm',
  rpm: 'rpm',
  f: 'f',
  T: 'T',
  omega: 'omega',
  v: 'v',
  ac: 'ac',
  Fc: 'Fc',
  t: 't',
  dtheta: 'dtheta',
  s: 's',
  omega0: 'omega0f',
  omegaF: 'omega0f',
  alpha: 'alpha',
  at: 'at',
};

export function fieldError(
  result: SolveResult,
  field: string,
  sig: number,
  g: number,
): string | null {
  const m = result.errors.find((e) => e.field === field);
  return m ? messageText(m, sig, g) : null;
}
