import { expect } from 'vitest';
import { blankState } from '../../src/core/defaults';
import { presetState } from '../../src/data/presets';
import type { PresetId } from '../../src/data/presets';
import type { AppState } from '../../src/core/types';

/** Compara con tolerancia relativa (10⁻³ por defecto, sección 22). */
export function expectClose(actual: number | undefined, expected: number, tol = 1e-3): void {
  expect(actual, `se esperaba ${expected}`).toBeDefined();
  const a = actual as number;
  if (expected === 0) {
    expect(Math.abs(a)).toBeLessThanOrEqual(1e-12);
    return;
  }
  expect(Math.abs(a - expected) / Math.abs(expected), `${a} ≉ ${expected}`).toBeLessThanOrEqual(
    tol,
  );
}

export function preset(id: PresetId): AppState {
  return presetState(id, blankState());
}

/** Estado MCU con radio, fuente de rapidez y masa. */
export function mcu(opts: {
  radius: [string, string];
  editedAs?: 'r' | 'd';
  source: [AppState['mcu']['rateSource'] & string, string, string];
  mass?: [string, string];
}): AppState {
  const st = blankState();
  st.geometry.radius = { text: opts.radius[0], unit: opts.radius[1] };
  st.geometry.radiusEditedAs = opts.editedAs ?? 'r';
  const [field, text, unit] = opts.source;
  st.mcu.rate[field] = { text, unit };
  st.mcu.rateSource = field;
  if (opts.mass) st.mass = { text: opts.mass[0], unit: opts.mass[1] };
  return st;
}
