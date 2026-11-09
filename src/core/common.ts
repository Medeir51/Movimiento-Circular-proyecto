import { R_MAX } from './constants';
import { makeMessage } from './messages';
import type { Message, MessageCode, MessageParam } from './messages';
import { parseNumber } from './numberFormat';
import { toSI } from './units';
import type { AppState, FieldStatus, Quantity, SiValues } from './types';

/** Acumula valores, estados de campo, errores y advertencias durante un cálculo. */
export class SolveContext {
  readonly si: SiValues = {};
  readonly status: Record<string, FieldStatus> = {};
  readonly errors: Message[] = [];
  readonly warnings: Message[] = [];
  readonly g: number;

  constructor(g: number) {
    this.g = g;
  }

  /** Lee un campo y lo lleva al SI. Si el texto no es válido, registra el error en el campo. */
  read(field: string, q: Quantity): number | 'empty' | 'error' {
    const p = parseNumber(q.text);
    if (p.status === 'empty') return 'empty';
    if (p.status === 'error') {
      this.error(p.code, field);
      return 'error';
    }
    return toSI(p.value, q.unit, this.g);
  }

  error(code: MessageCode, field?: string, params?: Record<string, MessageParam>): void {
    this.errors.push(makeMessage(code, field, params));
    if (field !== undefined) this.status[field] = 'error';
  }

  warn(code: MessageCode, params?: Record<string, MessageParam>): void {
    this.warnings.push(makeMessage(code, undefined, params));
  }
}

export interface GeometryValues {
  R?: number;
  rp?: number;
  theta0: number;
  m?: number;
  dirSign: 1 | -1;
}

/** Lee el radio (o diámetro), el punto de interés, θ0 y la masa. */
export function readGeometry(state: AppState, ctx: SolveContext): GeometryValues {
  const geo = state.geometry;
  const which = geo.radiusEditedAs;
  const other = which === 'r' ? 'd' : 'r';
  let R: number | undefined;
  const raw = ctx.read(which, geo.radius);
  if (raw === 'empty') {
    ctx.status.r = 'empty';
    ctx.status.d = 'empty';
  } else if (raw === 'error') {
    ctx.status[other] = 'empty';
  } else {
    const value = which === 'd' ? raw / 2 : raw;
    if (!(value > 0) || value > R_MAX) {
      ctx.error('E-RANGE-R', which);
      ctx.status[other] = 'empty';
    } else {
      R = value;
      ctx.status[which] = 'input';
      ctx.status[other] = 'computed';
      ctx.si.R = R;
      ctx.si.d = 2 * R;
    }
  }

  let rp: number | undefined;
  const kind = geo.point.kind;
  if (kind === 'custom') {
    ctx.status.rp = 'empty';
    const custom = geo.point.custom;
    const p = parseNumber(custom.text);
    const rangeParams =
      R !== undefined ? { R: { value: R, unit: geo.radius.unit } } : { R: '—' as MessageParam };
    if (p.status === 'error') ctx.error(p.code, 'rp');
    else if (p.status === 'ok') {
      ctx.status.rp = 'input';
      if (custom.unit === '%') {
        if (p.value < 0 || p.value > 100) ctx.error('E-RANGE-RP', 'rp', rangeParams);
        else if (R !== undefined) rp = (R * p.value) / 100;
      } else {
        const value = toSI(p.value, custom.unit, ctx.g);
        if (value < 0 || (R !== undefined && value > R * (1 + 1e-12)))
          ctx.error('E-RANGE-RP', 'rp', rangeParams);
        else if (R !== undefined) rp = Math.min(value, R);
      }
    }
  } else {
    ctx.status.rp = 'computed';
    if (R !== undefined) rp = kind === 'rim' ? R : kind === 'half' ? R / 2 : 0;
  }
  if (rp !== undefined) ctx.si.rp = rp;

  let theta0 = 0;
  const th = ctx.read('theta0', geo.theta0);
  if (typeof th === 'number') {
    theta0 = th;
    ctx.status.theta0 = 'input';
  } else if (th === 'empty') ctx.status.theta0 = 'empty';
  ctx.si.theta0 = theta0;

  let m: number | undefined;
  const mr = ctx.read('m', state.mass);
  if (typeof mr === 'number') {
    if (mr < 0) ctx.error('E-RANGE-NEG', 'm');
    else {
      m = mr;
      ctx.si.m = mr;
      ctx.status.m = 'input';
    }
  } else if (mr === 'empty') ctx.status.m = 'empty';

  return { R, rp, theta0, m, dirSign: geo.direction === 'ccw' ? 1 : -1 };
}

/** Coordenadas del punto; los residuos de redondeo (|x| < 10⁻¹² r) se llevan a 0. */
export function pointXY(rp: number, theta: number): { x: number; y: number } {
  const snap = (v: number) => (Math.abs(v) < 1e-12 * rp ? 0 : v);
  return { x: snap(rp * Math.cos(theta)), y: snap(rp * Math.sin(theta)) };
}

export function nearlyEqual(a: number, b: number, rel = 1e-12): boolean {
  return Math.abs(a - b) <= rel * Math.max(Math.abs(a), Math.abs(b));
}
