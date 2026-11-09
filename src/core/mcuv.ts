import { LIGHT_SPEED, RELATIVISTIC_SPEED, TWO_PI } from './constants';
import { SolveContext, nearlyEqual, pointXY, readGeometry } from './common';
import type { MessageCode } from './messages';
import { buildSteps } from './steps';
import { KIN_VARS } from './types';
import type { AppState, KinVar, Motion, Settings, SolveResult } from './types';

/** Motor de cálculo MCUV (sección 10). */

export type KinValues = Record<KinVar, number>;

export type KinSolution =
  | { ok: true; values: KinValues; warnings: MessageCode[] }
  | { ok: false; code: MessageCode; detail?: string; dthetaMax?: number };

/** Las 10 combinaciones de 3 datos (tabla 10.3), en orden. */
export const COMBINATIONS: readonly (readonly KinVar[])[] = [
  ['omega0', 'omegaF', 't'],
  ['omega0', 'omegaF', 'alpha'],
  ['omega0', 'omegaF', 'dtheta'],
  ['omega0', 'alpha', 't'],
  ['omega0', 'alpha', 'dtheta'],
  ['omega0', 't', 'dtheta'],
  ['omegaF', 'alpha', 't'],
  ['omegaF', 'alpha', 'dtheta'],
  ['omegaF', 't', 'dtheta'],
  ['alpha', 't', 'dtheta'],
];

/** Número de la combinación (1 a 10) para un conjunto de 3 datos; 0 si no es válido. */
export function combinationOf(knowns: readonly KinVar[]): number {
  if (knowns.length !== 3 || new Set(knowns).size !== 3) return 0;
  const idx = COMBINATIONS.findIndex((c) => c.every((k) => knowns.includes(k)));
  return idx + 1;
}

/** Verifica las 3 ecuaciones del MCUV con tolerancia relativa. */
export function verifyKinematics(v: KinValues, tol = 1e-9): boolean {
  const { omega0: w0, omegaF: wf, alpha: a, t, dtheta: d } = v;
  const check = (lhs: number, rhs: number, ...terms: number[]) => {
    const scale = Math.max(Math.abs(lhs), Math.abs(rhs), ...terms.map(Math.abs));
    return Math.abs(lhs - rhs) <= tol * (scale || 1);
  };
  return (
    check(wf, w0 + a * t, w0, a * t) &&
    check(d, w0 * t + 0.5 * a * t * t, w0 * t, 0.5 * a * t * t) &&
    check(wf * wf, w0 * w0 + 2 * a * d, w0 * w0, 2 * a * d)
  );
}

const fail = (
  code: MessageCode,
  extra: { detail?: string; dthetaMax?: number } = {},
): KinSolution => ({
  ok: false,
  code,
  ...extra,
});

/** Resuelve las 2 incógnitas a partir de 3 datos (en SI y con signo relativo al sentido). */
export function solveKinematics(k: Partial<KinValues>, combo: number): KinSolution {
  let w0 = k.omega0 as number;
  let wf = k.omegaF as number;
  let a = k.alpha as number;
  let t = k.t as number;
  let d = k.dtheta as number;
  const warnings: MessageCode[] = [];

  switch (combo) {
    case 1:
      a = (wf - w0) / t;
      d = ((w0 + wf) * t) / 2;
      break;
    case 2:
      if (a === 0) {
        return nearlyEqual(wf, w0) || wf === w0
          ? fail('E-MCUV-INDET', { detail: 'alpha0Same' })
          : fail('E-MCUV-ALPHA0');
      }
      t = (wf - w0) / a;
      if (!(t > 0)) return fail('E-MCUV-NEVER');
      d = (wf * wf - w0 * w0) / (2 * a);
      break;
    case 3:
      if (w0 + wf === 0 || nearlyEqual(w0, -wf)) return fail('E-MCUV-INDET', { detail: 'sumZero' });
      if (d === 0) return fail('E-MCUV-INDET', { detail: 'dthetaZero' });
      a = (wf * wf - w0 * w0) / (2 * d);
      t = (2 * d) / (w0 + wf);
      if (!(t > 0)) return fail('E-MCUV-NEVER');
      break;
    case 4:
      wf = w0 + a * t;
      d = w0 * t + 0.5 * a * t * t;
      break;
    case 5:
      if (a === 0) {
        if (w0 === 0) return fail('E-NOROT');
        t = d / w0;
        if (!(t > 0)) return fail('E-MCUV-NEVER');
        wf = w0;
      } else {
        const disc = w0 * w0 + 2 * a * d;
        if (disc < 0) {
          return a < 0
            ? fail('E-MCUV-STOP', { dthetaMax: (w0 * w0) / (2 * Math.abs(a)) })
            : fail('E-MCUV-NEVER');
        }
        // Fórmula cuadrática estable: ½α·t² + ω0·t − Δθ = 0.
        const q = -0.5 * (w0 + Math.sqrt(disc));
        const roots = q !== 0 ? [(2 * q) / a, -d / q] : [0];
        const positive = roots.filter((x) => x > 0 && Number.isFinite(x));
        if (positive.length === 0) return fail('E-MCUV-NEVER');
        t = Math.min(...positive);
        wf = w0 + a * t;
      }
      break;
    case 6:
      a = (2 * (d - w0 * t)) / (t * t);
      wf = (2 * d) / t - w0;
      break;
    case 7:
      w0 = wf - a * t;
      d = wf * t - 0.5 * a * t * t;
      break;
    case 8:
      if (a === 0) {
        if (wf === 0) return fail('E-NOROT');
        w0 = wf;
        t = d / wf;
        if (!(t > 0)) return fail('E-MCUV-NEVER');
      } else {
        let w0sq = wf * wf - 2 * a * d;
        if (w0sq < 0) {
          const scale = Math.max(wf * wf, Math.abs(2 * a * d));
          if (w0sq < -1e-12 * scale) return fail('E-MCUV-IMPOSSIBLE');
          w0sq = 0;
        }
        w0 = Math.sqrt(w0sq);
        t = (wf - w0) / a;
        if (!(t > 0)) return fail('E-MCUV-NEVER');
      }
      break;
    case 9:
      w0 = (2 * d) / t - wf;
      a = (wf - w0) / t;
      break;
    case 10:
      w0 = d / t - 0.5 * a * t;
      wf = w0 + a * t;
      break;
    default:
      return fail('E-MCUV-IMPOSSIBLE');
  }
  if (w0 < 0) warnings.push('W-W0NEG');
  const values: KinValues = { omega0: w0, omegaF: wf, alpha: a, t, dtheta: d };
  if (!Object.values(values).every(Number.isFinite)) return fail('E-MCUV-IMPOSSIBLE');
  return { ok: true, values, warnings };
}

/** Ángulo (relativo) girado hasta τ: ω0·τ + ½·α·τ². */
export function relAngle(w0: number, a: number, tau: number): number {
  return w0 * tau + 0.5 * a * tau * tau;
}

/** Instante en que la rueda se detiene antes de t, si ocurre (10.5). */
export function stopTime(w0: number, a: number, t: number): number | null {
  if (a === 0) return null;
  const ts = -w0 / a;
  return ts > 0 && ts < t ? ts : null;
}

export function solveMCUV(state: AppState, s: Settings): SolveResult {
  const ctx = new SolveContext(s.g);
  const geo = readGeometry(state, ctx);
  const si = ctx.si;
  const mv = state.mcuv;
  const rp = geo.rp;

  for (const k of [...KIN_VARS, 'at', 's']) ctx.status[k] = 'empty';

  const known: Partial<KinValues> = {};
  let missing = false;
  for (const k of mv.knowns) {
    if (k === 'alpha' && mv.alphaEnteredAs === 'at') {
      const raw = ctx.read('at', mv.fields.at);
      if (raw === 'error') continue;
      ctx.status.at = 'input';
      if (raw === 'empty') missing = true;
      else if (rp === 0) ctx.error('E-AXIS', 'at');
      else if (rp === undefined) missing = true;
      else {
        si.at = raw;
        known.alpha = raw / rp;
      }
    } else if (k === 'dtheta' && mv.dthetaEnteredAs === 's') {
      const raw = ctx.read('s', mv.fields.s);
      if (raw === 'error') continue;
      ctx.status.s = 'input';
      if (raw === 'empty') missing = true;
      else if (rp === 0) ctx.error('E-AXIS', 's');
      else if (rp === undefined) missing = true;
      else {
        si.s = raw;
        known.dtheta = raw / rp;
      }
    } else {
      const raw = ctx.read(k, mv.fields[k]);
      if (raw === 'error') continue;
      ctx.status[k] = 'input';
      if (raw === 'empty') missing = true;
      else if (k === 'omega0' && raw < 0) ctx.error('E-RANGE-W0', k);
      else if (k === 't' && !(raw > 0)) ctx.error('E-RANGE-T', k);
      else known[k] = raw;
    }
  }

  const combination = combinationOf(mv.knowns);
  let motion: Motion | null = null;
  const canSolve =
    combination > 0 && !missing && ctx.errors.length === 0 && Object.keys(known).length === 3;

  if (canSolve) {
    const sol = solveKinematics(known, combination);
    if (!sol.ok) {
      const params: Record<string, string | { value: number; unit: string }> = {};
      if (sol.detail) params.detail = sol.detail;
      if (sol.dthetaMax !== undefined) {
        params.max =
          mv.dthetaEnteredAs === 's' && rp !== undefined
            ? { value: sol.dthetaMax * rp, unit: mv.fields.s.unit }
            : { value: sol.dthetaMax, unit: mv.fields.dtheta.unit };
      }
      ctx.error(sol.code, undefined, Object.keys(params).length ? params : undefined);
    } else {
      const v = sol.values;
      for (const k of KIN_VARS) {
        si[k] = v[k];
        if (ctx.status[k] !== 'input') ctx.status[k] = 'computed';
      }
      if (mv.knowns.includes('alpha') && mv.alphaEnteredAs === 'at') ctx.status.alpha = 'computed';
      if (mv.knowns.includes('dtheta') && mv.dthetaEnteredAs === 's')
        ctx.status.dtheta = 'computed';
      for (const w of sol.warnings) ctx.warn(w);
      si.N = v.dtheta / TWO_PI;
      if (rp !== undefined) {
        if (si.at === undefined) {
          si.at = v.alpha * rp;
          ctx.status.at = rp === 0 ? 'disabled' : 'computed';
        }
        if (si.s === undefined) {
          si.s = v.dtheta * rp;
          ctx.status.s = rp === 0 ? 'disabled' : 'computed';
        }
        const vmax = Math.max(Math.abs(v.omega0), Math.abs(v.omegaF)) * rp;
        if (vmax >= LIGHT_SPEED) ctx.error('E-LIGHT');
        else if (vmax > RELATIVISTIC_SPEED) ctx.warn('W-REL');
      }
      const ts = stopTime(v.omega0, v.alpha, v.t);
      if (ts !== null) {
        si.tStop = ts;
        const a1 = relAngle(v.omega0, v.alpha, ts);
        si.totalAngle = Math.abs(a1) + Math.abs(v.dtheta - a1);
        ctx.warn('W-REV', { tStop: { value: ts, unit: 's' } });
      }
      si.thetaF = geo.theta0 + geo.dirSign * v.dtheta;
      if (rp !== undefined) {
        Object.assign(si, pointXY(rp, si.thetaF));
        si.C = TWO_PI * rp;
      }
      if (rp !== undefined && geo.R !== undefined) {
        motion = {
          omega0: v.omega0,
          alpha: v.alpha,
          tEnd: v.t,
          R: geo.R,
          rp,
          theta0: geo.theta0,
          dirSign: geo.dirSign,
          m: geo.m ?? null,
        };
      }
    }
  } else if (rp !== undefined) {
    si.C = TWO_PI * rp;
  }

  const result: SolveResult = {
    ok: ctx.errors.length === 0,
    mode: 'MCUV',
    incomplete: motion === null,
    si,
    fieldStatus: ctx.status,
    errors: ctx.errors,
    warnings: ctx.warnings,
    steps: [],
    motion,
    combination: combination || undefined,
  };
  result.steps = buildSteps(state, result);
  return result;
}
