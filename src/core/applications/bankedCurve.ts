import { es } from '../../i18n/es';
import { SolveContext } from '../common';
import { createFmt } from '../fmt';
import { conversionStep, makeStep } from '../steps';
import { isSIUnit } from '../units';
import type { Step } from '../types';
import type { AppResult, AppSettings, BankedCurveInputs } from './types';

/** Curva peraltada (17.2). β en radianes. */

export interface BankedCurveNumbers {
  vIdeal: number;
  /** Infinity si no hay rapidez máxima. */
  vMax: number;
  vMin: number;
  /** Mínimo coeficiente necesario a la rapidez v. */
  muMin?: number;
  /** Peralte ideal (rad) para la rapidez v. */
  betaIdeal?: number;
  /** Toma la curva sin deslizarse con μ_s. */
  holds?: boolean;
  Nf?: number;
  /** Fricción necesaria: positiva = hacia abajo de la pendiente (hacia el centro). */
  f?: number;
}

export function bankedCurve(
  p: { R: number; beta: number; mu: number; m?: number; v?: number },
  g: number,
): BankedCurveNumbers {
  const { R, beta, mu } = p;
  const sin = Math.sin(beta);
  const cos = Math.cos(beta);
  const vIdeal = Math.sqrt(R * g * Math.tan(beta));
  const denMax = cos - mu * sin;
  const vMax =
    denMax <= 0 ? Number.POSITIVE_INFINITY : Math.sqrt((R * g * (sin + mu * cos)) / denMax);
  const numMin = sin - mu * cos;
  const vMin = numMin <= 0 ? 0 : Math.sqrt((R * g * numMin) / (cos + mu * sin));
  const out: BankedCurveNumbers = { vIdeal, vMax, vMin };
  if (p.v !== undefined) {
    const a = (p.v * p.v) / R;
    const nPerMass = g * cos + a * sin;
    const fPerMass = a * cos - g * sin;
    out.muMin = Math.abs(fPerMass) / nPerMass;
    out.holds = Math.abs(fPerMass) <= mu * nPerMass * (1 + 1e-12) + 1e-15;
    out.betaIdeal = Math.atan((p.v * p.v) / (R * g));
    if (p.m !== undefined) {
      out.Nf = p.m * nPerMass;
      out.f = p.m * fPerMass;
    }
  }
  return out;
}

export type BankedVar =
  | 'R'
  | 'beta'
  | 'mu'
  | 'm'
  | 'v'
  | 'vIdeal'
  | 'vMax'
  | 'vMin'
  | 'muMin'
  | 'betaIdeal'
  | 'holds'
  | 'Nf'
  | 'f';

export function solveBankedCurve(inp: BankedCurveInputs, s: AppSettings): AppResult<BankedVar> {
  const ctx = new SolveContext(s.g);
  const F = createFmt(s.sigFigs, s.g);
  const T = es.steps.titles;
  const notes = es.steps.notes;
  const values: Partial<Record<BankedVar, number>> = {};
  const steps: Step[] = [];

  const R = ctx.read('R', inp.R);
  if (typeof R === 'number') {
    if (!(R > 0)) ctx.error('E-RANGE-R', 'R');
    else values.R = R;
  }
  const beta = ctx.read('beta', inp.beta);
  if (typeof beta === 'number') {
    if (beta < 0 || beta >= Math.PI / 2 - 1e-12) ctx.error('E-RANGE-BETA', 'beta');
    else values.beta = beta;
  }
  const mu = ctx.read('mu', inp.mu);
  if (typeof mu === 'number') {
    if (mu < 0 || mu > 2) ctx.error('E-RANGE-MU', 'mu');
    else values.mu = mu;
  } else if (mu === 'empty') values.mu = 0;
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

  if (
    ctx.errors.length === 0 &&
    values.R !== undefined &&
    values.beta !== undefined &&
    values.mu !== undefined
  ) {
    const Rv = values.R;
    const b = values.beta;
    const muv = values.mu;
    const num = bankedCurve({ R: Rv, beta: b, mu: muv, m: values.m, v: values.v }, s.g);
    Object.assign(values, { vIdeal: num.vIdeal, vMax: num.vMax, vMin: num.vMin });
    if (!isSIUnit(inp.R.unit)) {
      steps.push(
        conversionStep(
          {
            id: 'conv-R',
            field: 'R',
            title: T.convertLength,
            symText: 'R',
            symTex: 'R',
            valueSI: Rv,
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
    const gTex = F.qt(s.g, 'm/s2');
    const gText = F.q(s.g, 'm/s2');
    const bTex = F.qt(b, 'deg');
    const bText = F.q(b, 'deg');
    const RTex = F.qt(Rv, 'm');
    const RText = F.q(Rv, 'm');
    steps.push(
      makeStep(
        {
          id: 'vIdeal',
          title: T.vIdeal,
          formulaId: 'F23',
          formulaTex: 'v_{ideal} = \\sqrt{R\\,g\\,\\tan\\beta}',
          formulaText: 'v_ideal = √(R·g·tan β)',
          subTex: `\\sqrt{${RTex} \\times ${gTex} \\times \\tan ${bTex}}`,
          subText: `√(${RText} × ${gText} × tan ${bText})`,
          value: num.vIdeal,
          unit: 'm/s',
          alt: 'km/h',
        },
        F,
      ),
    );
    steps.push(
      makeStep(
        {
          id: 'vMax',
          title: T.vmax,
          formulaId: 'F24',
          formulaTex:
            'v_{max} = \\sqrt{\\frac{R\\,g\\,(\\sin\\beta + \\mu_s\\cos\\beta)}{\\cos\\beta - \\mu_s\\sin\\beta}}',
          formulaText: 'v_max = √(R·g·(sin β + μ_s cos β)/(cos β − μ_s sin β))',
          subTex: `\\sqrt{\\frac{${RTex} \\times ${gTex} \\times (\\sin ${bTex} + ${F.nt(muv)}\\cos ${bTex})}{\\cos ${bTex} - ${F.nt(muv)}\\sin ${bTex}}}`,
          subText: `√(${RText} × ${gText} × (sin ${bText} + ${F.n(muv)}·cos ${bText})/(cos ${bText} − ${F.n(muv)}·sin ${bText}))`,
          value: num.vMax,
          unit: 'm/s',
          alt: 'km/h',
          note: Number.isFinite(num.vMax) ? undefined : notes.noVmax,
        },
        F,
      ),
      makeStep(
        {
          id: 'vMin',
          title: T.vMin,
          formulaId: 'F24',
          formulaTex:
            'v_{min} = \\sqrt{\\frac{R\\,g\\,(\\sin\\beta - \\mu_s\\cos\\beta)}{\\cos\\beta + \\mu_s\\sin\\beta}}',
          formulaText: 'v_min = √(R·g·(sin β − μ_s cos β)/(cos β + μ_s sin β))',
          subTex: `\\sqrt{\\frac{${RTex} \\times ${gTex} \\times (\\sin ${bTex} - ${F.nt(muv)}\\cos ${bTex})}{\\cos ${bTex} + ${F.nt(muv)}\\sin ${bTex}}}`,
          subText: `√(${RText} × ${gText} × (sin ${bText} − ${F.n(muv)}·cos ${bText})/(cos ${bText} + ${F.n(muv)}·sin ${bText}))`,
          value: num.vMin,
          unit: 'm/s',
          alt: 'km/h',
          note: num.vMin === 0 ? notes.noVmin : undefined,
        },
        F,
      ),
    );
    if (values.v !== undefined && num.muMin !== undefined && num.betaIdeal !== undefined) {
      values.muMin = num.muMin;
      values.betaIdeal = num.betaIdeal;
      values.holds = num.holds ? 1 : 0;
      const vTex = F.qt(values.v, 'm/s');
      const vText = F.q(values.v, 'm/s');
      if (num.Nf !== undefined && num.f !== undefined && values.m !== undefined) {
        values.Nf = num.Nf;
        values.f = num.f;
        const mTex = F.qt(values.m, 'kg');
        const mText = F.q(values.m, 'kg');
        steps.push(
          makeStep(
            {
              id: 'Nf',
              title: T.normal,
              formulaTex: 'N_f = m\\left(g\\cos\\beta + \\frac{v^2}{R}\\sin\\beta\\right)',
              formulaText: 'N_f = m·(g·cos β + (v²/R)·sin β)',
              subTex: `${mTex} \\left(${gTex}\\cos ${bTex} + \\frac{(${vTex})^2}{${RTex}}\\sin ${bTex}\\right)`,
              subText: `${mText} × (${gText} × cos ${bText} + (${vText})²/(${RText}) × sin ${bText})`,
              value: num.Nf,
              unit: 'N',
            },
            F,
          ),
          makeStep(
            {
              id: 'f',
              title: T.friction,
              formulaTex: 'f = m\\left(\\frac{v^2}{R}\\cos\\beta - g\\sin\\beta\\right)',
              formulaText: 'f = m·((v²/R)·cos β − g·sin β)',
              subTex: `${mTex} \\left(\\frac{(${vTex})^2}{${RTex}}\\cos ${bTex} - ${gTex}\\sin ${bTex}\\right)`,
              subText: `${mText} × ((${vText})²/(${RText}) × cos ${bText} − ${gText} × sin ${bText})`,
              value: num.f,
              unit: 'N',
            },
            F,
          ),
          makeStep(
            {
              id: 'muMin',
              title: T.muMin,
              formulaTex: '\\mu_{min} = \\frac{|f|}{N_f}',
              formulaText: 'μ_min = |f|/N_f',
              subTex: `\\frac{${F.qt(Math.abs(num.f), 'N')}}{${F.qt(num.Nf, 'N')}}`,
              subText: `${F.q(Math.abs(num.f), 'N')}/(${F.q(num.Nf, 'N')})`,
              value: num.muMin,
              unit: 'one',
            },
            F,
          ),
        );
      }
      steps.push(
        makeStep(
          {
            id: 'betaIdeal',
            title: T.betaIdeal,
            formulaId: 'F23',
            formulaTex: '\\beta = \\arctan\\frac{v^2}{R\\,g}',
            formulaText: 'β = atan(v²/(R·g))',
            subTex: `\\arctan\\frac{(${vTex})^2}{${RTex} \\times ${gTex}}`,
            subText: `atan((${vText})²/(${RText} × ${gText}))`,
            value: num.betaIdeal,
            unit: 'deg',
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
