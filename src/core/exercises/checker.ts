/** Verificación de respuestas y detección de errores típicos (18.3). */

export type HintKey =
  | 'twoPi'
  | 'minutes'
  | 'kmh'
  | 'length'
  | 'diameter'
  | 'diameterSquared'
  | 'degrees'
  | 'gUnit'
  | 'none';

/** Tolerancia relativa para dar una respuesta por correcta. */
export const TOLERANCE = 0.02;

export function withinTolerance(x: number, expected: number, tol: number = TOLERANCE): boolean {
  if (expected === 0) return Math.abs(x) <= 1e-12;
  return Math.abs(x - expected) <= tol * Math.abs(expected);
}

/** Factores k de la tabla, en el orden en que se revisan. */
export function typicalFactors(g: number): Array<{ k: number; hint: HintKey }> {
  return [
    { k: 2 * Math.PI, hint: 'twoPi' },
    { k: 60, hint: 'minutes' },
    { k: 3.6, hint: 'kmh' },
    { k: 100, hint: 'length' },
    { k: 1000, hint: 'length' },
    { k: 2, hint: 'diameter' },
    { k: 4, hint: 'diameterSquared' },
    { k: Math.PI / 180, hint: 'degrees' },
    { k: 180 / Math.PI, hint: 'degrees' },
    { k: g, hint: 'gUnit' },
  ];
}

export type CheckResult = { correct: true } | { correct: false; hint: HintKey };

/** Compara una respuesta (en SI) con la esperada (en SI). */
export function checkAnswer(xSI: number, expectedSI: number, g: number): CheckResult {
  if (withinTolerance(xSI, expectedSI)) return { correct: true };
  for (const { k, hint } of typicalFactors(g)) {
    if (withinTolerance(xSI * k, expectedSI) || withinTolerance(xSI / k, expectedSI)) {
      return { correct: false, hint };
    }
  }
  return { correct: false, hint: 'none' };
}
