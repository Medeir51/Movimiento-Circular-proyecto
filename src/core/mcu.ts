import { LIGHT_SPEED, RELATIVISTIC_SPEED, TWO_PI } from './constants';
import { SolveContext, pointXY, readGeometry } from './common';
import { RATE_SEQUENCES, TIME_SEQUENCES, runChain } from './mcuChain';
import { buildSteps } from './steps';
import { RATE_FIELDS, TIME_FIELDS } from './types';
import type { AppState, Motion, Settings, SolveResult } from './types';

/** Campos que no pueden ser dato cuando el punto está en el eje. */
export const AXIS_DISABLED = ['v', 'ac', 'Fc'] as const;

/** Motor de cálculo MCU (sección 9). */
export function solveMCU(state: AppState, s: Settings): SolveResult {
  const ctx = new SolveContext(s.g);
  const geo = readGeometry(state, ctx);
  const si = ctx.si;
  const { mcu } = state;
  const rp = geo.rp;
  const axis = rp === 0;

  for (const f of RATE_FIELDS) ctx.status[f] = 'empty';
  for (const f of TIME_FIELDS) ctx.status[f] = 'empty';

  // Grupo de rapidez: una sola fuente (9.2 y 9.3).
  const src = mcu.rateSource;
  if (src !== null) {
    const raw = ctx.read(src, mcu.rate[src]);
    if (typeof raw === 'number') {
      ctx.status[src] = 'input';
      if (src === 'T' && !(raw > 0)) ctx.error('E-RANGE-T', src);
      else if (src !== 'T' && raw < 0) ctx.error('E-RANGE-NEG', src);
      else if (axis && (AXIS_DISABLED as readonly string[]).includes(src)) ctx.error('E-AXIS', src);
      else if (src === 'Fc' && !(geo.m !== undefined && geo.m > 0)) ctx.error('E-MASS', src);
      else {
        si[src] = raw;
        runChain(RATE_SEQUENCES[src], si, ctx.status);
      }
    }
  }

  if (si.v !== undefined) {
    if (si.v >= LIGHT_SPEED) ctx.error('E-LIGHT', src ?? undefined);
    else if (si.v > RELATIVISTIC_SPEED) ctx.warn('W-REL');
  }

  // Grupo de tiempo y ángulo (9.5).
  const tsrc = mcu.timeSource;
  if (tsrc !== null) {
    const raw = ctx.read(tsrc, mcu.time[tsrc]);
    if (typeof raw === 'number') {
      ctx.status[tsrc] = 'input';
      if (raw < 0) ctx.error(tsrc === 't' ? 'E-RANGE-T' : 'E-RANGE-NEG', tsrc);
      else if (tsrc === 's' && axis) ctx.error('E-AXIS', 's');
      else {
        si[tsrc] = raw;
        if (tsrc !== 't' && si.omega === 0) ctx.error('E-NOROT', tsrc);
        else runChain(TIME_SEQUENCES[tsrc], si, ctx.status);
      }
    }
  }

  if (si.dtheta !== undefined && ctx.status.dtheta !== 'error') {
    si.N = si.dtheta / TWO_PI;
    si.thetaF = geo.theta0 + geo.dirSign * si.dtheta;
    if (rp !== undefined) Object.assign(si, pointXY(rp, si.thetaF));
  }
  if (rp !== undefined) si.C = TWO_PI * rp;

  if (axis) {
    for (const f of [...AXIS_DISABLED, 's'] as const) {
      if (ctx.status[f] !== 'error') ctx.status[f] = 'disabled';
    }
  }

  let motion: Motion | null = null;
  if (si.omega !== undefined && rp !== undefined && geo.R !== undefined) {
    motion = {
      omega0: si.omega,
      alpha: 0,
      tEnd: null,
      R: geo.R,
      rp,
      theta0: geo.theta0,
      dirSign: geo.dirSign,
      m: geo.m ?? null,
    };
  }

  const result: SolveResult = {
    ok: ctx.errors.length === 0,
    mode: 'MCU',
    incomplete: motion === null,
    si,
    fieldStatus: ctx.status,
    errors: ctx.errors,
    warnings: ctx.warnings,
    steps: [],
    motion,
  };
  result.steps = buildSteps(state, result);
  return result;
}
