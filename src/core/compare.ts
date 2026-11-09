import { es, fill } from '../i18n/es';
import { formatNumber } from './numberFormat';
import type { Mode, ReferenceSnapshot, SiValues, VarId } from './types';

/** Comparación con la referencia (sección 14). */

export interface Comparison {
  kind: 'same' | 'factor' | 'none';
  ratio?: number;
  /** Factor exacto 2, ½, 4, ¼ o √2 (relaciones lineales o cuadráticas). */
  notable: boolean;
}

const NOTABLE = [2, 0.5, 4, 0.25, Math.SQRT2];

export function compareValues(ref: number | undefined, cur: number | undefined): Comparison {
  if (ref === undefined || cur === undefined || ref === 0) return { kind: 'none', notable: false };
  const ratio = cur / ref;
  if (!Number.isFinite(ratio)) return { kind: 'none', notable: false };
  if (Math.abs(ratio - 1) < 1e-6) return { kind: 'same', ratio, notable: false };
  const notable = NOTABLE.some((n) => Math.abs(ratio / n - 1) < 1e-6);
  return { kind: 'factor', ratio, notable };
}

/** «×2», «×0,5», «sin cambio» o «—». */
export function formatComparison(c: Comparison): string {
  if (c.kind === 'none') return '—';
  if (c.kind === 'same') return es.results.noChange;
  return `×${formatNumber(c.ratio as number, 3)}`;
}

/** Filas de la tabla de resultados según el modo. */
export function compareKeys(mode: Mode): VarId[] {
  return mode === 'MCU'
    ? ['R', 'rp', 'f', 'T', 'omega', 'rpm', 'v', 'ac', 'Fc', 't', 'dtheta', 's', 'N']
    : ['R', 'rp', 'omega0', 'omegaF', 'alpha', 't', 'dtheta', 'N', 'at', 's'];
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')}${es.results.summaryAnd}${items[items.length - 1]}`;
}

const nameOf = (k: string): string => (es.results.names as Record<string, string>)[k] ?? k;
const symbolOf = (k: string): string => (es.results.symbols as Record<string, string>)[k] ?? k;

/** Orden de las magnitudes en la frase resumen. */
function summaryOrder(mode: Mode): VarId[] {
  return mode === 'MCU'
    ? ['omega', 'T', 'f', 'rpm', 'v', 'ac', 'Fc', 't', 'dtheta', 's', 'N']
    : ['omega0', 'omegaF', 'alpha', 't', 'dtheta', 'N', 'at', 's'];
}

/**
 * Frase resumen: «Cambiaste el radio ×0,5. Resultado: v ×0,5, a_c ×0,5; ω, T y f sin cambio».
 * `inputs` son los datos actuales (en SI) por campo.
 */
export function compareSummary(
  ref: ReferenceSnapshot,
  si: SiValues,
  inputs: Partial<Record<string, number>>,
  mode: Mode,
): string {
  const refSi = ref.si as Record<string, number | undefined>;
  const curSi = si as Record<string, number | undefined>;
  const changedInputs: string[] = [];
  const inputKeys = new Set<string>();
  for (const [k, cur] of Object.entries(inputs)) {
    if (cur === undefined) continue;
    inputKeys.add(k);
    const c = compareValues(refSi[k] ?? ref.inputs[k], cur);
    if (c.kind === 'factor') changedInputs.push(`${nameOf(k)} ${formatComparison(c)}`);
  }
  const changed: string[] = [];
  const same: string[] = [];
  for (const k of summaryOrder(mode)) {
    if (inputKeys.has(k)) continue;
    const c = compareValues(refSi[k], curSi[k]);
    if (c.kind === 'factor') changed.push(`${symbolOf(k)} ${formatComparison(c)}`);
    else if (c.kind === 'same') same.push(symbolOf(k));
  }
  if (changedInputs.length === 0 && changed.length === 0) return es.results.summaryNothing;
  const parts: string[] = [];
  if (changedInputs.length > 0)
    parts.push(fill(es.results.summaryChanged, { list: joinList(changedInputs) }));
  const resultParts: string[] = [];
  if (changed.length > 0) resultParts.push(changed.join(', '));
  if (same.length > 0)
    resultParts.push(fill(es.results.summaryUnchanged, { list: joinList(same) }));
  if (resultParts.length > 0)
    parts.push(fill(es.results.summaryResult, { list: resultParts.join('; ') }));
  return parts.join(' ');
}
