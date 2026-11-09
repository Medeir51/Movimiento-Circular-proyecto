import { es } from '../../i18n/es';
import { SolveContext } from '../common';
import { BODIES, GRAV_CONSTANT, SECONDS_PER_DAY, TWO_PI } from '../constants';
import { createFmt } from '../fmt';
import { conversionStep, makeStep } from '../steps';
import { isSIUnit } from '../units';
import type { Step } from '../types';
import type { AppResult, AppSettings, OrbitInputs, OrbitSource } from './types';

/** Órbitas circulares (17.3). */

export interface OrbitNumbers {
  R: number;
  h: number;
  v: number;
  T: number;
  omega: number;
  ac: number;
  F?: number;
  turnsPerDay: number;
}

export type OrbitOutcome =
  { ok: true; values: OrbitNumbers } | { ok: false; code: 'E-ORBIT-INSIDE' };

export function orbit(p: {
  M: number;
  Rbody: number;
  source: OrbitSource;
  value: number;
  m?: number;
}): OrbitOutcome {
  const GM = GRAV_CONSTANT * p.M;
  let R: number;
  if (p.source === 'R') R = p.value;
  else if (p.source === 'h') R = p.Rbody + p.value;
  else R = Math.cbrt((GM * p.value * p.value) / (4 * Math.PI * Math.PI));
  if (!(R > p.Rbody)) return { ok: false, code: 'E-ORBIT-INSIDE' };
  const v = Math.sqrt(GM / R);
  const T = p.source === 'T' ? p.value : TWO_PI * Math.sqrt((R * R * R) / GM);
  const values: OrbitNumbers = {
    R,
    h: R - p.Rbody,
    v,
    T,
    omega: v / R,
    ac: GM / (R * R),
    turnsPerDay: SECONDS_PER_DAY / T,
  };
  if (p.m !== undefined) values.F = (GM * p.m) / (R * R);
  return { ok: true, values };
}

export type OrbitVar = 'M' | 'Rbody' | 'm' | keyof OrbitNumbers;

export function solveOrbit(inp: OrbitInputs, s: AppSettings): AppResult<OrbitVar> {
  const ctx = new SolveContext(s.g);
  const F = createFmt(s.sigFigs, s.g);
  const T = es.steps.titles;
  const values: Partial<Record<OrbitVar, number>> = {};
  const steps: Step[] = [];

  let M: number | undefined;
  let Rbody: number | undefined;
  if (inp.body === 'custom') {
    const Mr = ctx.read('M', inp.M);
    if (typeof Mr === 'number') {
      if (!(Mr > 0)) ctx.error('E-RANGE-NEG', 'M');
      else M = Mr;
    }
    const Rr = ctx.read('Rbody', inp.Rbody);
    if (typeof Rr === 'number') {
      if (!(Rr > 0)) ctx.error('E-RANGE-R', 'Rbody');
      else Rbody = Rr;
    }
  } else {
    M = BODIES[inp.body].M;
    Rbody = BODIES[inp.body].R;
  }
  if (M !== undefined) values.M = M;
  if (Rbody !== undefined) values.Rbody = Rbody;

  for (const k of ['R', 'h', 'T'] as const) ctx.status[k] = 'computed';
  const src = inp.source;
  const raw = ctx.read(src, inp[src]);
  let value: number | undefined;
  if (typeof raw === 'number') {
    ctx.status[src] = 'input';
    if (src === 'R' && !(raw > 0)) ctx.error('E-RANGE-R', 'R');
    else if (src === 'T' && !(raw > 0)) ctx.error('E-RANGE-T', 'T');
    else value = raw;
  } else if (raw === 'empty') ctx.status[src] = 'input';

  const mr = ctx.read('m', inp.m);
  if (typeof mr === 'number') {
    if (mr < 0) ctx.error('E-RANGE-NEG', 'm');
    else values.m = mr;
  }

  if (ctx.errors.length === 0 && value !== undefined && M !== undefined && Rbody !== undefined) {
    const out = orbit({ M, Rbody, source: src, value, m: values.m });
    if (!out.ok) {
      ctx.error(out.code, src);
    } else {
      const o = out.values;
      Object.assign(values, o);
      const GMtex = `${F.nt(GRAV_CONSTANT)} \\times ${F.qt(M, 'kg')}`;
      const GMtext = `${F.n(GRAV_CONSTANT)} × ${F.q(M, 'kg')}`;
      const srcInfo = {
        R: { title: T.convertLength, sym: 'R' },
        h: { title: T.convertHeight, sym: 'h' },
        T: { title: T.convertPeriod, sym: 'T' },
      }[src];
      if (!isSIUnit(inp[src].unit)) {
        steps.push(
          conversionStep(
            {
              id: `conv-${src}`,
              field: src,
              title: srcInfo.title,
              symText: srcInfo.sym,
              symTex: srcInfo.sym,
              valueSI: value,
              unit: inp[src].unit,
            },
            F,
          ),
        );
      }
      if (values.m !== undefined && !isSIUnit(inp.m.unit)) {
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
      if (src === 'h') {
        steps.push(
          makeStep(
            {
              id: 'R',
              title: T.orbitRadius,
              formulaId: 'F28',
              field: 'R',
              formulaTex: 'R = R_{cuerpo} + h',
              formulaText: 'R = R_cuerpo + h',
              subTex: `${F.qt(Rbody, 'm')} + ${F.qt(value, 'm')}`,
              subText: `${F.q(Rbody, 'm')} + ${F.q(value, 'm')}`,
              value: o.R,
              unit: 'm',
              alt: inp.R.unit,
            },
            F,
          ),
        );
      } else {
        if (src === 'T') {
          steps.push(
            makeStep(
              {
                id: 'R',
                title: T.orbitRadiusFromT,
                formulaId: 'F27',
                field: 'R',
                formulaTex: 'R = \\sqrt[3]{\\frac{G\\,M\\,T^2}{4\\pi^2}}',
                formulaText: 'R = ∛(G·M·T²/4π²)',
                subTex: `\\sqrt[3]{\\frac{${GMtex} \\times (${F.qt(value, 's')})^2}{4\\pi^2}}`,
                subText: `∛(${GMtext} × (${F.q(value, 's')})²/(4π²))`,
                value: o.R,
                unit: 'm',
                alt: inp.R.unit,
              },
              F,
            ),
          );
        }
        steps.push(
          makeStep(
            {
              id: 'h',
              title: T.height,
              formulaId: 'F28',
              field: 'h',
              formulaTex: 'h = R - R_{cuerpo}',
              formulaText: 'h = R − R_cuerpo',
              subTex: `${F.qt(o.R, 'm')} - ${F.qt(Rbody, 'm')}`,
              subText: `${F.q(o.R, 'm')} − ${F.q(Rbody, 'm')}`,
              value: o.h,
              unit: 'm',
              alt: inp.h.unit,
            },
            F,
          ),
        );
      }
      const RTex = F.qt(o.R, 'm');
      const RText = F.q(o.R, 'm');
      steps.push(
        makeStep(
          {
            id: 'v',
            title: T.vOrbit,
            formulaId: 'F26',
            formulaTex: 'v = \\sqrt{\\frac{G\\,M}{R}}',
            formulaText: 'v = √(G·M/R)',
            subTex: `\\sqrt{\\frac{${GMtex}}{${RTex}}}`,
            subText: `√(${GMtext}/(${RText}))`,
            value: o.v,
            unit: 'm/s',
            alt: 'km/s',
          },
          F,
        ),
      );
      if (src !== 'T') {
        steps.push(
          makeStep(
            {
              id: 'T',
              title: T.TOrbit,
              formulaId: 'F27',
              field: 'T',
              formulaTex: 'T = 2\\pi\\sqrt{\\frac{R^3}{G\\,M}}',
              formulaText: 'T = 2π·√(R³/(G·M))',
              subTex: `2\\pi\\sqrt{\\frac{(${RTex})^3}{${GMtex}}}`,
              subText: `2π × √((${RText})³/(${GMtext}))`,
              value: o.T,
              unit: 's',
              alt: inp.T.unit,
            },
            F,
          ),
        );
      }
      steps.push(
        makeStep(
          {
            id: 'omega',
            title: T.omega,
            formulaId: 'F10',
            formulaTex: '\\omega = \\frac{v}{R}',
            formulaText: 'ω = v/R',
            subTex: `\\frac{${F.qt(o.v, 'm/s')}}{${RTex}}`,
            subText: `${F.q(o.v, 'm/s')}/(${RText})`,
            value: o.omega,
            unit: 'rad/s',
          },
          F,
        ),
        makeStep(
          {
            id: 'ac',
            title: T.ac,
            formulaId: 'F25',
            formulaTex: 'a_c = \\frac{G\\,M}{R^2}',
            formulaText: 'a_c = G·M/R²',
            subTex: `\\frac{${GMtex}}{(${RTex})^2}`,
            subText: `${GMtext}/(${RText})²`,
            value: o.ac,
            unit: 'm/s2',
          },
          F,
        ),
      );
      if (o.F !== undefined && values.m !== undefined) {
        steps.push(
          makeStep(
            {
              id: 'F',
              title: T.gravity,
              formulaId: 'F25',
              formulaTex: 'F = \\frac{G\\,M\\,m}{R^2}',
              formulaText: 'F = G·M·m/R²',
              subTex: `\\frac{${GMtex} \\times ${F.qt(values.m, 'kg')}}{(${RTex})^2}`,
              subText: `${GMtext} × ${F.q(values.m, 'kg')}/(${RText})²`,
              value: o.F,
              unit: 'N',
            },
            F,
          ),
        );
      }
      steps.push(
        makeStep(
          {
            id: 'turnsPerDay',
            title: T.turnsPerDay,
            formulaTex: 'n = \\frac{86\\,400\\,\\mathrm{s}}{T}',
            formulaText: 'n = 86400 s/T',
            subTex: `\\frac{86\\,400\\,\\mathrm{s}}{${F.qt(o.T, 's')}}`,
            subText: `86400 s/(${F.q(o.T, 's')})`,
            value: o.turnsPerDay,
            unit: 'turns',
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
