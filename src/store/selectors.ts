import { solveBankedCurve } from '../core/applications/bankedCurve';
import type { BankedVar } from '../core/applications/bankedCurve';
import { solveFlatCurve } from '../core/applications/flatCurve';
import type { FlatVar } from '../core/applications/flatCurve';
import { solveOrbit } from '../core/applications/orbit';
import type { OrbitVar } from '../core/applications/orbit';
import type { AppResult } from '../core/applications/types';
import { solve } from '../core/edits';
import type { SolveResult } from '../core/types';
import { pickSim } from './useAppStore';
import type { StoreState } from './useAppStore';

/**
 * Selectores memoizados: los resultados no se guardan en el store,
 * se derivan del estado (5.2).
 */

let solvedMemo: { key: unknown[]; result: SolveResult } | null = null;

export function selectSolved(s: StoreState): SolveResult {
  const key = [s.mode, s.geometry, s.mass, s.mcu, s.mcuv, s.settings.g, s.settings.sigFigs];
  if (solvedMemo && key.every((k, i) => k === solvedMemo?.key[i])) return solvedMemo.result;
  const result = solve(pickSim(s));
  solvedMemo = { key, result };
  return result;
}

export interface SimView {
  /** Resultado del estado actual (puede tener errores). */
  result: SolveResult;
  /** Lo que se muestra: el actual o, si tiene errores, el último válido (atenuado). */
  shown: SolveResult;
  stale: boolean;
}

let lastOk: SolveResult | null = null;
let viewMemo: { result: SolveResult; view: SimView } | null = null;

export function selectView(s: StoreState): SimView {
  const result = selectSolved(s);
  if (viewMemo && viewMemo.result === result) return viewMemo.view;
  if (result.ok) lastOk = result;
  const fallback = lastOk && lastOk.mode === result.mode ? lastOk : result;
  const view: SimView = {
    result,
    shown: result.ok ? result : fallback,
    stale: !result.ok && fallback !== result,
  };
  viewMemo = { result, view };
  return view;
}

function memoApp<V extends string, I>(
  solver: (inputs: I, s: { g: number; sigFigs: number }) => AppResult<V>,
) {
  let memo: { inputs: I; g: number; sig: number; result: AppResult<V> } | null = null;
  return (inputs: I, g: number, sig: number): AppResult<V> => {
    if (memo && memo.inputs === inputs && memo.g === g && memo.sig === sig) return memo.result;
    const result = solver(inputs, { g, sigFigs: sig });
    memo = { inputs, g, sig, result };
    return result;
  };
}

const flatMemo = memoApp<FlatVar, StoreState['apps']['flat']>(solveFlatCurve);
const bankedMemo = memoApp<BankedVar, StoreState['apps']['banked']>(solveBankedCurve);
const orbitMemo = memoApp<OrbitVar, StoreState['apps']['orbit']>(solveOrbit);

export const selectFlat = (s: StoreState) =>
  flatMemo(s.apps.flat, s.settings.g, s.settings.sigFigs);
export const selectBanked = (s: StoreState) =>
  bankedMemo(s.apps.banked, s.settings.g, s.settings.sigFigs);
export const selectOrbit = (s: StoreState) =>
  orbitMemo(s.apps.orbit, s.settings.g, s.settings.sigFigs);
