import { describe, expect, it } from 'vitest';
import { editRadius, inputValues, makeReference, solve } from '../../src/core/edits';
import {
  compareKeys,
  compareSummary,
  compareValues,
  formatComparison,
} from '../../src/core/compare';
import { formatNumber, formatQuantity } from '../../src/core/numberFormat';
import { PRESET_IDS, isPresetId, presetName } from '../../src/data/presets';
import type { PresetId } from '../../src/data/presets';
import type { VarId } from '../../src/core/types';
import { preset } from './helpers';

/** Resultados esperados de la tabla 16 (4 cifras, en SI salvo que se indique). */
const EXPECTED: Record<PresetId, Array<[VarId | 'acG' | 'Tmin' | 'turns', string]>> = {
  bicycle: [
    ['f', '2'],
    ['T', '0,5'],
    ['omega', '12,57'],
    ['v', '4,147'],
    ['ac', '52,11'],
    ['Fc', '26,06'],
  ],
  vinyl: [
    ['T', '1,8'],
    ['omega', '3,491'],
    ['v', '0,5236'],
    ['ac', '1,828'],
  ],
  fan: [
    ['f', '20'],
    ['T', '0,05'],
    ['v', '25,13'],
    ['ac', '3158'],
  ],
  car: [
    ['omega', '52,49'],
    ['rpm', '501,3'],
    ['ac', '874,9'],
    ['acG', '89,27'],
  ],
  washer: [
    ['v', '30,16'],
    ['ac', '3790'],
    ['acG', '386,7'],
    ['Fc', '3790'],
  ],
  moon: [
    ['v', '1023'],
    // La tabla 16 escribe 2,723 × 10⁻³; la regla 8.4 exige notación decimal si |x| ≥ 10⁻³.
    ['ac', '0,002723'],
    ['Fc', '1,999 × 10²⁰'],
  ],
  earthEquator: [
    ['v', '465,1'],
    ['ac', '0,03392'],
  ],
  bogota: [
    ['v', '463,6'],
    ['ac', '0,03381'],
  ],
  iss: [
    ['T', '5570'],
    ['Tmin', '92,84'],
    ['ac', '8,64'],
  ],
  motorStart: [
    ['alpha', '6,283'],
    ['dtheta', '78,54'],
    ['turns', '12,5'],
    ['at', '2,073'],
  ],
  braking: [
    ['t', '5'],
    ['dtheta', '50'],
    ['turns', '7,958'],
  ],
};

describe('16. Casos predefinidos', () => {
  for (const id of PRESET_IDS) {
    it(`${presetName(id)} muestra los valores esperados`, () => {
      const r = solve(preset(id));
      expect(r.ok, JSON.stringify(r.errors)).toBe(true);
      expect(r.incomplete).toBe(false);
      for (const [key, text] of EXPECTED[id]) {
        let value: number | undefined;
        if (key === 'acG') value = (r.si.ac as number) / 9.8;
        else if (key === 'Tmin') value = (r.si.T as number) / 60;
        else if (key === 'turns') value = (r.si.dtheta as number) / (2 * Math.PI);
        else value = r.si[key];
        expect(formatNumber(value as number, 4), `${id} ${key}`).toBe(text);
      }
    });
  }

  it('identificadores de casos', () => {
    expect(isPresetId('bicycle')).toBe(true);
    expect(isPresetId('nope')).toBe(false);
  });
});

describe('14. Comparar con referencia', () => {
  it('U2: guardar referencia y cambiar d a 33 cm', () => {
    const st = preset('bicycle');
    const ref = makeReference(st, solve(st))!;
    const next = editRadius(st, 'd', '33');
    const r = solve(next);
    const c = (k: VarId) => formatComparison(compareValues(ref.si[k], r.si[k]));
    expect(c('v')).toBe('×0,5');
    expect(c('ac')).toBe('×0,5');
    expect(c('omega')).toBe('sin cambio');
    expect(c('T')).toBe('sin cambio');
    expect(compareValues(ref.si.v, r.si.v).notable).toBe(true);
    expect(compareSummary(ref, r.si, inputValues(next, r), 'MCU')).toBe(
      'Cambiaste el radio ×0,5. Resultado: v ×0,5, a_c ×0,5, F_c ×0,5; ω, T y f sin cambio',
    );
    expect(compareKeys('MCUV')).toContain('alpha');
  });

  it('factores notables y casos sin referencia', () => {
    expect(compareValues(1, 4)).toMatchObject({ kind: 'factor', notable: true });
    expect(compareValues(1, Math.SQRT2)).toMatchObject({ kind: 'factor', notable: true });
    expect(compareValues(1, 3)).toMatchObject({ kind: 'factor', notable: false });
    expect(formatComparison(compareValues(0, 3))).toBe('—');
    expect(formatComparison(compareValues(undefined, 3))).toBe('—');
    expect(formatComparison(compareValues(3, 1))).toBe('×0,333');
    const st = preset('bicycle');
    const r = solve(st);
    const ref = makeReference(st, r)!;
    expect(compareSummary(ref, r.si, inputValues(st, r), 'MCU')).toBe(
      'No hay cambios respecto a la referencia.',
    );
  });

  it('formato de magnitudes de los casos', () => {
    const r = solve(preset('moon'));
    expect(formatQuantity(r.si.T as number, 'd', 4)).toBe('27,32 d');
  });
});
