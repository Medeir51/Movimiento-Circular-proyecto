import { describe, expect, it } from 'vitest';
import {
  TIME_SCALE_FACTORS,
  autoTimeScale,
  timeScaleLabel,
  timeScaleOption,
} from '../../src/core/timeScale';

describe('22.5 Escala de tiempo', () => {
  it('S1: 2 rev/s (120 rpm) → 0,5', () => expect(autoTimeScale(2)).toBe(0.5));
  it('S2: 20 rev/s (1200 rpm) → 0,05', () => expect(autoTimeScale(20)).toBe(0.05));
  it('S3: 0,5 rev/s → 1', () => expect(autoTimeScale(0.5)).toBe(1));
  it('S4: Luna → 500 000', () => expect(autoTimeScale(4.23623e-7)).toBe(500000));
  it('S5: Tierra → 10 000', () => expect(autoTimeScale(1.16058e-5)).toBe(10000));
  it('S6: 0 → 1', () => expect(autoTimeScale(0)).toBe(1));

  it('lista de factores 1-2-5 de 10⁻⁴ a 5 × 10⁸', () => {
    expect(TIME_SCALE_FACTORS).toHaveLength(39);
    expect(TIME_SCALE_FACTORS[0]).toBe(1e-4);
    expect(TIME_SCALE_FACTORS[38]).toBe(5e8);
  });

  it('casos extremos', () => {
    expect(autoTimeScale(1e6)).toBe(1e-4);
    expect(autoTimeScale(1e-12)).toBe(5e8);
    expect(autoTimeScale(Number.NaN)).toBe(1);
    expect(autoTimeScale(1)).toBe(1);
    expect(autoTimeScale(0.1)).toBe(1);
  });

  it('MCUV: si la duración visual supera 60 s, se acelera sin pasar de 1 vuelta/s', () => {
    // 0,02 rev/s → factor 5; 1000 s / 5 = 200 s > 60 → 10 → 20 (1000/20 = 50 s).
    expect(autoTimeScale(0.02, 1000)).toBe(20);
    // Si acelerar haría pasar de 1 vuelta/s, se detiene.
    expect(autoTimeScale(0.5, 1000)).toBe(2);
    expect(autoTimeScale(0, 600)).toBe(10);
    expect(autoTimeScale(2, 10)).toBe(0.5);
  });

  it('etiquetas', () => {
    expect(timeScaleLabel(1)).toBe('Tiempo real');
    expect(timeScaleLabel(0.05)).toBe('Cámara lenta ×1/20');
    expect(timeScaleLabel(500000)).toBe('Acelerado ×500 000');
    expect(timeScaleOption(0.5)).toBe('×1/2');
    expect(timeScaleOption(2)).toBe('×2');
  });
});
