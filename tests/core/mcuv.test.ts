import { describe, expect, it } from 'vitest';
import { blankState } from '../../src/core/defaults';
import { editMcuv, setMode, setUnit, solve, togglePin } from '../../src/core/edits';
import { instant, instantFromMotion, sample, traveledAngle } from '../../src/core/kinematics';
import {
  COMBINATIONS,
  combinationOf,
  solveKinematics,
  verifyKinematics,
} from '../../src/core/mcuv';
import type { KinValues } from '../../src/core/mcuv';
import type { AppState, KinVar } from '../../src/core/types';
import { stepsToText } from '../../src/core/steps';
import { expectClose, preset } from './helpers';

function solved(k: Partial<KinValues>, combo: number): KinValues {
  const r = solveKinematics(k, combo);
  if (!r.ok) throw new Error(`falló: ${r.code}`);
  expect(verifyKinematics(r.values)).toBe(true);
  return r.values;
}

function mcuvState(values: Array<[KinVar, string, string]>, radius?: [string, string]): AppState {
  let st = blankState();
  st.mode = 'MCUV';
  st.geometry.radius = radius ? { text: radius[0], unit: radius[1] } : { text: '0,33', unit: 'm' };
  st.geometry.radiusEditedAs = 'r';
  for (const [k, text, unit] of values) {
    st = setUnit(st, { kind: 'mcuv', field: k }, unit);
    st = editMcuv(st, k, text).state;
  }
  return st;
}

describe('22.3 MCUV: las 10 combinaciones', () => {
  it('V1 (comb. 1): ω0 = 0; ω_f = 300 rpm; t = 5 s', () => {
    const r = solve(
      mcuvState([
        ['omega0', '0', 'rpm'],
        ['omegaF', '300', 'rpm'],
        ['t', '5', 's'],
      ]),
    );
    expect(r.combination).toBe(1);
    expectClose(r.si.alpha, 6.28319);
    expectClose(r.si.dtheta, 78.5398);
    expectClose(r.si.N, 12.5);
  });

  it('V2 (comb. 2)', () => {
    const v = solved({ omega0: 20, omegaF: 0, alpha: -4 }, 2);
    expectClose(v.t, 5);
    expectClose(v.dtheta, 50);
  });

  it('V3 (comb. 3)', () => {
    const v = solved({ omega0: 4, omegaF: 8, dtheta: 12 }, 3);
    expectClose(v.alpha, 2);
    expectClose(v.t, 2);
  });

  it('V4 (comb. 4)', () => {
    const v = solved({ omega0: 2, alpha: 3, t: 2 }, 4);
    expectClose(v.omegaF, 8);
    expectClose(v.dtheta, 10);
  });

  it('V5 (comb. 5): menor raíz positiva', () => {
    const v = solved({ omega0: 10, alpha: -2, dtheta: 21 }, 5);
    expectClose(v.t, 3);
    expectClose(v.omegaF, 4);
  });

  it('V6 (comb. 5, error): E-MCUV-STOP con Δθ_max = 25 rad', () => {
    const r = solveKinematics({ omega0: 10, alpha: -2, dtheta: 30 }, 5);
    expect(r).toMatchObject({ ok: false, code: 'E-MCUV-STOP' });
    if (!r.ok) expectClose(r.dthetaMax, 25);
    const st = mcuvState([
      ['omega0', '10', 'rad/s'],
      ['alpha', '-2', 'rad/s2'],
      ['dtheta', '30', 'rad'],
    ]);
    const res = solve(st);
    expect(res.errors[0].code).toBe('E-MCUV-STOP');
    expect(res.errors[0].params?.max).toEqual({ value: 25, unit: 'rad' });
  });

  it('V7 (comb. 6)', () => {
    const v = solved({ omega0: 2, t: 2, dtheta: 10 }, 6);
    expectClose(v.alpha, 3);
    expectClose(v.omegaF, 8);
  });

  it('V8 (comb. 7)', () => {
    const v = solved({ omegaF: 8, alpha: 3, t: 2 }, 7);
    expectClose(v.omega0, 2);
    expectClose(v.dtheta, 10);
  });

  it('V9 (comb. 8)', () => {
    const v = solved({ omegaF: 10, alpha: 2, dtheta: 16 }, 8);
    expectClose(v.omega0, 6);
    expectClose(v.t, 2);
  });

  it('V10 (comb. 9)', () => {
    const v = solved({ omegaF: 12, t: 4, dtheta: 32 }, 9);
    expectClose(v.omega0, 4);
    expectClose(v.alpha, 2);
  });

  it('V11 (comb. 10)', () => {
    const v = solved({ alpha: 3, t: 2, dtheta: 10 }, 10);
    expectClose(v.omega0, 2);
    expectClose(v.omegaF, 8);
  });

  it('V12 (comb. 2, error): E-MCUV-INDET', () => {
    expect(solveKinematics({ omega0: 5, omegaF: 5, alpha: 0 }, 2)).toMatchObject({
      ok: false,
      code: 'E-MCUV-INDET',
    });
  });

  it('V13 (inversión): W-REV con t_stop = 5 s', () => {
    const v = solved({ omega0: 10, alpha: -2, t: 8 }, 4);
    expectClose(v.omegaF, -6);
    expectClose(v.dtheta, 16);
    const r = solve(
      mcuvState([
        ['omega0', '10', 'rad/s'],
        ['alpha', '-2', 'rad/s2'],
        ['t', '8', 's'],
      ]),
    );
    expect(r.warnings.map((w) => w.code)).toContain('W-REV');
    expectClose(r.si.tStop, 5);
    expectClose(r.si.dtheta, 16);
    expectClose(r.si.totalAngle, 34);
    expectClose(traveledAngle(r.motion!, 8), 34);
    expectClose(traveledAngle(r.motion!, 2), 16);
  });

  it('V14 (instantáneos): V1 con r = 0,33 m en τ = t', () => {
    const r = solve(
      mcuvState([
        ['omega0', '0', 'rpm'],
        ['omegaF', '300', 'rpm'],
        ['t', '5', 's'],
      ]),
    );
    const iv = instant(r, 5)!;
    expectClose(iv.at, 2.07345);
    expectClose(iv.ac, 325.697);
    expectClose(iv.a, 325.704);
    expectClose(iv.omega, 31.4159);
    expectClose(iv.turns, 12.5);
    expect(instant(r, 99)!.tau).toBe(5);
    expect(instant(r, -1)!.tau).toBe(0);
    expect(instant({ ...r, motion: null }, 1)).toBeNull();
  });

  it('V15 (regla de 3): editar ω0, ω_f, t, α', () => {
    let st = blankState();
    st.mode = 'MCUV';
    st = editMcuv(st, 'omega0', '0').state;
    st = editMcuv(st, 'omegaF', '300').state;
    st = editMcuv(st, 't', '5').state;
    const res = editMcuv(st, 'alpha', '2');
    expect(res.dropped).toBe('omega0');
    expect(res.state.mcuv.knowns).toEqual(['omegaF', 't', 'alpha']);
    st = res.state;
    st.geometry.radius = { text: '66', unit: 'cm' };
    const r = solve(st);
    expect(r.fieldStatus.omega0).toBe('computed');
    expect(r.combination).toBe(7);
  });

  it('las 10 combinaciones cumplen las 3 ecuaciones', () => {
    const truth: KinValues = { omega0: 3, omegaF: 11, alpha: 2, t: 4, dtheta: 28 };
    COMBINATIONS.forEach((combo, i) => {
      expect(combinationOf(combo)).toBe(i + 1);
      const known: Partial<KinValues> = {};
      for (const k of combo) known[k] = truth[k];
      const v = solved(known, i + 1);
      for (const k of Object.keys(truth) as KinVar[]) expectClose(v[k], truth[k], 1e-9);
    });
    // Con frenado y con valores grandes.
    const brake: KinValues = { omega0: 50, omegaF: 10, alpha: -4, t: 10, dtheta: 300 };
    COMBINATIONS.forEach((combo, i) => {
      const known: Partial<KinValues> = {};
      for (const k of combo) known[k] = brake[k];
      const v = solved(known, i + 1);
      for (const k of Object.keys(brake) as KinVar[]) expectClose(v[k], brake[k], 1e-9);
    });
    expect(combinationOf(['omega0', 'omega0', 't'])).toBe(0);
    expect(verifyKinematics({ omega0: 1, omegaF: 5, alpha: 1, t: 1, dtheta: 1 })).toBe(false);
  });

  it('casos especiales de la tabla 10.3', () => {
    expect(solveKinematics({ omega0: 5, omegaF: 6, alpha: 0 }, 2)).toMatchObject({
      code: 'E-MCUV-ALPHA0',
    });
    expect(solveKinematics({ omega0: 5, omegaF: 6, alpha: -1 }, 2)).toMatchObject({
      code: 'E-MCUV-NEVER',
    });
    expect(solveKinematics({ omega0: 5, omegaF: -5, dtheta: 3 }, 3)).toMatchObject({
      code: 'E-MCUV-INDET',
      detail: 'sumZero',
    });
    expect(solveKinematics({ omega0: 5, omegaF: 6, dtheta: 0 }, 3)).toMatchObject({
      code: 'E-MCUV-INDET',
      detail: 'dthetaZero',
    });
    expect(solveKinematics({ omega0: 4, omegaF: 8, dtheta: -12 }, 3)).toMatchObject({
      code: 'E-MCUV-NEVER',
    });
    expect(solveKinematics({ omega0: 0, alpha: 0, dtheta: 3 }, 5)).toMatchObject({
      code: 'E-NOROT',
    });
    expect(solveKinematics({ omega0: 2, alpha: 0, dtheta: -3 }, 5)).toMatchObject({
      code: 'E-MCUV-NEVER',
    });
    expect(solveKinematics({ omega0: 2, alpha: 1, dtheta: -10 }, 5)).toMatchObject({
      code: 'E-MCUV-NEVER',
    });
    expect(solveKinematics({ omega0: 0, alpha: -1, dtheta: 0 }, 5)).toMatchObject({
      code: 'E-MCUV-NEVER',
    });
    expect(solveKinematics({ omegaF: 2, alpha: 1, dtheta: 10 }, 8)).toMatchObject({
      code: 'E-MCUV-IMPOSSIBLE',
    });
    expect(solveKinematics({ omegaF: 0, alpha: 0, dtheta: 10 }, 8)).toMatchObject({
      code: 'E-NOROT',
    });
    expect(solveKinematics({ omegaF: 6, alpha: 2, dtheta: 0 }, 8)).toMatchObject({
      code: 'E-MCUV-NEVER',
    });
    expect(solveKinematics({}, 11)).toMatchObject({ code: 'E-MCUV-IMPOSSIBLE' });
    const uniform5 = solveKinematics({ omega0: 2, alpha: 0, dtheta: 6 }, 5);
    expect(uniform5).toMatchObject({ ok: true, values: { t: 3, omegaF: 2 } });
    const uniform8 = solveKinematics({ omegaF: -2, alpha: 0, dtheta: -6 }, 8);
    expect(uniform8).toMatchObject({
      ok: true,
      values: { t: 3, omega0: -2 },
      warnings: ['W-W0NEG'],
    });
    const neg = solveKinematics({ omegaF: 2, alpha: 3, t: 2 }, 7);
    expect(neg).toMatchObject({ ok: true, warnings: ['W-W0NEG'] });
  });

  it('validaciones previas y a_t / s como datos', () => {
    let r = solve(
      mcuvState([
        ['omega0', '-1', 'rad/s'],
        ['omegaF', '3', 'rad/s'],
        ['t', '2', 's'],
      ]),
    );
    expect(r.errors.map((e) => e.code)).toContain('E-RANGE-W0');
    r = solve(
      mcuvState([
        ['omega0', '1', 'rad/s'],
        ['omegaF', '3', 'rad/s'],
        ['t', '0', 's'],
      ]),
    );
    expect(r.errors.map((e) => e.code)).toContain('E-RANGE-T');

    // a_t = 0,66 m/s² con r = 0,33 m → α = 2 rad/s²; s = 3,3 m → Δθ = 10 rad.
    let st = mcuvState([['omega0', '2', 'rad/s']]);
    st = editMcuv(st, 'at', '0,66').state;
    st = editMcuv(st, 's', '3,3').state;
    expect(st.mcuv.alphaEnteredAs).toBe('at');
    expect(st.mcuv.dthetaEnteredAs).toBe('s');
    r = solve(st);
    expectClose(r.si.alpha, 2);
    expectClose(r.si.dtheta, 10);
    expect(r.fieldStatus.at).toBe('input');
    expect(r.fieldStatus.alpha).toBe('computed');
    expect(stepsToText(r.steps)).toContain('α = a_t/r');
    expect(stepsToText(r.steps)).toContain('Δθ = s/r');

    const axis = {
      ...st,
      geometry: {
        ...st.geometry,
        point: { kind: 'axis' as const, custom: st.geometry.point.custom },
      },
    };
    expect(solve(axis).errors.map((e) => e.code)).toContain('E-AXIS');
  });

  it('con menos de 3 datos no se calcula nada', () => {
    const st = mcuvState([
      ['omega0', '2', 'rad/s'],
      ['t', '3', 's'],
    ]);
    const r = solve(st);
    expect(r.ok).toBe(true);
    expect(r.incomplete).toBe(true);
    expect(r.si.alpha).toBeUndefined();
    expect(r.motion).toBeNull();
  });

  it('alfileres: máximo 3 y la edición se rechaza si los otros 3 están fijos', () => {
    let st = mcuvState([
      ['omega0', '0', 'rad/s'],
      ['omegaF', '10', 'rad/s'],
      ['t', '5', 's'],
    ]);
    st = togglePin(st, 'omega0').state;
    st = togglePin(st, 'omegaF').state;
    st = togglePin(st, 't').state;
    expect(st.mcuv.pinned).toHaveLength(3);
    expect(editMcuv(st, 'alpha', '1').rejected).toBe(true);
    expect(togglePin(st, 'alpha').rejected).toBe(true);
    st = togglePin(st, 't').state;
    expect(st.mcuv.pinned).toEqual(['omega0', 'omegaF']);
    // Fijar un calculado lo vuelve dato con su valor actual y saca al más antiguo sin alfiler.
    const pinned = togglePin(st, 'alpha');
    expect(pinned.dropped).toBe('t');
    expect(pinned.state.mcuv.knowns).toEqual(['omega0', 'omegaF', 'alpha']);
    expectClose(solve(pinned.state).si.t, 5);
    // Borrar un dato lo saca de la lista.
    const cleared = editMcuv(pinned.state, 'alpha', '');
    expect(cleared.state.mcuv.knowns).toEqual(['omega0', 'omegaF']);
    expect(cleared.state.mcuv.pinned).toEqual(['omega0', 'omegaF']);
  });

  it('cambio de modo MCU ⇄ MCUV', () => {
    const mcuv = setMode(preset('bicycle'), 'MCUV', 0);
    expect(mcuv.mcuv.knowns).toEqual(['omega0']);
    expect(mcuv.mcuv.fields.omega0.unit).toBe('rpm');
    expect(mcuv.mcuv.fields.omega0.text).toBe('120');
    const st = editMcuv(editMcuv(mcuv, 'omegaF', '0').state, 'alpha', '-4').state;
    const back = setMode(st, 'MCU', 1);
    expect(back.mode).toBe('MCU');
    expect(back.mcu.rateSource).toBe('omega');
    const r = solve(back);
    expectClose(r.si.omega, 4 * Math.PI - 4);
    expect(setMode(back, 'MCU', 0)).toBe(back);
  });

  it('muestreo para las gráficas', () => {
    const r = solve(preset('motorStart'));
    const pts = sample(r.motion!, [0, 5], 200, (v) => v.omega);
    expect(pts).toHaveLength(200);
    expectClose(pts[199][1], 10 * Math.PI);
    const iv = instantFromMotion(r.motion!, 0);
    expect(iv.phi).toBe(90);
    expect(iv.Fc).toBe(0);
  });
});
