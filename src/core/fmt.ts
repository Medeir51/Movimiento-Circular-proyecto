import { formatNumber, formatQuantity, texNumber, texQuantity } from './numberFormat';
import type { UnitId } from './types';

/** Formateadores con las cifras significativas y el g de los ajustes. */
export interface Fmt {
  sig: number;
  g: number;
  /** Número en texto plano. */
  n: (x: number) => string;
  /** Magnitud (en SI) en texto plano con su unidad. */
  q: (xSI: number, unit: UnitId) => string;
  /** Número en KaTeX. */
  nt: (x: number) => string;
  /** Magnitud (en SI) en KaTeX con su unidad. */
  qt: (xSI: number, unit: UnitId) => string;
}

export function createFmt(sig: number, g: number): Fmt {
  return {
    sig,
    g,
    n: (x) => formatNumber(x, sig),
    q: (xSI, unit) => formatQuantity(xSI, unit, sig, g),
    nt: (x) => texNumber(x, sig),
    qt: (xSI, unit) => texQuantity(xSI, unit, sig, g),
  };
}
