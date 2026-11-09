import { describe, expect, it } from 'vitest';
import {
  editMass,
  editPointCustom,
  editRadius,
  editRate,
  editTheta0,
  editTime,
  makeReference,
  setDirection,
  setPointKind,
  setRadiusPolicy,
  setStyle,
  setUnit,
  solve,
} from '../../src/core/edits';
import { solveMCU } from '../../src/core/mcu';
import { stepsToText } from '../../src/core/steps';
import { formatExact } from '../../src/core/numberFormat';
import { expectClose, mcu, preset } from './helpers';

const codes = (r: ReturnType<typeof solve>) => [...r.errors, ...r.warnings].map((m) => m.code);

describe('22.2 MCU', () => {
  it('M1: bicicleta d = 66 cm, 120 rpm, m = 0,5 kg', () => {
    const r = solve(preset('bicycle'));
    expect(r.ok).toBe(true);
    expectClose(r.si.R, 0.33);
    expectClose(r.si.f, 2);
    expectClose(r.si.T, 0.5);
    expectClose(r.si.omega, 12.5664);
    expectClose(r.si.v, 4.1469);
    expectClose(r.si.ac, 52.1115);
    expectClose(r.si.Fc, 26.0558);
    expect(r.fieldStatus.rpm).toBe('input');
    expect(r.fieldStatus.f).toBe('computed');
    expect(r.fieldStatus.d).toBe('input');
    expect(r.fieldStatus.r).toBe('computed');
  });

  it('M1: el paso a paso coincide con la sección 11.3', () => {
    const r = solve(preset('bicycle'));
    expect(stepsToText(r.steps)).toBe(
      [
        '1. Convertir el diámetro a metros: d = 66 cm × (1 m / 100 cm) = 0,66 m',
        '2. Radio: r = d/2 = 0,66 m / 2 = 0,33 m',
        '3. Frecuencia: f = rpm/60 = 120/60 = 2 Hz',
        '4. Periodo: T = 1/f = 1/(2 Hz) = 0,5 s',
        '5. Velocidad angular: ω = 2πf = 2π × 2 Hz = 12,57 rad/s',
        '6. Velocidad lineal: v = ω·r = 12,57 rad/s × 0,33 m = 4,147 m/s',
        '7. Aceleración centrípeta: a_c = ω²·r = (12,57 rad/s)² × 0,33 m = 52,11 m/s²',
        '8. Fuerza centrípeta: F_c = m·a_c = 0,5 kg × 52,11 m/s² = 26,06 N',
      ].join('\n'),
    );
    expect(r.steps[0].formulaTex).toContain('\\frac{1\\,\\mathrm{m}}{100\\,\\mathrm{cm}}');
    expect(r.steps[2].formulaId).toBe('F05');
    expect(r.steps[1].altText).toBe('33 cm');
  });

  it('M2: d = 33 cm manteniendo ω', () => {
    const r = solve(editRadius(preset('bicycle'), 'd', '33'));
    expectClose(r.si.omega, 12.5664);
    expectClose(r.si.T, 0.5);
    expectClose(r.si.v, 2.0735);
    expectClose(r.si.ac, 26.0558);
    expectClose(r.si.Fc, 13.0279);
  });

  it('M3: d = 33 cm manteniendo v', () => {
    const st = setRadiusPolicy(preset('bicycle'), 'keepV');
    const r = solve(editRadius(st, 'd', '33'));
    expectClose(r.si.v, 4.1469);
    expectClose(r.si.omega, 25.1327);
    expectClose(r.si.rpm, 240);
    expectClose(r.si.ac, 104.223);
  });

  it('M4: r = 0,5 m, fuente v = 10 m/s, m = 1 kg', () => {
    const r = solve(mcu({ radius: ['0,5', 'm'], source: ['v', '10', 'm/s'], mass: ['1', 'kg'] }));
    expectClose(r.si.omega, 20);
    expectClose(r.si.f, 3.1831);
    expectClose(r.si.T, 0.314159);
    expectClose(r.si.rpm, 190.986);
    expectClose(r.si.ac, 200);
    expectClose(r.si.Fc, 200);
  });

  it('M5: r = 2 m, fuente a_c = 1 g', () => {
    const r = solve(mcu({ radius: ['2', 'm'], source: ['ac', '1', 'g'] }));
    expectClose(r.si.ac, 9.8);
    expectClose(r.si.v, 4.42719);
    expectClose(r.si.omega, 2.21359);
    expectClose(r.si.T, 2.83845);
    expectClose(r.si.rpm, 21.1383);
    expect(r.si.Fc).toBeUndefined();
    expect(r.fieldStatus.Fc).toBe('empty');
  });

  it('M6: r = 0,8 m, m = 0,2 kg, fuente F_c = 50 N', () => {
    const r = solve(mcu({ radius: ['0,8', 'm'], source: ['Fc', '50', 'N'], mass: ['0,2', 'kg'] }));
    expectClose(r.si.ac, 250);
    expectClose(r.si.v, 14.1421);
    expectClose(r.si.omega, 17.6777);
    expectClose(r.si.rpm, 168.809);
  });

  it('M7: punto en la mitad', () => {
    const r = solve(setPointKind(preset('bicycle'), 'half'));
    expectClose(r.si.rp, 0.165);
    expectClose(r.si.v, 2.0735);
    expectClose(r.si.ac, 26.0558);
    expectClose(r.si.omega, 12.5664);
    expect(r.steps.some((s) => s.title.startsWith('Radio del punto'))).toBe(true);
  });

  it('M8: punto en el eje', () => {
    const r = solve(setPointKind(preset('bicycle'), 'axis'));
    expect(r.si.v).toBe(0);
    expect(r.si.ac).toBe(0);
    expect(r.fieldStatus.v).toBe('disabled');
    expect(r.fieldStatus.ac).toBe('disabled');
    expect(r.fieldStatus.Fc).toBe('disabled');
    expect(r.fieldStatus.s).toBe('disabled');
  });

  it('M8: en el eje, una fuente v se convierte en fuente ω', () => {
    const st = editRate(preset('bicycle'), 'v', '4');
    const moved = setPointKind(st, 'axis');
    expect(moved.mcu.rateSource).toBe('omega');
    const r = solve(moved);
    expectClose(r.si.omega, 4 / 0.33);
    // Usar v como dato en el eje es un error.
    const bad = solve(editRate(moved, 'v', '3'));
    expect(codes(bad)).toContain('E-AXIS');
  });

  it('M9: panel D con Δθ = 10 vueltas', () => {
    const r = solve(editTime(preset('bicycle'), 'dtheta', '10'));
    expectClose(r.si.t, 5);
    expectClose(r.si.s, 20.7345);
    expectClose(r.si.N, 10);
    expect(r.steps.map((s) => s.id)).toContain('t_from_dtheta');
  });

  it('M10: rpm = 0', () => {
    const st = editRate(preset('bicycle'), 'rpm', '0');
    const r = solve(st);
    expect(r.si.T).toBe(Number.POSITIVE_INFINITY);
    expect(r.si.v).toBe(0);
    expect(r.si.ac).toBe(0);
    const r2 = solve(editTime(st, 'dtheta', '1'));
    expect(codes(r2)).toContain('E-NOROT');
    const r3 = solve(editTime(st, 't', '4'));
    expect(r3.ok).toBe(true);
    expect(r3.si.dtheta).toBe(0);
  });

  it('M11: fuente F_c y luego m = 1 kg conserva ω', () => {
    const base = solve(preset('bicycle'));
    const st = editRate(preset('bicycle'), 'Fc', formatExact(base.si.Fc as number));
    expect(st.mcu.rateSource).toBe('Fc');
    const r = solve(editMass(st, '1'));
    expectClose(r.si.omega, 12.5664);
    expectClose(r.si.Fc, 52.1115);
  });

  it('M12: v = 3,5 × 10⁷ m/s → W-REL', () => {
    const r = solve(mcu({ radius: ['1', 'm'], source: ['v', '3,5e7', 'm/s'] }));
    expect(codes(r)).toContain('W-REL');
    expect(r.ok).toBe(true);
    const light = solve(mcu({ radius: ['1', 'm'], source: ['v', '3e8', 'm/s'] }));
    expect(codes(light)).toContain('E-LIGHT');
    expect(light.ok).toBe(false);
  });

  it('cada campo de rapidez puede ser dato', () => {
    const base = solve(preset('bicycle'));
    for (const f of ['rpm', 'f', 'T', 'omega', 'v', 'ac', 'Fc'] as const) {
      const st = editRate(preset('bicycle'), f, formatExact(base.si[f] as number));
      const r = solve(st);
      expect(r.fieldStatus[f], f).toBe('input');
      expectClose(r.si.omega, 4 * Math.PI, 1e-9);
      expectClose(r.si.Fc, 26.0558);
      expect(r.steps.length).toBeGreaterThan(5);
    }
  });

  it('errores de rango y de masa', () => {
    expect(codes(solve(editRate(preset('bicycle'), 'T', '0')))).toContain('E-RANGE-T');
    expect(codes(solve(editRate(preset('bicycle'), 'rpm', '-5')))).toContain('E-RANGE-NEG');
    expect(codes(solve(editRadius(preset('bicycle'), 'd', '0')))).toContain('E-RANGE-R');
    expect(codes(solve(editRadius(preset('bicycle'), 'd', '1e20')))).toContain('E-RANGE-R');
    expect(codes(solve(editRadius(preset('bicycle'), 'd', 'abc')))).toContain('E-NUM-INV');
    const noMass = editRate(editMass(preset('bicycle'), ''), 'Fc', '10');
    expect(codes(solve(noMass))).toContain('E-MASS');
    expect(codes(solve(editMass(preset('bicycle'), '-1')))).toContain('E-RANGE-NEG');
    expect(codes(solve(editTime(preset('bicycle'), 't', '-1')))).toContain('E-RANGE-T');
    expect(codes(solve(editTime(preset('bicycle'), 'dtheta', '-1')))).toContain('E-RANGE-NEG');
  });

  it('punto personalizado en % y en longitud', () => {
    const pct = editPointCustom(setPointKind(preset('bicycle'), 'custom'), '40');
    expectClose(solve(pct).si.rp, 0.132);
    const len = setUnit(pct, { kind: 'point' }, 'cm');
    expect(len.geometry.point.custom.text).toBe('13,2');
    expectClose(solve(len).si.rp, 0.132);
    const out = editPointCustom(len, '40');
    const r = solve(out);
    expect(codes(r)).toContain('E-RANGE-RP');
    expect(r.errors[0].params?.R).toEqual({ value: 0.33, unit: 'cm' });
  });

  it('al pasar a «Otro» se precarga el punto actual', () => {
    const st = setPointKind(setPointKind(preset('bicycle'), 'half'), 'custom');
    expect(st.geometry.point.custom.text).toBe('50');
  });

  it('cambiar la unidad de un dato convierte el número; la de un calculado no', () => {
    const st = setUnit(preset('bicycle'), { kind: 'radius' }, 'm');
    expect(st.geometry.radius.text).toBe('0,66');
    expectClose(solve(st).si.R, 0.33);
    const st2 = setUnit(preset('bicycle'), { kind: 'rate', field: 'v' }, 'km/h');
    expect(st2.mcu.rate.v.text).toBe('');
    expect(st2.mcu.rate.v.unit).toBe('km/h');
    const st3 = setUnit(st2, { kind: 'mass' }, 'gram');
    expect(st3.mass.text).toBe('500');
  });

  it('θ0, sentido y coordenadas finales', () => {
    let st = editTime(preset('bicycle'), 'dtheta', '0,25');
    st = editTheta0(st, '90');
    let r = solveMCU(st, st.settings);
    expectClose(r.si.thetaF, Math.PI);
    expectClose(r.si.x, -0.33);
    st = setDirection(st, 'cw');
    r = solveMCU(st, st.settings);
    expectClose(r.si.thetaF, 0);
    expect(setStyle(st, 'fan').geometry.style).toBe('fan');
  });

  it('referencia: solo con resultados válidos', () => {
    const st = preset('bicycle');
    const ref = makeReference(st, solve(st));
    expect(ref?.R).toBeCloseTo(0.33);
    expect(ref?.inputs.rpm).toBe(120);
    const bad = editRate(st, 'rpm', 'abc');
    expect(makeReference(bad, solve(bad))).toBeNull();
  });
});
