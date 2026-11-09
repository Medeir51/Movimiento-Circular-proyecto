import { es } from '../i18n/es';
import { createFmt } from './fmt';
import type { Fmt } from './fmt';
import { RATE_SEQUENCES, TIME_SEQUENCES, turnsFromDtheta } from './mcuChain';
import type { Derivation, RadiusSymbol } from './mcuChain';
import { formatNumber, texNumber } from './numberFormat';
import { fromSI, isSIUnit, joinValueUnit, siUnitOf, unitTex } from './units';
import type { AppState, KinVar, PointKind, SiValues, SolveResult, Step, UnitId } from './types';

/** Construcción del paso a paso (sección 11). */

const T = es.steps.titles;

export interface StepSpec {
  id: string;
  title: string;
  formulaId?: string;
  field?: string;
  formulaTex: string;
  formulaText: string;
  subTex?: string;
  subText?: string;
  /** Resultado en SI. */
  value: number;
  /** Unidad en que se muestra el resultado. */
  unit: UnitId;
  /** Unidad elegida por el usuario para ese campo (se muestra aparte si es distinta). */
  alt?: UnitId;
  note?: string;
}

export function makeStep(s: StepSpec, F: Fmt): Step {
  const step: Step = {
    id: s.id,
    title: s.title,
    formulaTex: s.formulaTex,
    substitutionTex: s.subTex ?? '',
    result: { value: s.value, unit: s.unit },
    formulaText: s.formulaText,
    substitutionText: s.subText ?? '',
    resultText: F.q(s.value, s.unit),
    resultTex: F.qt(s.value, s.unit),
  };
  if (s.formulaId) step.formulaId = s.formulaId;
  if (s.field) step.field = s.field;
  if (s.note) step.note = s.note;
  if (s.alt && s.alt !== s.unit && Number.isFinite(s.value)) step.altText = F.q(s.value, s.alt);
  return step;
}

/** Línea de texto plano: «3. Frecuencia: f = rpm/60 = 120/60 = 2 Hz». */
export function stepLine(step: Step, index: number): string {
  const sub = step.substitutionText ? ` = ${step.substitutionText}` : '';
  return `${index + 1}. ${step.title}: ${step.formulaText}${sub} = ${step.resultText}`;
}

export function stepsToText(steps: Step[]): string {
  return steps.map(stepLine).join('\n');
}

/** «1 m» → 1\,\mathrm{m}; «180°» → 180^{\circ}; «2π rad» → 2\pi\,\mathrm{rad}. */
function tokenTex(s: string): string {
  const m = /^(\S+?)(°)?(?:\s+(.+))?$/.exec(s);
  if (!m) return s;
  const num = m[1].replace(/π/g, '\\pi ').replace(/,/g, '{,}').trim();
  if (m[2]) return `${num}^{\\circ}`;
  if (!m[3]) return num;
  return `${num}\\,\\mathrm{${m[3].replace(/²/g, '^2')}}`;
}

/** Valor ya expresado en `unit` (no en SI), en KaTeX. */
export function texValueUnit(value: number, unit: UnitId, sig: number): string {
  const n = texNumber(value, sig);
  const u = unitTex(unit);
  if (u === '') return n;
  if (unit === 'deg') return `${n}${u}`;
  return `${n}\\,${u}`;
}

/** Paso de conversión: «d = 66 cm × (1 m / 100 cm) = 0,66 m». */
export function conversionStep(
  opts: {
    id: string;
    field?: string;
    title: string;
    symText: string;
    symTex: string;
    valueSI: number;
    unit: UnitId;
  },
  F: Fmt,
): Step {
  const value = fromSI(opts.valueSI, opts.unit, F.g);
  const gText = formatNumber(F.g, 6);
  const factors = (es.conversions[opts.unit] ?? []).map(
    ([a, b]) => [a.replace('{g}', gText), b.replace('{g}', gText)] as const,
  );
  const facText = factors.map(([a, b]) => `(${a} / ${b})`).join(' × ');
  const facTex = factors
    .map(([a, b]) => `\\frac{${tokenTex(a)}}{${tokenTex(b)}}`)
    .join(' \\times ');
  return makeStep(
    {
      id: opts.id,
      title: opts.title,
      field: opts.field,
      formulaId: opts.unit === 'rpm' ? 'F08' : opts.unit === 'rev' ? 'F19' : undefined,
      formulaTex: `${opts.symTex} = ${texValueUnit(value, opts.unit, F.sig)} \\times ${facTex}`,
      formulaText: `${opts.symText} = ${joinValueUnit(F.n(value), opts.unit)} × ${facText}`,
      value: opts.valueSI,
      unit: siUnitOf(opts.unit),
    },
    F,
  );
}

export function radiusSymbol(kind: PointKind): RadiusSymbol {
  return kind === 'rim' ? { text: 'r', tex: 'r' } : { text: 'r_p', tex: 'r_p' };
}

export function derivationStep(
  d: Derivation,
  si: SiValues,
  F: Fmt,
  r: RadiusSymbol,
  alt?: UnitId,
): Step {
  return makeStep(
    {
      id: d.key,
      title: T[d.title],
      formulaId: d.formulaId,
      field: d.target,
      formulaTex: d.tex(r),
      formulaText: d.text(r),
      subTex: d.subTex(si, F),
      subText: d.subText(si, F),
      value: si[d.target] as number,
      unit: d.unit,
      alt,
    },
    F,
  );
}

/** Pasos comunes de geometría: conversión del radio, r = d/2 y radio del punto. */
function geometrySteps(
  state: AppState,
  si: SiValues,
  F: Fmt,
): { conversions: Step[]; derived: Step[] } {
  const geo = state.geometry;
  const conversions: Step[] = [];
  const derived: Step[] = [];
  if (si.R === undefined) return { conversions, derived };
  const which = geo.radiusEditedAs;
  const unit = geo.radius.unit;
  if (!isSIUnit(unit)) {
    conversions.push(
      conversionStep(
        {
          id: `conv-${which}`,
          field: which,
          title: which === 'd' ? T.convertDiameter : T.convertRadius,
          symText: which,
          symTex: which,
          valueSI: which === 'd' ? 2 * si.R : si.R,
          unit,
        },
        F,
      ),
    );
  }
  if (which === 'd') {
    derived.push(
      makeStep(
        {
          id: 'r',
          title: T.radius,
          formulaId: 'F01',
          field: 'r',
          formulaTex: 'r = \\frac{d}{2}',
          formulaText: 'r = d/2',
          subTex: `\\frac{${F.qt(2 * si.R, 'm')}}{2}`,
          subText: `${F.q(2 * si.R, 'm')} / 2`,
          value: si.R,
          unit: 'm',
          alt: unit,
        },
        F,
      ),
    );
  }
  const kind = geo.point.kind;
  if (si.rp !== undefined) {
    if (kind === 'half') {
      derived.push(
        makeStep(
          {
            id: 'rp',
            title: T.pointHalf,
            formulaTex: 'r_p = \\frac{R}{2}',
            formulaText: 'r_p = R/2',
            subTex: `\\frac{${F.qt(si.R, 'm')}}{2}`,
            subText: `${F.q(si.R, 'm')} / 2`,
            value: si.rp,
            unit: 'm',
          },
          F,
        ),
      );
    } else if (kind === 'axis') {
      derived.push(
        makeStep(
          {
            id: 'rp',
            title: T.pointAxis,
            formulaTex: 'r_p',
            formulaText: 'r_p',
            value: 0,
            unit: 'm',
            note: es.steps.notes.axis,
          },
          F,
        ),
      );
    } else if (kind === 'custom') {
      const cu = geo.point.custom.unit;
      if (cu === '%') {
        const pct = (si.rp / si.R) * 100;
        derived.push(
          makeStep(
            {
              id: 'rp',
              title: T.pointPercent,
              field: 'rp',
              formulaTex: 'r_p = \\frac{p}{100} \\cdot R',
              formulaText: 'r_p = (p/100)·R',
              subTex: `\\frac{${F.nt(pct)}}{100} \\times ${F.qt(si.R, 'm')}`,
              subText: `(${F.n(pct)}/100) × ${F.q(si.R, 'm')}`,
              value: si.rp,
              unit: 'm',
            },
            F,
          ),
        );
      } else if (!isSIUnit(cu)) {
        conversions.push(
          conversionStep(
            {
              id: 'conv-rp',
              field: 'rp',
              title: T.convertPoint,
              symText: 'r_p',
              symTex: 'r_p',
              valueSI: si.rp,
              unit: cu,
            },
            F,
          ),
        );
      }
    }
  }
  return { conversions, derived };
}

function massConversion(state: AppState, si: SiValues, F: Fmt): Step[] {
  if (si.m === undefined || isSIUnit(state.mass.unit)) return [];
  return [
    conversionStep(
      {
        id: 'conv-m',
        field: 'm',
        title: T.convertMass,
        symText: 'm',
        symTex: 'm',
        valueSI: si.m,
        unit: state.mass.unit,
      },
      F,
    ),
  ];
}

const RATE_CONVERSION: Record<string, { title: string; sym: string; tex: string }> = {
  T: { title: T.convertPeriod, sym: 'T', tex: 'T' },
  omega: { title: T.convertOmega, sym: 'ω', tex: '\\omega' },
  v: { title: T.convertV, sym: 'v', tex: 'v' },
  ac: { title: T.convertAc, sym: 'a_c', tex: 'a_c' },
  Fc: { title: T.convertFc, sym: 'F_c', tex: 'F_c' },
  t: { title: T.convertTime, sym: 't', tex: 't' },
  dtheta: { title: T.convertAngle, sym: 'Δθ', tex: '\\Delta\\theta' },
  s: { title: T.convertArc, sym: 's', tex: 's' },
  omega0: { title: T.convertOmega0, sym: 'ω0', tex: '\\omega_0' },
  omegaF: { title: T.convertOmegaF, sym: 'ω_f', tex: '\\omega_f' },
  alpha: { title: T.convertAlpha, sym: 'α', tex: '\\alpha' },
  at: { title: T.convertAt, sym: 'a_t', tex: 'a_t' },
};

function fieldConversion(field: string, valueSI: number | undefined, unit: UnitId, F: Fmt): Step[] {
  const info = RATE_CONVERSION[field];
  if (valueSI === undefined || !info || isSIUnit(unit)) return [];
  return [
    conversionStep(
      {
        id: `conv-${field}`,
        field,
        title: info.title,
        symText: info.sym,
        symTex: info.tex,
        valueSI,
        unit,
      },
      F,
    ),
  ];
}

function buildMcuSteps(state: AppState, result: SolveResult): Step[] {
  const F = createFmt(state.settings.sigFigs, state.settings.g);
  const si = result.si;
  const { mcu } = state;
  const r = radiusSymbol(state.geometry.point.kind);
  const geo = geometrySteps(state, si, F);
  const steps: Step[] = [...geo.conversions];
  const src = mcu.rateSource;
  const srcOk = src !== null && si[src] !== undefined && result.fieldStatus[src] === 'input';
  if (srcOk) {
    const usesMass = si.Fc !== undefined || src === 'Fc';
    if (usesMass) steps.push(...massConversion(state, si, F));
    steps.push(...fieldConversion(src, si[src], mcu.rate[src].unit, F));
  }
  const tsrc = mcu.timeSource;
  const tsrcOk = tsrc !== null && si[tsrc] !== undefined && result.fieldStatus[tsrc] === 'input';
  if (tsrcOk) steps.push(...fieldConversion(tsrc, si[tsrc], mcu.time[tsrc].unit, F));
  steps.push(...geo.derived);
  if (srcOk) {
    for (const d of RATE_SEQUENCES[src]) {
      if (si[d.target] === undefined || !d.needs.every((k) => si[k] !== undefined)) continue;
      steps.push(derivationStep(d, si, F, r, mcu.rate[d.target as keyof typeof mcu.rate]?.unit));
    }
  }
  if (tsrcOk && si.omega !== undefined) {
    for (const d of TIME_SEQUENCES[tsrc]) {
      if (si[d.target] === undefined || !d.needs.every((k) => si[k] !== undefined)) continue;
      steps.push(derivationStep(d, si, F, r, mcu.time[d.target as keyof typeof mcu.time]?.unit));
    }
    if (si.N !== undefined) steps.push(derivationStep(turnsFromDtheta, si, F, r));
  }
  return steps;
}

/** Valor en texto entre paréntesis si es negativo (para sustituir en restas). */
function paren(text: string, x: number): string {
  return x < 0 ? `(${text})` : text;
}

function buildMcuvSteps(state: AppState, result: SolveResult): Step[] {
  const F = createFmt(state.settings.sigFigs, state.settings.g);
  const si = result.si;
  const mv = state.mcuv;
  const r = radiusSymbol(state.geometry.point.kind);
  const geo = geometrySteps(state, si, F);
  const steps: Step[] = [...geo.conversions];
  const alt = (k: string): UnitId | undefined => mv.fields[k as KinVar]?.unit;

  for (const k of mv.knowns) {
    if (k === 'alpha' && mv.alphaEnteredAs === 'at') {
      if (result.fieldStatus.at === 'input')
        steps.push(...fieldConversion('at', si.at, mv.fields.at.unit, F));
    } else if (k === 'dtheta' && mv.dthetaEnteredAs === 's') {
      if (result.fieldStatus.s === 'input')
        steps.push(...fieldConversion('s', si.s, mv.fields.s.unit, F));
    } else if (result.fieldStatus[k] === 'input' && si[k] !== undefined) {
      steps.push(...fieldConversion(k, si[k], mv.fields[k].unit, F));
    }
  }
  steps.push(...massConversion(state, si, F));
  steps.push(...geo.derived);

  const solved = (['omega0', 'omegaF', 'alpha', 't', 'dtheta'] as const).every(
    (k) => si[k] !== undefined,
  );
  if (mv.knowns.includes('alpha') && mv.alphaEnteredAs === 'at' && si.at !== undefined && si.rp) {
    steps.push(
      makeStep(
        {
          id: 'alpha-from-at',
          title: T.alpha,
          formulaId: 'F13',
          field: 'alpha',
          formulaTex: `\\alpha = \\frac{a_t}{${r.tex}}`,
          formulaText: `α = a_t/${r.text}`,
          subTex: `\\frac{${F.qt(si.at, 'm/s2')}}{${F.qt(si.rp, 'm')}}`,
          subText: `${F.q(si.at, 'm/s2')}/(${F.q(si.rp, 'm')})`,
          value: si.at / si.rp,
          unit: 'rad/s2',
          alt: alt('alpha'),
        },
        F,
      ),
    );
  }
  if (mv.knowns.includes('dtheta') && mv.dthetaEnteredAs === 's' && si.s !== undefined && si.rp) {
    steps.push(
      makeStep(
        {
          id: 'dtheta-from-s',
          title: T.dtheta,
          formulaId: 'F03',
          field: 'dtheta',
          formulaTex: `\\Delta\\theta = \\frac{s}{${r.tex}}`,
          formulaText: `Δθ = s/${r.text}`,
          subTex: `\\frac{${F.qt(si.s, 'm')}}{${F.qt(si.rp, 'm')}}`,
          subText: `${F.q(si.s, 'm')}/(${F.q(si.rp, 'm')})`,
          value: si.s / si.rp,
          unit: 'rad',
          alt: alt('dtheta'),
        },
        F,
      ),
    );
  }
  if (!solved || result.combination === undefined) return steps;

  const w0 = si.omega0 as number;
  const wf = si.omegaF as number;
  const al = si.alpha as number;
  const t = si.t as number;
  const dt = si.dtheta as number;
  const qw0 = F.q(w0, 'rad/s');
  const qwf = F.q(wf, 'rad/s');
  const qal = F.q(al, 'rad/s2');
  const qt = F.q(t, 's');
  const qdt = F.q(dt, 'rad');
  const tw0 = F.qt(w0, 'rad/s');
  const twf = F.qt(wf, 'rad/s');
  const tal = F.qt(al, 'rad/s2');
  const tt = F.qt(t, 's');
  const tdt = F.qt(dt, 'rad');
  const pw0 = paren(qw0, w0);
  const pal = paren(qal, al);
  const ptw0 = w0 < 0 ? `\\left(${tw0}\\right)` : tw0;
  const ptal = al < 0 ? `\\left(${tal}\\right)` : tal;

  type Spec = Omit<StepSpec, 'value' | 'unit' | 'alt'> & { target: KinVar };
  const unitOf: Record<KinVar, UnitId> = {
    omega0: 'rad/s',
    omegaF: 'rad/s',
    alpha: 'rad/s2',
    t: 's',
    dtheta: 'rad',
  };
  const S = {
    alphaFromW: {
      id: 'alpha',
      target: 'alpha',
      title: T.alpha,
      formulaId: 'F15',
      formulaTex: '\\alpha = \\frac{\\omega_f - \\omega_0}{t}',
      formulaText: 'α = (ω_f − ω0)/t',
      subTex: `\\frac{${twf} - ${ptw0}}{${tt}}`,
      subText: `(${qwf} − ${pw0})/(${qt})`,
    },
    dthetaAvg: {
      id: 'dtheta',
      target: 'dtheta',
      title: T.dtheta,
      formulaId: 'F18',
      formulaTex: '\\Delta\\theta = \\frac{(\\omega_0 + \\omega_f)\\,t}{2}',
      formulaText: 'Δθ = (ω0 + ω_f)·t/2',
      subTex: `\\frac{(${tw0} + ${twf}) \\times ${tt}}{2}`,
      subText: `(${qw0} + ${paren(qwf, wf)}) × ${qt}/2`,
    },
    tFromW: {
      id: 't',
      target: 't',
      title: T.t,
      formulaId: 'F15',
      formulaTex: 't = \\frac{\\omega_f - \\omega_0}{\\alpha}',
      formulaText: 't = (ω_f − ω0)/α',
      subTex: `\\frac{${twf} - ${ptw0}}{${tal}}`,
      subText: `(${qwf} − ${pw0})/(${qal})`,
    },
    dthetaNoT: {
      id: 'dtheta',
      target: 'dtheta',
      title: T.dtheta,
      formulaId: 'F17',
      formulaTex: '\\Delta\\theta = \\frac{\\omega_f^2 - \\omega_0^2}{2\\alpha}',
      formulaText: 'Δθ = (ω_f² − ω0²)/(2α)',
      subTex: `\\frac{(${twf})^2 - (${tw0})^2}{2 \\times ${ptal}}`,
      subText: `((${qwf})² − (${qw0})²)/(2 × ${pal})`,
    },
    alphaNoT: {
      id: 'alpha',
      target: 'alpha',
      title: T.alpha,
      formulaId: 'F17',
      formulaTex: '\\alpha = \\frac{\\omega_f^2 - \\omega_0^2}{2\\,\\Delta\\theta}',
      formulaText: 'α = (ω_f² − ω0²)/(2Δθ)',
      subTex: `\\frac{(${twf})^2 - (${tw0})^2}{2 \\times ${tdt}}`,
      subText: `((${qwf})² − (${qw0})²)/(2 × ${paren(qdt, dt)})`,
    },
    tAvg: {
      id: 't',
      target: 't',
      title: T.t,
      formulaId: 'F18',
      formulaTex: 't = \\frac{2\\,\\Delta\\theta}{\\omega_0 + \\omega_f}',
      formulaText: 't = 2Δθ/(ω0 + ω_f)',
      subTex: `\\frac{2 \\times ${tdt}}{${tw0} + ${twf}}`,
      subText: `2 × ${paren(qdt, dt)}/(${qw0} + ${paren(qwf, wf)})`,
    },
    wfFromAlpha: {
      id: 'omegaF',
      target: 'omegaF',
      title: T.omegaF,
      formulaId: 'F15',
      formulaTex: '\\omega_f = \\omega_0 + \\alpha t',
      formulaText: 'ω_f = ω0 + α·t',
      subTex: `${tw0} + ${ptal} \\times ${tt}`,
      subText: `${qw0} + ${pal} × ${qt}`,
    },
    dthetaKin: {
      id: 'dtheta',
      target: 'dtheta',
      title: T.dtheta,
      formulaId: 'F16',
      formulaTex: '\\Delta\\theta = \\omega_0 t + \\tfrac{1}{2}\\alpha t^2',
      formulaText: 'Δθ = ω0·t + ½·α·t²',
      subTex: `${ptw0} \\times ${tt} + \\tfrac{1}{2} \\times ${ptal} \\times (${tt})^2`,
      subText: `${pw0} × ${qt} + ½ × ${pal} × (${qt})²`,
    },
    alphaFromKin: {
      id: 'alpha',
      target: 'alpha',
      title: T.alpha,
      formulaId: 'F16',
      formulaTex: '\\alpha = \\frac{2(\\Delta\\theta - \\omega_0 t)}{t^2}',
      formulaText: 'α = 2(Δθ − ω0·t)/t²',
      subTex: `\\frac{2(${tdt} - ${tw0} \\times ${tt})}{(${tt})^2}`,
      subText: `2 × (${qdt} − ${qw0} × ${qt})/(${qt})²`,
    },
    wfFromAvg: {
      id: 'omegaF',
      target: 'omegaF',
      title: T.omegaF,
      formulaId: 'F18',
      formulaTex: '\\omega_f = \\frac{2\\,\\Delta\\theta}{t} - \\omega_0',
      formulaText: 'ω_f = 2Δθ/t − ω0',
      subTex: `\\frac{2 \\times ${tdt}}{${tt}} - ${ptw0}`,
      subText: `2 × ${paren(qdt, dt)}/(${qt}) − ${pw0}`,
    },
    w0FromAlpha: {
      id: 'omega0',
      target: 'omega0',
      title: T.omega0,
      formulaId: 'F15',
      formulaTex: '\\omega_0 = \\omega_f - \\alpha t',
      formulaText: 'ω0 = ω_f − α·t',
      subTex: `${twf} - ${ptal} \\times ${tt}`,
      subText: `${qwf} − ${pal} × ${qt}`,
    },
    dthetaFromWf: {
      id: 'dtheta',
      target: 'dtheta',
      title: T.dtheta,
      formulaId: 'F16',
      formulaTex: '\\Delta\\theta = \\omega_f t - \\tfrac{1}{2}\\alpha t^2',
      formulaText: 'Δθ = ω_f·t − ½·α·t²',
      subTex: `${twf} \\times ${tt} - \\tfrac{1}{2} \\times ${ptal} \\times (${tt})^2`,
      subText: `${paren(qwf, wf)} × ${qt} − ½ × ${pal} × (${qt})²`,
    },
    w0NoT: {
      id: 'omega0',
      target: 'omega0',
      title: T.omega0,
      formulaId: 'F17',
      formulaTex: '\\omega_0 = \\sqrt{\\omega_f^2 - 2\\alpha\\,\\Delta\\theta}',
      formulaText: 'ω0 = √(ω_f² − 2α·Δθ)',
      subTex: `\\sqrt{(${twf})^2 - 2 \\times ${ptal} \\times ${tdt}}`,
      subText: `√((${qwf})² − 2 × ${pal} × ${paren(qdt, dt)})`,
    },
    w0FromAvg: {
      id: 'omega0',
      target: 'omega0',
      title: T.omega0,
      formulaId: 'F18',
      formulaTex: '\\omega_0 = \\frac{2\\,\\Delta\\theta}{t} - \\omega_f',
      formulaText: 'ω0 = 2Δθ/t − ω_f',
      subTex: `\\frac{2 \\times ${tdt}}{${tt}} - ${wf < 0 ? `\\left(${twf}\\right)` : twf}`,
      subText: `2 × ${paren(qdt, dt)}/(${qt}) − ${paren(qwf, wf)}`,
    },
    w0FromKin: {
      id: 'omega0',
      target: 'omega0',
      title: T.omega0,
      formulaId: 'F16',
      formulaTex: '\\omega_0 = \\frac{\\Delta\\theta}{t} - \\tfrac{1}{2}\\alpha t',
      formulaText: 'ω0 = Δθ/t − ½·α·t',
      subTex: `\\frac{${tdt}}{${tt}} - \\tfrac{1}{2} \\times ${ptal} \\times ${tt}`,
      subText: `${paren(qdt, dt)}/(${qt}) − ½ × ${pal} × ${qt}`,
    },
    tUniform: {
      id: 't',
      target: 't',
      title: T.t,
      formulaId: 'F09',
      formulaTex: 't = \\frac{\\Delta\\theta}{\\omega}',
      formulaText: 't = Δθ/ω',
      subTex: `\\frac{${tdt}}{${result.combination === 8 ? twf : tw0}}`,
      subText: `${paren(qdt, dt)}/(${result.combination === 8 ? qwf : qw0})`,
    },
    w0Equal: {
      id: 'omega0',
      target: 'omega0',
      title: T.omega0,
      formulaId: 'F15',
      formulaTex: '\\omega_0 = \\omega_f \\quad (\\alpha = 0)',
      formulaText: 'ω0 = ω_f (α = 0)',
    },
  } satisfies Record<string, Spec>;

  const quadratic = (): Spec => {
    const disc = w0 * w0 + 2 * al * dt;
    const sq = Math.sqrt(Math.max(0, disc));
    const q = -0.5 * (w0 + sq);
    const roots = q !== 0 ? [(2 * q) / al, -dt / q] : [0, 0];
    const other = roots.find((x) => Math.abs(x - t) > 1e-9 * Math.max(1, t));
    return {
      id: 't',
      target: 't',
      title: T.tQuadratic,
      formulaId: 'F16',
      formulaTex:
        't = \\frac{-\\omega_0 \\pm \\sqrt{\\omega_0^2 + 2\\alpha\\,\\Delta\\theta}}{\\alpha}',
      formulaText: 't = (−ω0 ± √(ω0² + 2α·Δθ))/α',
      subTex: `\\frac{-${tw0} \\pm \\sqrt{(${tw0})^2 + 2 \\times ${ptal} \\times ${tdt}}}{${tal}}`,
      subText: `(−${qw0} ± √((${qw0})² + 2 × ${pal} × ${paren(qdt, dt)}))/(${qal})`,
      note:
        other !== undefined && Number.isFinite(other)
          ? es.steps.notes.quadraticOtherRoot.replace('{other}', F.q(other, 's'))
          : undefined,
    };
  };

  const plan: Record<number, Spec[]> = {
    1: [S.alphaFromW, S.dthetaAvg],
    2: [S.tFromW, S.dthetaNoT],
    3: [S.alphaNoT, S.tAvg],
    4: [S.wfFromAlpha, S.dthetaKin],
    5: [al === 0 ? S.tUniform : quadratic(), S.wfFromAlpha],
    6: [S.alphaFromKin, S.wfFromAvg],
    7: [S.w0FromAlpha, S.dthetaFromWf],
    8: al === 0 ? [S.w0Equal, S.tUniform] : [S.w0NoT, S.tFromW],
    9: [S.w0FromAvg, S.alphaFromW],
    10: [S.w0FromKin, S.wfFromAlpha],
  };
  for (const spec of plan[result.combination] ?? []) {
    const { target, ...rest } = spec;
    steps.push(
      makeStep(
        {
          ...rest,
          field: target,
          value: si[target] as number,
          unit: unitOf[target],
          alt: alt(target),
        },
        F,
      ),
    );
  }

  steps.push(derivationStep(turnsFromDtheta, si, F, r));
  const rp = si.rp;
  if (rp !== undefined) {
    const at = al * rp;
    if (!(mv.knowns.includes('alpha') && mv.alphaEnteredAs === 'at')) {
      steps.push(
        makeStep(
          {
            id: 'at',
            title: T.at,
            formulaId: 'F13',
            field: 'at',
            formulaTex: `a_t = \\alpha \\cdot ${r.tex}`,
            formulaText: `a_t = α·${r.text}`,
            subTex: `${tal} \\times ${F.qt(rp, 'm')}`,
            subText: `${qal} × ${F.q(rp, 'm')}`,
            value: at,
            unit: 'm/s2',
            alt: mv.fields.at.unit,
          },
          F,
        ),
      );
    }
    if (!(mv.knowns.includes('dtheta') && mv.dthetaEnteredAs === 's')) {
      steps.push(
        makeStep(
          {
            id: 's',
            title: T.s,
            formulaId: 'F03',
            field: 's',
            formulaTex: `s = \\Delta\\theta \\cdot ${r.tex}`,
            formulaText: `s = Δθ·${r.text}`,
            subTex: `${tdt} \\times ${F.qt(rp, 'm')}`,
            subText: `${paren(qdt, dt)} × ${F.q(rp, 'm')}`,
            value: dt * rp,
            unit: 'm',
            alt: mv.fields.s.unit,
          },
          F,
        ),
      );
    }
    const acF = wf * wf * rp;
    const aF = Math.hypot(acF, at);
    steps.push(
      makeStep(
        {
          id: 'ac-final',
          title: T.acFinal,
          formulaId: 'F11',
          formulaTex: `a_c = \\omega_f^2 \\cdot ${r.tex}`,
          formulaText: `a_c = ω_f²·${r.text}`,
          subTex: `(${twf})^2 \\times ${F.qt(rp, 'm')}`,
          subText: `(${qwf})² × ${F.q(rp, 'm')}`,
          value: acF,
          unit: 'm/s2',
        },
        F,
      ),
      makeStep(
        {
          id: 'a-final',
          title: T.aFinal,
          formulaId: 'F14',
          formulaTex: 'a = \\sqrt{a_c^2 + a_t^2}',
          formulaText: 'a = √(a_c² + a_t²)',
          subTex: `\\sqrt{(${F.qt(acF, 'm/s2')})^2 + (${F.qt(at, 'm/s2')})^2}`,
          subText: `√((${F.q(acF, 'm/s2')})² + (${F.q(at, 'm/s2')})²)`,
          value: aF,
          unit: 'm/s2',
        },
        F,
      ),
    );
    const m = si.m;
    if (m !== undefined) {
      const qm = F.q(m, 'kg');
      const tm = F.qt(m, 'kg');
      steps.push(
        makeStep(
          {
            id: 'Fc-final',
            title: T.FcFinal,
            formulaId: 'F12',
            formulaTex: 'F_c = m \\cdot a_c',
            formulaText: 'F_c = m·a_c',
            subTex: `${tm} \\times ${F.qt(acF, 'm/s2')}`,
            subText: `${qm} × ${F.q(acF, 'm/s2')}`,
            value: m * acF,
            unit: 'N',
          },
          F,
        ),
        makeStep(
          {
            id: 'Ft',
            title: T.Ft,
            formulaId: 'F20',
            formulaTex: 'F_t = m \\cdot a_t',
            formulaText: 'F_t = m·a_t',
            subTex: `${tm} \\times ${at < 0 ? `\\left(${F.qt(at, 'm/s2')}\\right)` : F.qt(at, 'm/s2')}`,
            subText: `${qm} × ${paren(F.q(at, 'm/s2'), at)}`,
            value: m * at,
            unit: 'N',
          },
          F,
        ),
        makeStep(
          {
            id: 'Fnet-final',
            title: T.FnetFinal,
            formulaId: 'F20',
            formulaTex: 'F_{neta} = m \\cdot a',
            formulaText: 'F_neta = m·a',
            subTex: `${tm} \\times ${F.qt(aF, 'm/s2')}`,
            subText: `${qm} × ${F.q(aF, 'm/s2')}`,
            value: m * aF,
            unit: 'N',
          },
          F,
        ),
      );
    }
  }
  return steps;
}

/** Paso a paso del simulador para el estado y el resultado dados. */
export function buildSteps(state: AppState, result: SolveResult): Step[] {
  return result.mode === 'MCU' ? buildMcuSteps(state, result) : buildMcuvSteps(state, result);
}
