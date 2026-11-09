import { describe, expect, it } from 'vitest';
import { bankedCurve, solveBankedCurve } from '../../src/core/applications/bankedCurve';
import { flatCurve, solveFlatCurve } from '../../src/core/applications/flatCurve';
import { orbit, solveOrbit } from '../../src/core/applications/orbit';
import {
  defaultBankedInputs,
  defaultFlatInputs,
  defaultOrbitInputs,
} from '../../src/core/applications/defaults';
import { BODIES } from '../../src/core/constants';
import { defaultUnits } from '../../src/core/defaults';
import { stepsToText } from '../../src/core/steps';
import { expectClose } from './helpers';

const g = 9.8;
const deg = Math.PI / 180;
const S = { g, sigFigs: 4 };
const U = defaultUnits('practical');
const earth = BODIES.earth;

describe('22.4 Aplicaciones', () => {
  it('A1: curva plana R = 50 m, μ_s = 0,7', () => {
    const r = flatCurve({ R: 50, mu: 0.7 }, g);
    expectClose(r.vmax, 18.5203);
    expectClose(r.vmax * 3.6, 66.673);
  });

  it('A2: con m = 1000 kg y v = 72 km/h derrapa', () => {
    const r = flatCurve({ R: 50, mu: 0.7, m: 1000, v: 20 }, g);
    expectClose(r.Fc, 8000);
    expectClose(r.fmax, 6860);
    expect(r.skids).toBe(true);
    const inputs = { ...defaultFlatInputs(U), v: { text: '72', unit: 'km/h' } };
    const s = solveFlatCurve(inputs, S);
    expect(s.ok).toBe(true);
    expect(s.values.skids).toBe(1);
    expect(stepsToText(s.steps)).toContain('v_max = √(μ_s·g·R)');
    expect(s.steps.find((st) => st.id === 'vmax')?.altText).toBe('66,67 km/h');
    expect(flatCurve({ R: 50, mu: 0, m: 1000, v: 0 }, g).usage).toBe(0);
  });

  it('A3: peralte sin fricción R = 100 m, v = 72 km/h', () => {
    const r = bankedCurve({ R: 100, beta: 0, mu: 0, v: 20 }, g);
    expectClose((r.betaIdeal as number) / deg, 22.2035);
  });

  it('A4: R = 100, β = 15°, μ_s = 0,4', () => {
    const r = bankedCurve({ R: 100, beta: 15 * deg, mu: 0.4 }, g);
    expectClose(r.vMax, 27.0771);
    expectClose(r.vMax * 3.6, 97.478);
    expect(r.vMin).toBe(0);
  });

  it('A5: R = 100, β = 30°, μ_s = 0,2', () => {
    const r = bankedCurve({ R: 100, beta: 30 * deg, mu: 0.2 }, g);
    expectClose(r.vIdeal, 23.7866);
    expectClose(r.vMax, 29.3471);
    expectClose(r.vMin, 18.2078);
  });

  it('A6: R = 100, β = 15°, m = 1000, v = 25 m/s', () => {
    const r = bankedCurve({ R: 100, beta: 15 * deg, mu: 0.4, m: 1000, v: 25 }, g);
    expectClose(r.Nf, 11083.7);
    expectClose(r.f, 3500.61);
    expectClose(r.muMin, 0.31583);
    expect(r.holds).toBe(true);
  });

  it('peralte: sin rapidez máxima y validaciones', () => {
    const r = bankedCurve({ R: 100, beta: 60 * deg, mu: 1 }, g);
    expect(r.vMax).toBe(Number.POSITIVE_INFINITY);
    const inputs = { ...defaultBankedInputs(U), v: { text: '90', unit: 'km/h' } };
    const s = solveBankedCurve(inputs, S);
    expect(s.ok).toBe(true);
    expect(s.steps.map((st) => st.id)).toEqual([
      'conv-v',
      'vIdeal',
      'vMax',
      'vMin',
      'Nf',
      'f',
      'muMin',
      'betaIdeal',
    ]);
    const bad = solveBankedCurve({ ...inputs, beta: { text: '90', unit: 'deg' } }, S);
    expect(bad.errors[0].code).toBe('E-RANGE-BETA');
    const badMu = solveBankedCurve({ ...inputs, mu: { text: '3', unit: 'one' } }, S);
    expect(badMu.errors[0].code).toBe('E-RANGE-MU');
    const flatBadMu = solveFlatCurve(
      { ...defaultFlatInputs(U), mu: { text: '-1', unit: 'one' } },
      S,
    );
    expect(flatBadMu.errors[0].code).toBe('E-RANGE-MU');
  });

  it('A7: órbita de la Tierra con R = 384 400 km', () => {
    const r = orbit({ M: earth.M, Rbody: earth.R, source: 'R', value: 384400e3 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expectClose(r.values.v, 1018.31);
      expectClose(r.values.T, 2.37184e6);
      expectClose(r.values.T / 86400, 27.4518);
    }
  });

  it('A8: órbita con T = 86 164 s', () => {
    const r = orbit({ M: earth.M, Rbody: earth.R, source: 'T', value: 86164 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expectClose(r.values.R / 1000, 42164.2);
      expectClose(r.values.h / 1000, 35793);
      expectClose(r.values.v, 3074.67);
    }
  });

  it('A9: órbita con h = 420 km', () => {
    const r = orbit({ M: earth.M, Rbody: earth.R, source: 'h', value: 420e3, m: 1000 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expectClose(r.values.v, 7661.31);
      expectClose(r.values.T / 60, 92.8238);
      expectClose(r.values.ac, 8.64316);
      expectClose(r.values.F, 8643.16);
    }
    const s = solveOrbit(defaultOrbitInputs(U), S);
    expect(s.ok).toBe(true);
    expectClose(s.values.v, 7661.31);
    expect(stepsToText(s.steps)).toContain('R = R_cuerpo + h');
  });

  it('A10: h = −100 km → E-ORBIT-INSIDE', () => {
    expect(orbit({ M: earth.M, Rbody: earth.R, source: 'h', value: -100e3 })).toEqual({
      ok: false,
      code: 'E-ORBIT-INSIDE',
    });
    const s = solveOrbit({ ...defaultOrbitInputs(U), h: { text: '-100', unit: 'km' } }, S);
    expect(s.errors[0].code).toBe('E-ORBIT-INSIDE');
  });

  it('órbitas: fuente R y T, cuerpo personalizado y validaciones', () => {
    const base = defaultOrbitInputs(U);
    const byR = solveOrbit({ ...base, source: 'R', R: { text: '384400', unit: 'km' } }, S);
    expectClose(byR.values.v, 1018.31);
    expect(byR.steps.map((s) => s.id)).toContain('h');
    const byT = solveOrbit({ ...base, source: 'T', T: { text: '86164', unit: 's' } }, S);
    expectClose((byT.values.R as number) / 1000, 42164.2);
    const custom = solveOrbit(
      {
        ...base,
        body: 'custom',
        M: { text: '5,9722e24', unit: 'kg' },
        Rbody: { text: '6371', unit: 'km' },
      },
      S,
    );
    expectClose(custom.values.v, 7661.31);
    const badM = solveOrbit(
      { ...base, body: 'custom', M: { text: '0', unit: 'kg' }, Rbody: { text: '1', unit: 'km' } },
      S,
    );
    expect(badM.errors[0].code).toBe('E-RANGE-NEG');
    const badT = solveOrbit({ ...base, source: 'T', T: { text: '0', unit: 's' } }, S);
    expect(badT.errors[0].code).toBe('E-RANGE-T');
    const badR = solveOrbit({ ...base, source: 'R', R: { text: '-1', unit: 'km' } }, S);
    expect(badR.errors[0].code).toBe('E-RANGE-R');
  });
});
