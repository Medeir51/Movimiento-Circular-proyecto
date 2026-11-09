import { es } from '../../i18n/es';
import { SolveContext } from '../common';
import { createFmt } from '../fmt';
import { conversionStep, makeStep } from '../steps';
import { isSIUnit } from '../units';
import type { Step } from '../types';
import type { AppResult, AppSettings, FlatCurveInputs } from './types';

/** Curva plana con fricción (17.1). */

export interface FlatCurveNumbers {
  vmax: number;
  Fc?: number;
  fmax?: number;
  /** Fracción del agarre disponible que se usa (F_c / f_max). */
  usage?: number;
  skids?: boolean;
}

export function flatCurve(
  p: { R: number; mu: number; m?: number; v?: number },
  g: number,
): FlatCurveNumbers {
  const out: FlatCurveNumbers = { vmax: Math.sqrt(p.mu * g * p.R) };
  if (p.v !== undefined && p.m !== undefined) {
    const Fc = (p.m * p.v * p.v) / p.R;
    const fmax = p.mu * p.m * g;
    out.Fc = Fc;
    out.fmax = fmax;
    out.usage = fmax > 0 ? Fc / fmax : Fc > 0 ? Number.POSITIVE_INFINITY : 0;
    out.skids = Fc > fmax * (1 + 1e-12);
  }
  return out;
}

export type FlatVar = 'R' | 'mu' | 'm' | 'v' | 'vmax' | 'Fc' | 'fmax' | 'usage' | 'skids';

export function solveFlatCurve(inp: FlatCurveInputs, s: AppSettings): AppResult<FlatVar> {
  const ctx = new SolveContext(s.g);
  const F = createFmt(s.sigFigs, s.g);
  const T = es.steps.titles;
  const values: Partial<Record<FlatVar, number>> = {};
  const steps: Step[] = [];

  const R = ctx.read('R', inp.R);
  if (typeof R === 'number') {
    if (!(R > 0)) ctx.error('E-RANGE-R', 'R');
    else values.R = R;
  }
  const mu = ctx.read('mu', inp.mu);
  if (typeof mu === 'number') {
    if (mu < 0 || mu > 2) ctx.error('E-RANGE-MU', 'mu');
    else values.mu = mu;
  }
  const m = ctx.read('m', inp.m);
  if (typeof m === 'number') {
    if (m < 0) ctx.error('E-RANGE-NEG', 'm');
    else values.m = m;
  }
  const v = ctx.read('v', inp.v);
  if (typeof v === 'number') {
    if (v < 0) ctx.error('E-RANGE-NEG', 'v');
    else values.v = v;
  }

  if (ctx.errors.length === 0 && values.R !== undefined && values.mu !== undefined) {
    const num = flatCurve({ R: values.R, mu: values.mu, m: values.m, v: values.v }, s.g);
    values.vmax = num.vmax;
    if (!isSIUnit(inp.R.unit)) {
      steps.push(
        conversionStep(
          {
            id: 'conv-R',
            field: 'R',
            title: T.convertLength,
            symText: 'R',
            symTex: 'R',
            valueSI: values.R,
            unit: inp.R.unit,
          },
          F,
        ),
      );
    }
    if (values.v !== undefined && !isSIUnit(inp.v.unit)) {
      steps.push(
        conversionStep(
          {
            id: 'conv-v',
            field: 'v',
            title: T.convertV,
            symText: 'v',
            symTex: 'v',
            valueSI: values.v,
            unit: inp.v.unit,
          },
          F,
        ),
      );
    }
    if (values.m !== undefined && values.v !== undefined && !isSIUnit(inp.m.unit)) {
      steps.push(
        conversionStep(
          {
            id: 'conv-m',
            field: 'm',
            title: T.convertMass,
            symText: 'm',
            symTex: 'm',
            valueSI: values.m,
            unit: inp.m.unit,
          },
          F,
        ),
      );
    }
    const gTex = F.qt(s.g, 'm/s2');
    const gText = F.q(s.g, 'm/s2');
    steps.push(
      makeStep(
        {
          id: 'vmax',
          title: T.vmax,
          formulaId: 'F22',
          formulaTex: 'v_{max} = \\sqrt{\\mu_s \\, g \\, R}',
          formulaText: 'v_max = √(μ_s·g·R)',
          subTex: `\\sqrt{${F.nt(values.mu)} \\times ${gTex} \\times ${F.qt(values.R, 'm')}}`,
          subText: `√(${F.n(values.mu)} × ${gText} × ${F.q(values.R, 'm')})`,
          value: num.vmax,
          unit: 'm/s',
          alt: 'km/h',
        },
        F,
      ),
    );
    if (
      num.Fc !== undefined &&
      num.fmax !== undefined &&
      values.m !== undefined &&
      values.v !== undefined
    ) {
      values.Fc = num.Fc;
      values.fmax = num.fmax;
      values.usage = num.usage;
      values.skids = num.skids ? 1 : 0;
      steps.push(
        makeStep(
          {
            id: 'Fc',
            title: T.FcNeeded,
            formulaId: 'F12',
            formulaTex: 'F_c = \\frac{m\\,v^2}{R}',
            formulaText: 'F_c = m·v²/R',
            subTex: `\\frac{${F.qt(values.m, 'kg')} \\times (${F.qt(values.v, 'm/s')})^2}{${F.qt(values.R, 'm')}}`,
            subText: `${F.q(values.m, 'kg')} × (${F.q(values.v, 'm/s')})²/(${F.q(values.R, 'm')})`,
            value: num.Fc,
            unit: 'N',
          },
          F,
        ),
        makeStep(
          {
            id: 'fmax',
            title: T.fmax,
            formulaId: 'F22',
            formulaTex: 'f_{max} = \\mu_s \\, m \\, g',
            formulaText: 'f_max = μ_s·m·g',
            subTex: `${F.nt(values.mu)} \\times ${F.qt(values.m, 'kg')} \\times ${gTex}`,
            subText: `${F.n(values.mu)} × ${F.q(values.m, 'kg')} × ${gText}`,
            value: num.fmax,
            unit: 'N',
          },
          F,
        ),
      );
    }
  }
  return {
    ok: ctx.errors.length === 0,
    values,
    fieldStatus: ctx.status,
    errors: ctx.errors,
    warnings: ctx.warnings,
    steps,
  };
}
