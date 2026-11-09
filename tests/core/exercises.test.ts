import { describe, expect, it } from 'vitest';
import { checkAnswer, withinTolerance } from '../../src/core/exercises/checker';
import {
  exerciseSeed,
  fnv1a,
  mulberry32,
  normalizeCode,
  pickStepped,
} from '../../src/core/exercises/prng';
import { TEMPLATE_IDS, generateData, generateExercise } from '../../src/core/exercises/templates';
import { DEFAULT_SETTINGS } from '../../src/core/defaults';
import { toSI } from '../../src/core/units';
import { solve } from '../../src/core/edits';
import { stepsToText } from '../../src/core/steps';
import { expectClose } from './helpers';

const CODE = 'FIS1-G3-2026';
const g = 9.8;

describe('22.6 Ejercicios', () => {
  it('X1: mismo código, número y plantilla → datos idénticos', () => {
    for (const id of TEMPLATE_IDS) {
      expect(generateData(CODE, 7, id)).toEqual(generateData(CODE, 7, id));
    }
    // El código no distingue mayúsculas ni espacios externos.
    expect(generateData(' fis1-g3-2026 ', 7, 'E1')).toEqual(generateData(CODE, 7, 'E1'));
  });

  it('X2: estudiantes 1 y 2 → datos distintos', () => {
    for (const id of TEMPLATE_IDS) {
      expect(generateData(CODE, 1, id), id).not.toEqual(generateData(CODE, 2, id));
    }
  });

  it('X3: respuesta correcta × 1,01 es correcta', () => {
    const ex = generateExercise(CODE, 3, 'E1', DEFAULT_SETTINGS);
    for (const q of ex.questions) {
      expect(checkAnswer(q.answer * 1.01, q.answer, g)).toEqual({ correct: true });
      expect(checkAnswer(q.answer * 1.05, q.answer, g).correct).toBe(false);
    }
  });

  it('X4: E1 pide ω y la respuesta es f → mensaje del factor 2π', () => {
    const ex = generateExercise(CODE, 4, 'E1', DEFAULT_SETTINGS);
    const f = ex.questions.find((q) => q.id === 'f')!.answer;
    const w = ex.questions.find((q) => q.id === 'omega')!;
    expect(checkAnswer(toSI(f, 'rad/s'), w.answer, g)).toEqual({ correct: false, hint: 'twoPi' });
  });

  it('X5: E1 pide v y se calculó con el diámetro', () => {
    const ex = generateExercise(CODE, 5, 'E1', DEFAULT_SETTINGS);
    const w = ex.questions.find((q) => q.id === 'omega')!.answer;
    const v = ex.questions.find((q) => q.id === 'v')!.answer;
    const wrong = w * (ex.data.d / 100);
    expect(checkAnswer(wrong, v, g)).toEqual({ correct: false, hint: 'diameter' });
  });

  it('X6: E7 en m/s con la unidad km/h seleccionada → factor 3,6', () => {
    const ex = generateExercise(CODE, 6, 'E7', DEFAULT_SETTINGS);
    const q = ex.questions[0];
    const typedMs = q.answer; // el estudiante escribe el valor en m/s
    expect(checkAnswer(toSI(typedMs, 'km/h'), q.answer, g)).toEqual({
      correct: false,
      hint: 'kmh',
    });
  });

  it('otros errores típicos', () => {
    expect(checkAnswer(12 * 60, 12, g)).toEqual({ correct: false, hint: 'minutes' });
    expect(checkAnswer(12 * 100, 12, g)).toEqual({ correct: false, hint: 'length' });
    expect(checkAnswer(12 * 4, 12, g)).toEqual({ correct: false, hint: 'diameterSquared' });
    expect(checkAnswer(12 * (180 / Math.PI), 12, g)).toEqual({ correct: false, hint: 'degrees' });
    expect(checkAnswer(12 / g, 12, g)).toEqual({ correct: false, hint: 'gUnit' });
    expect(checkAnswer(12 * 7, 12, g)).toEqual({ correct: false, hint: 'none' });
    expect(withinTolerance(0, 0)).toBe(true);
    expect(withinTolerance(1, 0)).toBe(false);
  });

  it('las 10 plantillas generan enunciado, preguntas y solución coherentes', () => {
    for (const id of TEMPLATE_IDS) {
      const ex = generateExercise(CODE, 11, id, DEFAULT_SETTINGS);
      expect(ex.statement).not.toMatch(/\{/);
      expect(ex.questions.length).toBeGreaterThan(0);
      expect(ex.steps.length, id).toBeGreaterThan(0);
      for (const q of ex.questions) {
        expect(Number.isFinite(q.answer), `${id} ${q.id}`).toBe(true);
        expect(q.units).toContain(q.unit);
      }
      if (ex.load.target === 'simulator') expect(solve(ex.load.state).ok, id).toBe(true);
    }
  });

  it('los datos están en los rangos y pasos de la tabla 18.2', () => {
    for (let n = 1; n <= 60; n++) {
      const e1 = generateData(CODE, n, 'E1');
      expect(e1.d).toBeGreaterThanOrEqual(40);
      expect(e1.d).toBeLessThanOrEqual(80);
      expect(e1.d % 2).toBe(0);
      expect(e1.n % 10).toBe(0);
      const e2 = generateData(CODE, n, 'E2');
      expect(Math.round(e2.r * 100) % 5).toBe(0);
      const e9 = generateData(CODE, n, 'E9');
      expect(e9.h).toBeGreaterThanOrEqual(300);
      expect(e9.h).toBeLessThanOrEqual(36000);
    }
  });

  it('valores concretos de las respuestas', () => {
    const e5 = generateExercise(CODE, 2, 'E5', DEFAULT_SETTINGS);
    const w = (e5.data.n * 2 * Math.PI) / 60;
    expectClose(e5.questions[0].answer, w / e5.data.t);
    expectClose(e5.questions[1].answer, (w * e5.data.t) / 2);
    const e6 = generateExercise(CODE, 2, 'E6', DEFAULT_SETTINGS);
    const w6 = (e6.data.n * 2 * Math.PI) / 60;
    expectClose(e6.questions[0].answer, w6 / e6.data.a);
    const e8 = generateExercise(CODE, 2, 'E8', DEFAULT_SETTINGS);
    const v = e8.data.v / 3.6;
    expectClose(e8.questions[0].answer, Math.atan((v * v) / (e8.data.R * g)));
    const e10 = generateExercise(CODE, 2, 'E10', DEFAULT_SETTINGS);
    expect(stepsToText(e10.steps)).toContain('n = a_c/g');
    const e4 = generateExercise(CODE, 2, 'E4', DEFAULT_SETTINGS);
    expectClose(e4.questions[2].answer, e4.data.r2 / e4.data.r1);
  });

  it('PRNG con semilla', () => {
    expect(fnv1a('')).toBe(0x811c9dc5);
    expect(fnv1a('a')).toBe(0xe40c292c);
    const a = mulberry32(42);
    const b = mulberry32(42);
    const xs = Array.from({ length: 5 }, () => a());
    expect(xs).toEqual(Array.from({ length: 5 }, () => b()));
    for (const x of xs) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
    expect(normalizeCode('  ab-c ')).toBe('AB-C');
    expect(exerciseSeed('x', 1, 'E1')).toBe(fnv1a('X#1#E1'));
    expect(pickStepped(() => 0.999999, 0.1, 0.5, 0.05)).toBe(0.5);
    expect(pickStepped(() => 0, 0.1, 0.5, 0.05)).toBe(0.1);
  });
});
