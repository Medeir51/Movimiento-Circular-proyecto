import { es, fill } from '../../i18n/es';
import {
  defaultBankedInputs,
  defaultFlatInputs,
  defaultOrbitInputs,
} from '../applications/defaults';
import { solveFlatCurve } from '../applications/flatCurve';
import { solveOrbit } from '../applications/orbit';
import type { BankedCurveInputs, FlatCurveInputs, OrbitInputs } from '../applications/types';
import { TWO_PI } from '../constants';
import { blankState, defaultUnits } from '../defaults';
import { createFmt } from '../fmt';
import { solveMCU } from '../mcu';
import { solveMCUV } from '../mcuv';
import { formatExact, formatNumber } from '../numberFormat';
import { conversionStep, makeStep } from '../steps';
import { UNIT_LISTS, toSI } from '../units';
import type { AppState, KinVar, RateField, Settings, Step, UnitId } from '../types';
import { exerciseSeed, mulberry32, pickStepped } from './prng';

/** Plantillas de ejercicios (18.2). */

export const TEMPLATE_IDS = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10'] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export interface Question {
  id: string;
  label: string;
  /** Respuesta en SI. */
  answer: number;
  /** Unidad en que se pide (y en que se muestra en la clave). */
  unit: UnitId;
  units: readonly UnitId[];
  /** Fórmula que se muestra como pista. */
  formulaId: string;
}

export type ExerciseLoad =
  | { target: 'simulator'; state: AppState }
  | { target: 'flat'; inputs: FlatCurveInputs }
  | { target: 'banked'; inputs: BankedCurveInputs }
  | { target: 'orbit'; inputs: OrbitInputs };

export interface Exercise {
  templateId: TemplateId;
  title: string;
  statement: string;
  data: Record<string, number>;
  questions: Question[];
  steps: Step[];
  load: ExerciseLoad;
}

type Data = Record<string, number>;
type Built = Pick<Exercise, 'questions' | 'steps' | 'load'>;

interface Template {
  generate: (rng: () => number) => Data;
  build: (d: Data, s: Settings) => Built;
}

const OMEGA_UNITS = ['rad/s', 'deg/s', 'rpm', 'rev/s'] as const;
const TURN_UNITS = ['rev', 'rad', 'deg'] as const;

const texts = es.exercises.templatesText;

function only(steps: Step[], ids: string[]): Step[] {
  return ids.flatMap((id) => steps.filter((s) => s.id === id));
}

interface McuSpec {
  radius: [string, UnitId];
  editedAs: 'r' | 'd';
  source: RateField;
  sourceValue: [string, UnitId];
  mass?: [string, UnitId];
  custom?: [string, UnitId];
}

function mcuState(s: Settings, o: McuSpec): AppState {
  const st = blankState(s);
  st.geometry.radius = { text: o.radius[0], unit: o.radius[1] };
  st.geometry.radiusEditedAs = o.editedAs;
  if (o.custom)
    st.geometry.point = { kind: 'custom', custom: { text: o.custom[0], unit: o.custom[1] } };
  st.mcu.rateSource = o.source;
  st.mcu.rate[o.source] = { text: o.sourceValue[0], unit: o.sourceValue[1] };
  if (o.mass) st.mass = { text: o.mass[0], unit: o.mass[1] };
  return st;
}

function mcuvState(s: Settings, values: Array<[KinVar, string, UnitId]>): AppState {
  const st = blankState(s);
  st.mode = 'MCUV';
  st.geometry.radius = { text: '50', unit: 'cm' };
  st.geometry.radiusEditedAs = 'd';
  for (const [k, text, unit] of values) {
    st.mcuv.fields[k] = { text, unit };
    st.mcuv.knowns.push(k);
  }
  return st;
}

const ex = (n: number) => formatExact(n);

const TEMPLATES: Record<TemplateId, Template> = {
  E1: {
    generate: (rng) => ({ d: pickStepped(rng, 40, 80, 2), n: pickStepped(rng, 60, 300, 10) }),
    build: (d, s) => {
      const st = mcuState(s, {
        radius: [ex(d.d), 'cm'],
        editedAs: 'd',
        source: 'rpm',
        sourceValue: [ex(d.n), 'rev/min'],
      });
      const r = solveMCU(st, s);
      const q = texts.E1.q;
      return {
        questions: [
          {
            id: 'f',
            label: q.f,
            answer: r.si.f as number,
            unit: 'Hz',
            units: ['Hz'],
            formulaId: 'F05',
          },
          {
            id: 'T',
            label: q.T,
            answer: r.si.T as number,
            unit: 's',
            units: UNIT_LISTS.time,
            formulaId: 'F04',
          },
          {
            id: 'omega',
            label: q.omega,
            answer: r.si.omega as number,
            unit: 'rad/s',
            units: OMEGA_UNITS,
            formulaId: 'F07',
          },
          {
            id: 'v',
            label: q.v,
            answer: r.si.v as number,
            unit: 'm/s',
            units: UNIT_LISTS.velocity,
            formulaId: 'F10',
          },
        ],
        steps: only(r.steps, [
          'conv-d',
          'r',
          'f_from_rpm',
          'T_from_f',
          'omega_from_f',
          'v_from_omega',
        ]),
        load: { target: 'simulator', state: st },
      };
    },
  },
  E2: {
    generate: (rng) => ({ r: pickStepped(rng, 0.1, 0.5, 0.05), v: pickStepped(rng, 1, 10, 0.5) }),
    build: (d, s) => {
      const st = mcuState(s, {
        radius: [ex(d.r), 'm'],
        editedAs: 'r',
        source: 'v',
        sourceValue: [ex(d.v), 'm/s'],
      });
      const r = solveMCU(st, s);
      const q = texts.E2.q;
      return {
        questions: [
          {
            id: 'omega',
            label: q.omega,
            answer: r.si.omega as number,
            unit: 'rad/s',
            units: OMEGA_UNITS,
            formulaId: 'F10',
          },
          {
            id: 'ac',
            label: q.ac,
            answer: r.si.ac as number,
            unit: 'm/s2',
            units: UNIT_LISTS.acceleration,
            formulaId: 'F11',
          },
        ],
        steps: only(r.steps, ['omega_from_v', 'ac_from_v']),
        load: { target: 'simulator', state: st },
      };
    },
  },
  E3: {
    generate: (rng) => ({
      m: pickStepped(rng, 0.1, 2, 0.1),
      r: pickStepped(rng, 0.3, 1.5, 0.1),
      N: pickStepped(rng, 5, 30, 1),
      t: pickStepped(rng, 5, 20, 1),
    }),
    build: (d, s) => {
      const F = createFmt(s.sigFigs, s.g);
      const T = d.t / d.N;
      const st = mcuState(s, {
        radius: [ex(d.r), 'm'],
        editedAs: 'r',
        source: 'T',
        sourceValue: [ex(T), 's'],
        mass: [ex(d.m), 'kg'],
      });
      const r = solveMCU(st, s);
      const q = texts.E3.q;
      const periodStep = makeStep(
        {
          id: 'T',
          title: es.steps.titles.periodFromTurns,
          formulaId: 'F06',
          formulaTex: 'T = \\frac{t}{N}',
          formulaText: 'T = t/N',
          subTex: `\\frac{${F.qt(d.t, 's')}}{${F.nt(d.N)}}`,
          subText: `${F.q(d.t, 's')}/${F.n(d.N)}`,
          value: T,
          unit: 's',
        },
        F,
      );
      return {
        questions: [
          { id: 'T', label: q.T, answer: T, unit: 's', units: UNIT_LISTS.time, formulaId: 'F06' },
          {
            id: 'v',
            label: q.v,
            answer: r.si.v as number,
            unit: 'm/s',
            units: UNIT_LISTS.velocity,
            formulaId: 'F10',
          },
          {
            id: 'tension',
            label: q.tension,
            answer: r.si.Fc as number,
            unit: 'N',
            units: UNIT_LISTS.force,
            formulaId: 'F12',
          },
        ],
        steps: [periodStep, ...only(r.steps, ['v_from_T', 'ac_from_v', 'Fc_from_ac'])],
        load: { target: 'simulator', state: st },
      };
    },
  },
  E4: {
    generate: (rng) => ({
      n: pickStepped(rng, 30, 90, 5),
      r1: pickStepped(rng, 2, 8, 1),
      r2: pickStepped(rng, 10, 20, 1),
    }),
    build: (d, s) => {
      const F = createFmt(s.sigFigs, s.g);
      const w = (d.n * TWO_PI) / 60;
      const r1 = toSI(d.r1, 'cm');
      const r2 = toSI(d.r2, 'cm');
      const v1 = w * r1;
      const v2 = w * r2;
      const q = texts.E4.q;
      const T = es.steps.titles;
      const steps: Step[] = [
        conversionStep(
          {
            id: 'conv-r1',
            title: T.convertLength,
            symText: 'r1',
            symTex: 'r_1',
            valueSI: r1,
            unit: 'cm',
          },
          F,
        ),
        conversionStep(
          {
            id: 'conv-r2',
            title: T.convertLength,
            symText: 'r2',
            symTex: 'r_2',
            valueSI: r2,
            unit: 'cm',
          },
          F,
        ),
        makeStep(
          {
            id: 'omega',
            title: T.omega,
            formulaId: 'F08',
            formulaTex: '\\omega = \\mathrm{rpm} \\cdot \\frac{2\\pi}{60}',
            formulaText: 'ω = rpm·2π/60',
            subTex: `${F.nt(d.n)} \\times \\frac{2\\pi}{60}`,
            subText: `${F.n(d.n)} × 2π/60`,
            value: w,
            unit: 'rad/s',
          },
          F,
        ),
        makeStep(
          {
            id: 'v1',
            title: `${T.v} (r1)`,
            formulaId: 'F10',
            formulaTex: 'v_1 = \\omega \\cdot r_1',
            formulaText: 'v1 = ω·r1',
            subTex: `${F.qt(w, 'rad/s')} \\times ${F.qt(r1, 'm')}`,
            subText: `${F.q(w, 'rad/s')} × ${F.q(r1, 'm')}`,
            value: v1,
            unit: 'm/s',
          },
          F,
        ),
        makeStep(
          {
            id: 'v2',
            title: `${T.v} (r2)`,
            formulaId: 'F10',
            formulaTex: 'v_2 = \\omega \\cdot r_2',
            formulaText: 'v2 = ω·r2',
            subTex: `${F.qt(w, 'rad/s')} \\times ${F.qt(r2, 'm')}`,
            subText: `${F.q(w, 'rad/s')} × ${F.q(r2, 'm')}`,
            value: v2,
            unit: 'm/s',
          },
          F,
        ),
        makeStep(
          {
            id: 'ratio',
            title: T.ratio,
            formulaId: 'F11',
            formulaTex:
              '\\frac{a_{c2}}{a_{c1}} = \\frac{\\omega^2 r_2}{\\omega^2 r_1} = \\frac{r_2}{r_1}',
            formulaText: 'a_c2/a_c1 = (ω²·r2)/(ω²·r1) = r2/r1',
            subTex: `\\frac{${F.qt(r2, 'm')}}{${F.qt(r1, 'm')}}`,
            subText: `${F.q(r2, 'm')}/(${F.q(r1, 'm')})`,
            value: r2 / r1,
            unit: 'one',
          },
          F,
        ),
      ];
      const st = mcuState(s, {
        radius: [ex(d.r2), 'cm'],
        editedAs: 'r',
        source: 'rpm',
        sourceValue: [ex(d.n), 'rev/min'],
        custom: [ex(d.r1), 'cm'],
      });
      return {
        questions: [
          {
            id: 'v1',
            label: q.v1,
            answer: v1,
            unit: 'm/s',
            units: UNIT_LISTS.velocity,
            formulaId: 'F10',
          },
          {
            id: 'v2',
            label: q.v2,
            answer: v2,
            unit: 'm/s',
            units: UNIT_LISTS.velocity,
            formulaId: 'F10',
          },
          {
            id: 'ratio',
            label: q.ratio,
            answer: r2 / r1,
            unit: 'one',
            units: ['one'],
            formulaId: 'F11',
          },
        ],
        steps,
        load: { target: 'simulator', state: st },
      };
    },
  },
  E5: {
    generate: (rng) => ({ n: pickStepped(rng, 120, 600, 30), t: pickStepped(rng, 2, 10, 1) }),
    build: (d, s) => {
      const st = mcuvState(s, [
        ['omega0', '0', 'rpm'],
        ['omegaF', ex(d.n), 'rpm'],
        ['t', ex(d.t), 's'],
      ]);
      const r = solveMCUV(st, s);
      const q = texts.E5.q;
      return {
        questions: [
          {
            id: 'alpha',
            label: q.alpha,
            answer: r.si.alpha as number,
            unit: 'rad/s2',
            units: UNIT_LISTS.angularAcceleration,
            formulaId: 'F15',
          },
          {
            id: 'turns',
            label: q.turns,
            answer: r.si.dtheta as number,
            unit: 'rev',
            units: TURN_UNITS,
            formulaId: 'F18',
          },
        ],
        steps: only(r.steps, ['conv-omegaF', 'alpha', 'dtheta', 'N_from_dtheta']),
        load: { target: 'simulator', state: st },
      };
    },
  },
  E6: {
    generate: (rng) => ({ n: pickStepped(rng, 200, 800, 50), a: pickStepped(rng, 2, 10, 1) }),
    build: (d, s) => {
      const st = mcuvState(s, [
        ['omega0', ex(d.n), 'rpm'],
        ['alpha', ex(-d.a), 'rad/s2'],
        ['omegaF', '0', 'rpm'],
      ]);
      const r = solveMCUV(st, s);
      const q = texts.E6.q;
      return {
        questions: [
          {
            id: 't',
            label: q.t,
            answer: r.si.t as number,
            unit: 's',
            units: UNIT_LISTS.time,
            formulaId: 'F15',
          },
          {
            id: 'turns',
            label: q.turns,
            answer: r.si.dtheta as number,
            unit: 'rev',
            units: TURN_UNITS,
            formulaId: 'F17',
          },
        ],
        steps: only(r.steps, ['conv-omega0', 't', 'dtheta', 'N_from_dtheta']),
        load: { target: 'simulator', state: st },
      };
    },
  },
  E7: {
    generate: (rng) => ({ R: pickStepped(rng, 30, 200, 10), mu: pickStepped(rng, 0.3, 0.9, 0.05) }),
    build: (d, s) => {
      const inputs = defaultFlatInputs(defaultUnits(s.startUnits));
      inputs.R = { text: ex(d.R), unit: 'm' };
      inputs.mu = { text: ex(d.mu), unit: 'one' };
      inputs.v = { text: '', unit: 'km/h' };
      const r = solveFlatCurve(inputs, s);
      return {
        questions: [
          {
            id: 'vmax',
            label: texts.E7.q.vmax,
            answer: r.values.vmax as number,
            unit: 'km/h',
            units: UNIT_LISTS.velocity,
            formulaId: 'F22',
          },
        ],
        steps: r.steps,
        load: { target: 'flat', inputs },
      };
    },
  },
  E8: {
    generate: (rng) => ({ R: pickStepped(rng, 50, 300, 10), v: pickStepped(rng, 40, 120, 10) }),
    build: (d, s) => {
      const F = createFmt(s.sigFigs, s.g);
      const v = toSI(d.v, 'km/h');
      const beta = Math.atan((v * v) / (d.R * s.g));
      const steps: Step[] = [
        conversionStep(
          {
            id: 'conv-v',
            title: es.steps.titles.convertV,
            symText: 'v',
            symTex: 'v',
            valueSI: v,
            unit: 'km/h',
          },
          F,
        ),
        makeStep(
          {
            id: 'beta',
            title: es.steps.titles.beta,
            formulaId: 'F23',
            formulaTex: '\\beta = \\arctan\\frac{v^2}{R\\,g}',
            formulaText: 'β = atan(v²/(R·g))',
            subTex: `\\arctan\\frac{(${F.qt(v, 'm/s')})^2}{${F.qt(d.R, 'm')} \\times ${F.qt(s.g, 'm/s2')}}`,
            subText: `atan((${F.q(v, 'm/s')})²/(${F.q(d.R, 'm')} × ${F.q(s.g, 'm/s2')}))`,
            value: beta,
            unit: 'deg',
          },
          F,
        ),
      ];
      const inputs = defaultBankedInputs(defaultUnits(s.startUnits));
      inputs.R = { text: ex(d.R), unit: 'm' };
      inputs.v = { text: ex(d.v), unit: 'km/h' };
      inputs.mu = { text: '0', unit: 'one' };
      inputs.beta = { text: ex((beta * 180) / Math.PI), unit: 'deg' };
      return {
        questions: [
          {
            id: 'beta',
            label: texts.E8.q.beta,
            answer: beta,
            unit: 'deg',
            units: ['deg', 'rad'],
            formulaId: 'F23',
          },
        ],
        steps,
        load: { target: 'banked', inputs },
      };
    },
  },
  E9: {
    generate: (rng) => ({ h: pickStepped(rng, 300, 36000, 100) }),
    build: (d, s) => {
      const inputs = defaultOrbitInputs(defaultUnits(s.startUnits));
      inputs.body = 'earth';
      inputs.source = 'h';
      inputs.h = { text: ex(d.h), unit: 'km' };
      inputs.R = { text: '', unit: 'km' };
      inputs.T = { text: '', unit: 'min' };
      inputs.m = { text: '', unit: 'kg' };
      const r = solveOrbit(inputs, s);
      const q = texts.E9.q;
      return {
        questions: [
          {
            id: 'v',
            label: q.v,
            answer: r.values.v as number,
            unit: 'km/s',
            units: UNIT_LISTS.velocity,
            formulaId: 'F26',
          },
          {
            id: 'T',
            label: q.T,
            answer: r.values.T as number,
            unit: 'min',
            units: UNIT_LISTS.time,
            formulaId: 'F27',
          },
        ],
        steps: only(r.steps, ['conv-h', 'R', 'v', 'T']),
        load: { target: 'orbit', inputs },
      };
    },
  },
  E10: {
    generate: (rng) => ({ d: pickStepped(rng, 40, 56, 2), n: pickStepped(rng, 600, 1400, 100) }),
    build: (d, s) => {
      const F = createFmt(s.sigFigs, s.g);
      const st = mcuState(s, {
        radius: [ex(d.d), 'cm'],
        editedAs: 'd',
        source: 'rpm',
        sourceValue: [ex(d.n), 'rev/min'],
      });
      st.geometry.style = 'disc';
      const r = solveMCU(st, s);
      const ac = r.si.ac as number;
      const inG = makeStep(
        {
          id: 'acG',
          title: es.steps.titles.acInG,
          formulaId: 'F21',
          formulaTex: 'n = \\frac{a_c}{g}',
          formulaText: 'n = a_c/g',
          subTex: `\\frac{${F.qt(ac, 'm/s2')}}{${F.qt(s.g, 'm/s2')}}`,
          subText: `${F.q(ac, 'm/s2')}/(${F.q(s.g, 'm/s2')})`,
          value: ac,
          unit: 'g',
        },
        F,
      );
      const q = texts.E10.q;
      return {
        questions: [
          {
            id: 'ac',
            label: q.ac,
            answer: ac,
            unit: 'm/s2',
            units: UNIT_LISTS.acceleration,
            formulaId: 'F11',
          },
          {
            id: 'acG',
            label: q.acG,
            answer: ac,
            unit: 'g',
            units: UNIT_LISTS.acceleration,
            formulaId: 'F21',
          },
        ],
        steps: [
          ...only(r.steps, ['conv-d', 'r', 'f_from_rpm', 'omega_from_f', 'ac_from_omega']),
          inG,
        ],
        load: { target: 'simulator', state: st },
      };
    },
  },
};

/** Datos de una plantilla para un código, un número de estudiante y una semilla. */
export function generateData(code: string, student: number, templateId: TemplateId): Data {
  const rng = mulberry32(exerciseSeed(code, student, templateId));
  return TEMPLATES[templateId].generate(rng);
}

export function generateExercise(
  code: string,
  student: number,
  templateId: TemplateId,
  settings: Settings,
): Exercise {
  const data = generateData(code, student, templateId);
  const built = TEMPLATES[templateId].build(data, settings);
  const shown: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) shown[k] = formatNumber(v, 6);
  return {
    templateId,
    title: texts[templateId].title,
    statement: fill(texts[templateId].statement, shown),
    data,
    ...built,
  };
}
