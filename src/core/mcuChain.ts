import { TWO_PI } from './constants';
import type { Fmt } from './fmt';
import type { FieldStatus, RateField, SiValues, TimeField, UnitId, VarId } from './types';
import type { es } from '../i18n/es';

/**
 * Secuencias de cálculo del MCU (tablas 9.3 y 9.5).
 * El mismo arreglo sirve para calcular y para construir el paso a paso,
 * así el orden de los pasos es exactamente el orden del cálculo.
 */

export type StepTitleKey = keyof typeof es.steps.titles;

/** Símbolo del radio en las fórmulas: r en el borde, r_p en otro punto. */
export interface RadiusSymbol {
  text: string;
  tex: string;
}

export interface Derivation {
  key: string;
  target: VarId;
  needs: VarId[];
  formulaId: string;
  title: StepTitleKey;
  /** Unidad (SI) en que se muestra el resultado del paso. */
  unit: UnitId;
  compute: (v: SiValues) => number;
  tex: (r: RadiusSymbol) => string;
  text: (r: RadiusSymbol) => string;
  subTex: (v: SiValues, F: Fmt) => string;
  subText: (v: SiValues, F: Fmt) => string;
}

const n = (v: SiValues, k: VarId): number => v[k] as number;

const fFromRpm: Derivation = {
  key: 'f_from_rpm',
  target: 'f',
  needs: ['rpm'],
  formulaId: 'F05',
  title: 'f',
  unit: 'Hz',
  compute: (v) => n(v, 'rpm') / 60,
  tex: () => 'f = \\frac{\\mathrm{rpm}}{60}',
  text: () => 'f = rpm/60',
  subTex: (v, F) => `\\frac{${F.nt(n(v, 'rpm'))}}{60}`,
  subText: (v, F) => `${F.n(n(v, 'rpm'))}/60`,
};

const TFromF: Derivation = {
  key: 'T_from_f',
  target: 'T',
  needs: ['f'],
  formulaId: 'F04',
  title: 'T',
  unit: 's',
  compute: (v) => 1 / n(v, 'f'),
  tex: () => 'T = \\frac{1}{f}',
  text: () => 'T = 1/f',
  subTex: (v, F) => `\\frac{1}{${F.qt(n(v, 'f'), 'Hz')}}`,
  subText: (v, F) => `1/(${F.q(n(v, 'f'), 'Hz')})`,
};

const omegaFromF: Derivation = {
  key: 'omega_from_f',
  target: 'omega',
  needs: ['f'],
  formulaId: 'F07',
  title: 'omega',
  unit: 'rad/s',
  compute: (v) => TWO_PI * n(v, 'f'),
  tex: () => '\\omega = 2\\pi f',
  text: () => 'ω = 2πf',
  subTex: (v, F) => `2\\pi \\times ${F.qt(n(v, 'f'), 'Hz')}`,
  subText: (v, F) => `2π × ${F.q(n(v, 'f'), 'Hz')}`,
};

const vFromOmega: Derivation = {
  key: 'v_from_omega',
  target: 'v',
  needs: ['omega', 'rp'],
  formulaId: 'F10',
  title: 'v',
  unit: 'm/s',
  compute: (v) => n(v, 'omega') * n(v, 'rp'),
  tex: (r) => `v = \\omega \\cdot ${r.tex}`,
  text: (r) => `v = ω·${r.text}`,
  subTex: (v, F) => `${F.qt(n(v, 'omega'), 'rad/s')} \\times ${F.qt(n(v, 'rp'), 'm')}`,
  subText: (v, F) => `${F.q(n(v, 'omega'), 'rad/s')} × ${F.q(n(v, 'rp'), 'm')}`,
};

const acFromOmega: Derivation = {
  key: 'ac_from_omega',
  target: 'ac',
  needs: ['omega', 'rp'],
  formulaId: 'F11',
  title: 'ac',
  unit: 'm/s2',
  compute: (v) => n(v, 'omega') ** 2 * n(v, 'rp'),
  tex: (r) => `a_c = \\omega^2 \\cdot ${r.tex}`,
  text: (r) => `a_c = ω²·${r.text}`,
  subTex: (v, F) => `(${F.qt(n(v, 'omega'), 'rad/s')})^2 \\times ${F.qt(n(v, 'rp'), 'm')}`,
  subText: (v, F) => `(${F.q(n(v, 'omega'), 'rad/s')})² × ${F.q(n(v, 'rp'), 'm')}`,
};

const FcFromAc: Derivation = {
  key: 'Fc_from_ac',
  target: 'Fc',
  needs: ['m', 'ac'],
  formulaId: 'F12',
  title: 'Fc',
  unit: 'N',
  compute: (v) => n(v, 'm') * n(v, 'ac'),
  tex: () => 'F_c = m \\cdot a_c',
  text: () => 'F_c = m·a_c',
  subTex: (v, F) => `${F.qt(n(v, 'm'), 'kg')} \\times ${F.qt(n(v, 'ac'), 'm/s2')}`,
  subText: (v, F) => `${F.q(n(v, 'm'), 'kg')} × ${F.q(n(v, 'ac'), 'm/s2')}`,
};

const rpmFromF: Derivation = {
  key: 'rpm_from_f',
  target: 'rpm',
  needs: ['f'],
  formulaId: 'F05',
  title: 'rpm',
  unit: 'rev/min',
  compute: (v) => 60 * n(v, 'f'),
  tex: () => '\\mathrm{rpm} = 60 \\cdot f',
  text: () => 'rpm = 60·f',
  subTex: (v, F) => `60 \\times ${F.qt(n(v, 'f'), 'Hz')}`,
  subText: (v, F) => `60 × ${F.q(n(v, 'f'), 'Hz')}`,
};

const fFromT: Derivation = {
  key: 'f_from_T',
  target: 'f',
  needs: ['T'],
  formulaId: 'F04',
  title: 'f',
  unit: 'Hz',
  compute: (v) => 1 / n(v, 'T'),
  tex: () => 'f = \\frac{1}{T}',
  text: () => 'f = 1/T',
  subTex: (v, F) => `\\frac{1}{${F.qt(n(v, 'T'), 's')}}`,
  subText: (v, F) => `1/(${F.q(n(v, 'T'), 's')})`,
};

const omegaFromT: Derivation = {
  key: 'omega_from_T',
  target: 'omega',
  needs: ['T'],
  formulaId: 'F07',
  title: 'omega',
  unit: 'rad/s',
  compute: (v) => TWO_PI / n(v, 'T'),
  tex: () => '\\omega = \\frac{2\\pi}{T}',
  text: () => 'ω = 2π/T',
  subTex: (v, F) => `\\frac{2\\pi}{${F.qt(n(v, 'T'), 's')}}`,
  subText: (v, F) => `2π/(${F.q(n(v, 'T'), 's')})`,
};

const vFromT: Derivation = {
  key: 'v_from_T',
  target: 'v',
  needs: ['T', 'rp'],
  formulaId: 'F10',
  title: 'v',
  unit: 'm/s',
  compute: (v) => (TWO_PI * n(v, 'rp')) / n(v, 'T'),
  tex: (r) => `v = \\frac{2\\pi ${r.tex}}{T}`,
  text: (r) => `v = 2π·${r.text}/T`,
  subTex: (v, F) => `\\frac{2\\pi \\times ${F.qt(n(v, 'rp'), 'm')}}{${F.qt(n(v, 'T'), 's')}}`,
  subText: (v, F) => `2π × ${F.q(n(v, 'rp'), 'm')}/(${F.q(n(v, 'T'), 's')})`,
};

const acFromV: Derivation = {
  key: 'ac_from_v',
  target: 'ac',
  needs: ['v', 'rp'],
  formulaId: 'F11',
  title: 'ac',
  unit: 'm/s2',
  compute: (v) => (n(v, 'rp') > 0 ? n(v, 'v') ** 2 / n(v, 'rp') : 0),
  tex: (r) => `a_c = \\frac{v^2}{${r.tex}}`,
  text: (r) => `a_c = v²/${r.text}`,
  subTex: (v, F) => `\\frac{(${F.qt(n(v, 'v'), 'm/s')})^2}{${F.qt(n(v, 'rp'), 'm')}}`,
  subText: (v, F) => `(${F.q(n(v, 'v'), 'm/s')})²/(${F.q(n(v, 'rp'), 'm')})`,
};

const fFromOmega: Derivation = {
  key: 'f_from_omega',
  target: 'f',
  needs: ['omega'],
  formulaId: 'F07',
  title: 'f',
  unit: 'Hz',
  compute: (v) => n(v, 'omega') / TWO_PI,
  tex: () => 'f = \\frac{\\omega}{2\\pi}',
  text: () => 'f = ω/2π',
  subTex: (v, F) => `\\frac{${F.qt(n(v, 'omega'), 'rad/s')}}{2\\pi}`,
  subText: (v, F) => `${F.q(n(v, 'omega'), 'rad/s')}/(2π)`,
};

const TFromOmega: Derivation = {
  key: 'T_from_omega',
  target: 'T',
  needs: ['omega'],
  formulaId: 'F07',
  title: 'T',
  unit: 's',
  compute: (v) => TWO_PI / n(v, 'omega'),
  tex: () => 'T = \\frac{2\\pi}{\\omega}',
  text: () => 'T = 2π/ω',
  subTex: (v, F) => `\\frac{2\\pi}{${F.qt(n(v, 'omega'), 'rad/s')}}`,
  subText: (v, F) => `2π/(${F.q(n(v, 'omega'), 'rad/s')})`,
};

const omegaFromV: Derivation = {
  key: 'omega_from_v',
  target: 'omega',
  needs: ['v', 'rp'],
  formulaId: 'F10',
  title: 'omega',
  unit: 'rad/s',
  compute: (v) => n(v, 'v') / n(v, 'rp'),
  tex: (r) => `\\omega = \\frac{v}{${r.tex}}`,
  text: (r) => `ω = v/${r.text}`,
  subTex: (v, F) => `\\frac{${F.qt(n(v, 'v'), 'm/s')}}{${F.qt(n(v, 'rp'), 'm')}}`,
  subText: (v, F) => `${F.q(n(v, 'v'), 'm/s')}/(${F.q(n(v, 'rp'), 'm')})`,
};

const TFromV: Derivation = {
  key: 'T_from_v',
  target: 'T',
  needs: ['v', 'rp'],
  formulaId: 'F10',
  title: 'T',
  unit: 's',
  compute: (v) => (TWO_PI * n(v, 'rp')) / n(v, 'v'),
  tex: (r) => `T = \\frac{2\\pi ${r.tex}}{v}`,
  text: (r) => `T = 2π·${r.text}/v`,
  subTex: (v, F) => `\\frac{2\\pi \\times ${F.qt(n(v, 'rp'), 'm')}}{${F.qt(n(v, 'v'), 'm/s')}}`,
  subText: (v, F) => `2π × ${F.q(n(v, 'rp'), 'm')}/(${F.q(n(v, 'v'), 'm/s')})`,
};

const vFromAc: Derivation = {
  key: 'v_from_ac',
  target: 'v',
  needs: ['ac', 'rp'],
  formulaId: 'F11',
  title: 'v',
  unit: 'm/s',
  compute: (v) => Math.sqrt(n(v, 'ac') * n(v, 'rp')),
  tex: (r) => `v = \\sqrt{a_c \\cdot ${r.tex}}`,
  text: (r) => `v = √(a_c·${r.text})`,
  subTex: (v, F) => `\\sqrt{${F.qt(n(v, 'ac'), 'm/s2')} \\times ${F.qt(n(v, 'rp'), 'm')}}`,
  subText: (v, F) => `√(${F.q(n(v, 'ac'), 'm/s2')} × ${F.q(n(v, 'rp'), 'm')})`,
};

const acFromFc: Derivation = {
  key: 'ac_from_Fc',
  target: 'ac',
  needs: ['Fc', 'm'],
  formulaId: 'F12',
  title: 'ac',
  unit: 'm/s2',
  compute: (v) => n(v, 'Fc') / n(v, 'm'),
  tex: () => 'a_c = \\frac{F_c}{m}',
  text: () => 'a_c = F_c/m',
  subTex: (v, F) => `\\frac{${F.qt(n(v, 'Fc'), 'N')}}{${F.qt(n(v, 'm'), 'kg')}}`,
  subText: (v, F) => `${F.q(n(v, 'Fc'), 'N')}/(${F.q(n(v, 'm'), 'kg')})`,
};

/** Tabla 9.3: orden de cálculo según la fuente de rapidez. */
export const RATE_SEQUENCES: Record<RateField, Derivation[]> = {
  rpm: [fFromRpm, TFromF, omegaFromF, vFromOmega, acFromOmega, FcFromAc],
  f: [TFromF, rpmFromF, omegaFromF, vFromOmega, acFromOmega, FcFromAc],
  T: [fFromT, rpmFromF, omegaFromT, vFromT, acFromV, FcFromAc],
  omega: [fFromOmega, TFromOmega, rpmFromF, vFromOmega, acFromOmega, FcFromAc],
  v: [omegaFromV, fFromOmega, TFromV, rpmFromF, acFromV, FcFromAc],
  ac: [vFromAc, omegaFromV, fFromOmega, TFromF, rpmFromF, FcFromAc],
  Fc: [acFromFc, vFromAc, omegaFromV, fFromOmega, TFromF, rpmFromF],
};

const dthetaFromT: Derivation = {
  key: 'dtheta_from_t',
  target: 'dtheta',
  needs: ['omega', 't'],
  formulaId: 'F09',
  title: 'dtheta',
  unit: 'rad',
  compute: (v) => n(v, 'omega') * n(v, 't'),
  tex: () => '\\Delta\\theta = \\omega \\cdot t',
  text: () => 'Δθ = ω·t',
  subTex: (v, F) => `${F.qt(n(v, 'omega'), 'rad/s')} \\times ${F.qt(n(v, 't'), 's')}`,
  subText: (v, F) => `${F.q(n(v, 'omega'), 'rad/s')} × ${F.q(n(v, 't'), 's')}`,
};

const sFromDtheta: Derivation = {
  key: 's_from_dtheta',
  target: 's',
  needs: ['dtheta', 'rp'],
  formulaId: 'F03',
  title: 's',
  unit: 'm',
  compute: (v) => n(v, 'dtheta') * n(v, 'rp'),
  tex: (r) => `s = \\Delta\\theta \\cdot ${r.tex}`,
  text: (r) => `s = Δθ·${r.text}`,
  subTex: (v, F) => `${F.qt(n(v, 'dtheta'), 'rad')} \\times ${F.qt(n(v, 'rp'), 'm')}`,
  subText: (v, F) => `${F.q(n(v, 'dtheta'), 'rad')} × ${F.q(n(v, 'rp'), 'm')}`,
};

const tFromDtheta: Derivation = {
  key: 't_from_dtheta',
  target: 't',
  needs: ['dtheta', 'omega'],
  formulaId: 'F09',
  title: 't',
  unit: 's',
  compute: (v) => n(v, 'dtheta') / n(v, 'omega'),
  tex: () => 't = \\frac{\\Delta\\theta}{\\omega}',
  text: () => 't = Δθ/ω',
  subTex: (v, F) => `\\frac{${F.qt(n(v, 'dtheta'), 'rad')}}{${F.qt(n(v, 'omega'), 'rad/s')}}`,
  subText: (v, F) => `${F.q(n(v, 'dtheta'), 'rad')}/(${F.q(n(v, 'omega'), 'rad/s')})`,
};

const dthetaFromS: Derivation = {
  key: 'dtheta_from_s',
  target: 'dtheta',
  needs: ['s', 'rp'],
  formulaId: 'F03',
  title: 'dtheta',
  unit: 'rad',
  compute: (v) => n(v, 's') / n(v, 'rp'),
  tex: (r) => `\\Delta\\theta = \\frac{s}{${r.tex}}`,
  text: (r) => `Δθ = s/${r.text}`,
  subTex: (v, F) => `\\frac{${F.qt(n(v, 's'), 'm')}}{${F.qt(n(v, 'rp'), 'm')}}`,
  subText: (v, F) => `${F.q(n(v, 's'), 'm')}/(${F.q(n(v, 'rp'), 'm')})`,
};

/** Tabla 9.5: orden de cálculo del panel D según su fuente. */
export const TIME_SEQUENCES: Record<TimeField, Derivation[]> = {
  t: [dthetaFromT, sFromDtheta],
  dtheta: [tFromDtheta, sFromDtheta],
  s: [dthetaFromS, tFromDtheta],
};

export const turnsFromDtheta: Derivation = {
  key: 'N_from_dtheta',
  target: 'N',
  needs: ['dtheta'],
  formulaId: 'F09',
  title: 'N',
  unit: 'turns',
  compute: (v) => n(v, 'dtheta') / TWO_PI,
  tex: () => 'N = \\frac{\\Delta\\theta}{2\\pi}',
  text: () => 'N = Δθ/2π',
  subTex: (v, F) => `\\frac{${F.qt(n(v, 'dtheta'), 'rad')}}{2\\pi}`,
  subText: (v, F) => `${F.q(n(v, 'dtheta'), 'rad')}/(2π)`,
};

/** Aplica las derivaciones cuyos datos existen; devuelve las que se aplicaron. */
export function runChain(
  seq: Derivation[],
  si: SiValues,
  status: Record<string, FieldStatus>,
): Derivation[] {
  const applied: Derivation[] = [];
  for (const d of seq) {
    if (d.needs.every((k) => si[k] !== undefined)) {
      si[d.target] = d.compute(si);
      status[d.target] = 'computed';
      applied.push(d);
    }
  }
  return applied;
}
