import { es } from '../i18n/es';
import { GRAV_CONSTANT, TWO_PI } from '../core/constants';
import type { Fmt } from '../core/fmt';

/** Apartado de fórmulas (sección 15). Los textos viven en src/i18n/es.ts. */

export type FormulaCategory =
  'geometry' | 'period' | 'velocities' | 'accelerations' | 'mcuv' | 'applications' | 'conversions';

export const CATEGORIES: readonly FormulaCategory[] = [
  'geometry',
  'period',
  'velocities',
  'accelerations',
  'mcuv',
  'applications',
  'conversions',
];

export type SymbolId =
  | 'R'
  | 'rp'
  | 'd'
  | 'C'
  | 'theta'
  | 'theta0'
  | 'dtheta'
  | 'N'
  | 's'
  | 'T'
  | 'f'
  | 'rpm'
  | 'omega'
  | 'omega0f'
  | 'v'
  | 'alpha'
  | 'at'
  | 'ac'
  | 'a'
  | 'phi'
  | 'm'
  | 'Fc'
  | 'Ft'
  | 't'
  | 'tau'
  | 'g'
  | 'mu'
  | 'beta'
  | 'Nf'
  | 'G'
  | 'M'
  | 'h';

export interface SymbolDef {
  id: SymbolId;
  /** Símbolo para mostrar (con _ para subíndice). */
  sym: string;
  /** Unidad del SI (texto). */
  unit: string;
  name: string;
  meaning: string;
}

const SYMBOL_BASE: Array<[SymbolId, string, string]> = [
  ['R', 'R', 'm'],
  ['rp', 'r_p', 'm'],
  ['d', 'd', 'm'],
  ['C', 'C', 'm'],
  ['theta', 'θ', 'rad'],
  ['theta0', 'θ_0', 'rad'],
  ['dtheta', 'Δθ', 'rad'],
  ['N', 'N', '—'],
  ['s', 's', 'm'],
  ['T', 'T', 's'],
  ['f', 'f', 'Hz (1/s)'],
  ['rpm', 'rpm', 'rev/min'],
  ['omega', 'ω', 'rad/s'],
  ['omega0f', 'ω_0, ω_f', 'rad/s'],
  ['v', 'v', 'm/s'],
  ['alpha', 'α', 'rad/s²'],
  ['at', 'a_t', 'm/s²'],
  ['ac', 'a_c', 'm/s²'],
  ['a', 'a', 'm/s²'],
  ['phi', 'φ', '°'],
  ['m', 'm', 'kg'],
  ['Fc', 'F_c', 'N'],
  ['Ft', 'F_t', 'N'],
  ['t', 't', 's'],
  ['tau', 'τ', 's'],
  ['g', 'g', 'm/s²'],
  ['mu', 'μ_s', '—'],
  ['beta', 'β', '°'],
  ['Nf', 'N_f', 'N'],
  ['G', 'G', 'N·m²/kg²'],
  ['M', 'M', 'kg'],
  ['h', 'h', 'm'],
];

export const SYMBOLS: readonly SymbolDef[] = SYMBOL_BASE.map(([id, sym, unit]) => ({
  id,
  sym,
  unit,
  name: es.glossary[id].name,
  meaning: es.glossary[id].meaning,
}));

export function symbolDef(id: string): SymbolDef | undefined {
  return SYMBOLS.find((s) => s.id === id);
}

/** Valores actuales (en SI) para «Probar con los datos actuales». */
export interface TryContext {
  sim: Partial<Record<string, number>>;
  flat: Partial<Record<'R' | 'mu', number>>;
  banked: Partial<Record<'R' | 'beta' | 'mu' | 'v', number>>;
  orbit: Partial<Record<'M' | 'Rbody' | 'R' | 'h' | 'm', number>>;
  g: number;
}

export type TryResult = { ok: true; tex: string } | { ok: false; missing: string[] };

export interface Formula {
  id: string;
  category: FormulaCategory;
  name: string;
  tex: string;
  symbols: SymbolId[];
  says: string;
  whenToUse: string;
  commonMistake: string;
  tryIt: (c: TryContext, F: Fmt) => TryResult;
}

const sym = (k: keyof typeof es.fields) => es.fields[k].sym;

function req<K extends string>(
  src: Partial<Record<string, number>>,
  names: Record<K, string>,
): { ok: true; v: Record<K, number> } | { ok: false; missing: string[] } {
  const missing: string[] = [];
  const v = {} as Record<K, number>;
  for (const k of Object.keys(names) as K[]) {
    const x = src[k];
    if (x === undefined || !Number.isFinite(x)) missing.push(names[k]);
    else v[k] = x;
  }
  return missing.length ? { ok: false, missing } : { ok: true, v };
}

const ok = (tex: string): TryResult => ({ ok: true, tex });
const r = sym('r');

type Def = Omit<Formula, 'name' | 'tex' | 'says' | 'whenToUse' | 'commonMistake'>;

const DEFS: Def[] = [
  {
    id: 'F01',
    category: 'geometry',
    symbols: ['d', 'R'],
    tryIt: (c, F) => {
      const q = req(c.sim, { R: sym('R') });
      if (!q.ok) return q;
      return ok(`d = 2r = 2 \\times ${F.qt(q.v.R, 'm')} = ${F.qt(2 * q.v.R, 'm')}`);
    },
  },
  {
    id: 'F02',
    category: 'geometry',
    symbols: ['C', 'R', 'rp'],
    tryIt: (c, F) => {
      const q = req(c.sim, { rp: r });
      if (!q.ok) return q;
      return ok(`C = 2\\pi r = 2\\pi \\times ${F.qt(q.v.rp, 'm')} = ${F.qt(TWO_PI * q.v.rp, 'm')}`);
    },
  },
  {
    id: 'F03',
    category: 'geometry',
    symbols: ['s', 'theta', 'dtheta', 'R', 'rp'],
    tryIt: (c, F) => {
      const q = req(c.sim, { dtheta: sym('dtheta'), rp: r });
      if (!q.ok) return q;
      const { dtheta, rp } = q.v;
      return ok(
        `s = \\Delta\\theta \\cdot r = ${F.qt(dtheta, 'rad')} \\times ${F.qt(rp, 'm')} = ${F.qt(dtheta * rp, 'm')}`,
      );
    },
  },
  {
    id: 'F04',
    category: 'period',
    symbols: ['T', 'f'],
    tryIt: (c, F) => {
      const q = req(c.sim, { f: sym('f') });
      if (!q.ok) return q;
      return ok(`T = \\frac{1}{f} = \\frac{1}{${F.qt(q.v.f, 'Hz')}} = ${F.qt(1 / q.v.f, 's')}`);
    },
  },
  {
    id: 'F05',
    category: 'period',
    symbols: ['f', 'rpm'],
    tryIt: (c, F) => {
      const q = req(c.sim, { rpm: sym('rpm') });
      if (!q.ok) return q;
      return ok(
        `f = \\frac{\\mathrm{rpm}}{60} = \\frac{${F.nt(q.v.rpm)}}{60} = ${F.qt(q.v.rpm / 60, 'Hz')}`,
      );
    },
  },
  {
    id: 'F06',
    category: 'period',
    symbols: ['f', 'N', 't'],
    tryIt: (c, F) => {
      const q = req(c.sim, { N: sym('N'), t: sym('t') });
      if (!q.ok) return q;
      return ok(
        `f = \\frac{N}{t} = \\frac{${F.nt(q.v.N)}}{${F.qt(q.v.t, 's')}} = ${F.qt(q.v.N / q.v.t, 'Hz')}`,
      );
    },
  },
  {
    id: 'F07',
    category: 'velocities',
    symbols: ['omega', 'T', 'f'],
    tryIt: (c, F) => {
      const q = req(c.sim, { f: sym('f') });
      if (!q.ok) return q;
      return ok(
        `\\omega = 2\\pi f = 2\\pi \\times ${F.qt(q.v.f, 'Hz')} = ${F.qt(TWO_PI * q.v.f, 'rad/s')}`,
      );
    },
  },
  {
    id: 'F08',
    category: 'conversions',
    symbols: ['omega', 'rpm'],
    tryIt: (c, F) => {
      const q = req(c.sim, { rpm: sym('rpm') });
      if (!q.ok) return q;
      return ok(
        `\\omega = \\mathrm{rpm} \\cdot \\frac{2\\pi}{60} = ${F.nt(q.v.rpm)} \\times \\frac{2\\pi}{60} = ${F.qt((q.v.rpm * TWO_PI) / 60, 'rad/s')}`,
      );
    },
  },
  {
    id: 'F09',
    category: 'velocities',
    symbols: ['dtheta', 'omega', 't', 'N'],
    tryIt: (c, F) => {
      const q = req(c.sim, { omega: sym('omega'), t: sym('t') });
      if (!q.ok) return q;
      return ok(
        `\\Delta\\theta = \\omega t = ${F.qt(q.v.omega, 'rad/s')} \\times ${F.qt(q.v.t, 's')} = ${F.qt(q.v.omega * q.v.t, 'rad')}`,
      );
    },
  },
  {
    id: 'F10',
    category: 'velocities',
    symbols: ['v', 'omega', 'R', 'rp', 'T'],
    tryIt: (c, F) => {
      const q = req(c.sim, { omega: sym('omega'), rp: r });
      if (!q.ok) return q;
      return ok(
        `v = \\omega r = ${F.qt(q.v.omega, 'rad/s')} \\times ${F.qt(q.v.rp, 'm')} = ${F.qt(q.v.omega * q.v.rp, 'm/s')}`,
      );
    },
  },
  {
    id: 'F11',
    category: 'accelerations',
    symbols: ['ac', 'v', 'R', 'rp', 'omega'],
    tryIt: (c, F) => {
      const q = req(c.sim, { omega: sym('omega'), rp: r });
      if (!q.ok) return q;
      const { omega, rp } = q.v;
      return ok(
        `a_c = \\omega^2 r = (${F.qt(omega, 'rad/s')})^2 \\times ${F.qt(rp, 'm')} = ${F.qt(omega * omega * rp, 'm/s2')}`,
      );
    },
  },
  {
    id: 'F12',
    category: 'accelerations',
    symbols: ['Fc', 'm', 'ac', 'v', 'R', 'rp'],
    tryIt: (c, F) => {
      const q = req(c.sim, { m: sym('m'), ac: sym('ac') });
      if (!q.ok) return q;
      return ok(
        `F_c = m\\, a_c = ${F.qt(q.v.m, 'kg')} \\times ${F.qt(q.v.ac, 'm/s2')} = ${F.qt(q.v.m * q.v.ac, 'N')}`,
      );
    },
  },
  {
    id: 'F13',
    category: 'mcuv',
    symbols: ['at', 'alpha', 'R', 'rp'],
    tryIt: (c, F) => {
      const q = req(c.sim, { alpha: sym('alpha'), rp: r });
      if (!q.ok) return q;
      return ok(
        `a_t = \\alpha r = ${F.qt(q.v.alpha, 'rad/s2')} \\times ${F.qt(q.v.rp, 'm')} = ${F.qt(q.v.alpha * q.v.rp, 'm/s2')}`,
      );
    },
  },
  {
    id: 'F14',
    category: 'accelerations',
    symbols: ['a', 'ac', 'at', 'phi'],
    tryIt: (c, F) => {
      const q = req(c.sim, { ac: sym('ac'), at: sym('at') });
      if (!q.ok) return q;
      const { ac, at } = q.v;
      return ok(
        `a = \\sqrt{a_c^2 + a_t^2} = \\sqrt{(${F.qt(ac, 'm/s2')})^2 + (${F.qt(at, 'm/s2')})^2} = ${F.qt(Math.hypot(ac, at), 'm/s2')}`,
      );
    },
  },
  {
    id: 'F15',
    category: 'mcuv',
    symbols: ['omega0f', 'alpha', 't'],
    tryIt: (c, F) => {
      const q = req(c.sim, { omega0: sym('omega0'), alpha: sym('alpha'), t: sym('t') });
      if (!q.ok) return q;
      const { omega0, alpha, t } = q.v;
      return ok(
        `\\omega_f = \\omega_0 + \\alpha t = ${F.qt(omega0, 'rad/s')} + ${F.qt(alpha, 'rad/s2')} \\times ${F.qt(t, 's')} = ${F.qt(omega0 + alpha * t, 'rad/s')}`,
      );
    },
  },
  {
    id: 'F16',
    category: 'mcuv',
    symbols: ['dtheta', 'omega0f', 'alpha', 't'],
    tryIt: (c, F) => {
      const q = req(c.sim, { omega0: sym('omega0'), alpha: sym('alpha'), t: sym('t') });
      if (!q.ok) return q;
      const { omega0, alpha, t } = q.v;
      return ok(
        `\\Delta\\theta = \\omega_0 t + \\tfrac{1}{2}\\alpha t^2 = ${F.qt(omega0, 'rad/s')} \\times ${F.qt(t, 's')} + \\tfrac{1}{2} \\times ${F.qt(alpha, 'rad/s2')} \\times (${F.qt(t, 's')})^2 = ${F.qt(omega0 * t + 0.5 * alpha * t * t, 'rad')}`,
      );
    },
  },
  {
    id: 'F17',
    category: 'mcuv',
    symbols: ['omega0f', 'alpha', 'dtheta'],
    tryIt: (c, F) => {
      const q = req(c.sim, { omega0: sym('omega0'), alpha: sym('alpha'), dtheta: sym('dtheta') });
      if (!q.ok) return q;
      const { omega0, alpha, dtheta } = q.v;
      const sq = omega0 * omega0 + 2 * alpha * dtheta;
      return ok(
        `|\\omega_f| = \\sqrt{\\omega_0^2 + 2\\alpha\\,\\Delta\\theta} = \\sqrt{(${F.qt(omega0, 'rad/s')})^2 + 2 \\times ${F.qt(alpha, 'rad/s2')} \\times ${F.qt(dtheta, 'rad')}} = ${F.qt(Math.sqrt(Math.max(0, sq)), 'rad/s')}`,
      );
    },
  },
  {
    id: 'F18',
    category: 'mcuv',
    symbols: ['dtheta', 'omega0f', 't'],
    tryIt: (c, F) => {
      const q = req(c.sim, { omega0: sym('omega0'), omegaF: sym('omegaF'), t: sym('t') });
      if (!q.ok) return q;
      const { omega0, omegaF, t } = q.v;
      return ok(
        `\\Delta\\theta = \\frac{(\\omega_0 + \\omega_f)\\,t}{2} = \\frac{(${F.qt(omega0, 'rad/s')} + ${F.qt(omegaF, 'rad/s')}) \\times ${F.qt(t, 's')}}{2} = ${F.qt(((omega0 + omegaF) * t) / 2, 'rad')}`,
      );
    },
  },
  {
    id: 'F19',
    category: 'conversions',
    symbols: ['theta', 'N', 'dtheta'],
    tryIt: (c, F) => {
      const q = req(c.sim, { dtheta: sym('dtheta') });
      if (!q.ok) return q;
      const d = q.v.dtheta;
      return ok(`${F.qt(d, 'rev')} = ${F.qt(d, 'rad')} = ${F.qt(d, 'deg')}`);
    },
  },
  {
    id: 'F20',
    category: 'accelerations',
    symbols: ['Ft', 'm', 'at', 'a'],
    tryIt: (c, F) => {
      const q = req(c.sim, { m: sym('m'), at: sym('at'), a: sym('a') });
      if (!q.ok) return q;
      const { m, at, a } = q.v;
      return ok(
        `F_t = m\\, a_t = ${F.qt(m, 'kg')} \\times ${F.qt(at, 'm/s2')} = ${F.qt(m * at, 'N')} \\qquad F_{neta} = m\\, a = ${F.qt(m * a, 'N')}`,
      );
    },
  },
  {
    id: 'F21',
    category: 'accelerations',
    symbols: ['ac', 'g'],
    tryIt: (c, F) => {
      const q = req(c.sim, { ac: sym('ac') });
      if (!q.ok) return q;
      return ok(
        `n = \\frac{a_c}{g} = \\frac{${F.qt(q.v.ac, 'm/s2')}}{${F.qt(c.g, 'm/s2')}} = ${F.nt(q.v.ac / c.g)}`,
      );
    },
  },
  {
    id: 'F22',
    category: 'applications',
    symbols: ['v', 'mu', 'g', 'R'],
    tryIt: (c, F) => {
      const q = req(c.flat, { mu: es.applications.fields.mu.sym, R: es.applications.fields.R.sym });
      if (!q.ok) return q;
      const { mu, R } = q.v;
      return ok(
        `v_{max} = \\sqrt{\\mu_s g R} = \\sqrt{${F.nt(mu)} \\times ${F.qt(c.g, 'm/s2')} \\times ${F.qt(R, 'm')}} = ${F.qt(Math.sqrt(mu * c.g * R), 'm/s')}`,
      );
    },
  },
  {
    id: 'F23',
    category: 'applications',
    symbols: ['beta', 'v', 'R', 'g'],
    tryIt: (c, F) => {
      const q = req(c.banked, { v: es.applications.fields.v.sym, R: es.applications.fields.R.sym });
      if (!q.ok) return q;
      const { v, R } = q.v;
      const b = Math.atan((v * v) / (R * c.g));
      return ok(
        `\\tan\\beta = \\frac{v^2}{R g} = \\frac{(${F.qt(v, 'm/s')})^2}{${F.qt(R, 'm')} \\times ${F.qt(c.g, 'm/s2')}} \\Rightarrow \\beta = ${F.qt(b, 'deg')}`,
      );
    },
  },
  {
    id: 'F24',
    category: 'applications',
    symbols: ['v', 'R', 'g', 'beta', 'mu'],
    tryIt: (c, F) => {
      const q = req(c.banked, {
        R: es.applications.fields.R.sym,
        beta: es.applications.fields.beta.sym,
        mu: es.applications.fields.mu.sym,
      });
      if (!q.ok) return q;
      const { R, beta, mu } = q.v;
      const s = Math.sin(beta);
      const co = Math.cos(beta);
      const den = co - mu * s;
      const num = s - mu * co;
      const vmax = den <= 0 ? Number.POSITIVE_INFINITY : Math.sqrt((R * c.g * (s + mu * co)) / den);
      const vmin = num <= 0 ? 0 : Math.sqrt((R * c.g * num) / (co + mu * s));
      return ok(
        `v_{max} = ${F.qt(vmax, 'm/s')} \\qquad v_{min} = ${F.qt(vmin, 'm/s')} \\quad (R = ${F.qt(R, 'm')},\\ \\beta = ${F.qt(beta, 'deg')},\\ \\mu_s = ${F.nt(mu)})`,
      );
    },
  },
  {
    id: 'F25',
    category: 'applications',
    symbols: ['G', 'M', 'm', 'R', 'Fc'],
    tryIt: (c, F) => {
      const q = req(c.orbit, {
        M: es.applications.fields.M.sym,
        R: es.applications.fields.Rorbit.sym,
        m: es.applications.fields.msat.sym,
      });
      if (!q.ok) return q;
      const { M, R, m } = q.v;
      return ok(
        `F = \\frac{G M m}{R^2} = \\frac{${F.nt(GRAV_CONSTANT)} \\times ${F.qt(M, 'kg')} \\times ${F.qt(m, 'kg')}}{(${F.qt(R, 'm')})^2} = ${F.qt((GRAV_CONSTANT * M * m) / (R * R), 'N')}`,
      );
    },
  },
  {
    id: 'F26',
    category: 'applications',
    symbols: ['v', 'G', 'M', 'R'],
    tryIt: (c, F) => {
      const q = req(c.orbit, {
        M: es.applications.fields.M.sym,
        R: es.applications.fields.Rorbit.sym,
      });
      if (!q.ok) return q;
      const { M, R } = q.v;
      return ok(
        `v = \\sqrt{\\frac{G M}{R}} = \\sqrt{\\frac{${F.nt(GRAV_CONSTANT)} \\times ${F.qt(M, 'kg')}}{${F.qt(R, 'm')}}} = ${F.qt(Math.sqrt((GRAV_CONSTANT * M) / R), 'm/s')}`,
      );
    },
  },
  {
    id: 'F27',
    category: 'applications',
    symbols: ['T', 'G', 'M', 'R'],
    tryIt: (c, F) => {
      const q = req(c.orbit, {
        M: es.applications.fields.M.sym,
        R: es.applications.fields.Rorbit.sym,
      });
      if (!q.ok) return q;
      const { M, R } = q.v;
      return ok(
        `T = 2\\pi\\sqrt{\\frac{R^3}{G M}} = 2\\pi\\sqrt{\\frac{(${F.qt(R, 'm')})^3}{${F.nt(GRAV_CONSTANT)} \\times ${F.qt(M, 'kg')}}} = ${F.qt(TWO_PI * Math.sqrt((R * R * R) / (GRAV_CONSTANT * M)), 's')}`,
      );
    },
  },
  {
    id: 'F28',
    category: 'applications',
    symbols: ['R', 'h'],
    tryIt: (c, F) => {
      const q = req(c.orbit, {
        Rbody: es.applications.fields.Rbody.sym,
        h: es.applications.fields.h.sym,
      });
      if (!q.ok) return q;
      const { Rbody, h } = q.v;
      return ok(
        `R = R_{cuerpo} + h = ${F.qt(Rbody, 'm')} + ${F.qt(h, 'm')} = ${F.qt(Rbody + h, 'm')}`,
      );
    },
  },
];

export const FORMULAS: readonly Formula[] = DEFS.map((d) => {
  const t = es.formulas[d.id as keyof typeof es.formulas];
  return {
    ...d,
    name: t.name,
    tex: es.formulaTex[d.id as keyof typeof es.formulaTex],
    says: t.says,
    whenToUse: t.when,
    commonMistake: t.mistake,
  };
});

export function formulaById(id: string): Formula | undefined {
  return FORMULAS.find((f) => f.id === id);
}

/** Fórmulas donde aparece un símbolo. */
export function formulasWithSymbol(id: SymbolId): Formula[] {
  return FORMULAS.filter((f) => f.symbols.includes(id));
}
