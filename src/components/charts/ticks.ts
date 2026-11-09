/** Marcas «redondas» (1-2-5 × 10ⁿ) para los ejes de las gráficas. */
export function niceStep(range: number, target = 5): number {
  if (!(range > 0) || !Number.isFinite(range)) return 1;
  const raw = range / target;
  const p = 10 ** Math.floor(Math.log10(raw));
  const n = raw / p;
  const m = n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10;
  return m * p;
}

/** Dominio redondeado que incluye los datos (y el 0 si los datos no cambian de signo). */
export function niceDomain(min: number, max: number): { lo: number; hi: number; step: number } {
  let lo = Math.min(min, 0 <= min ? 0 : min);
  let hi = Math.max(max, max <= 0 ? 0 : max);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    lo = 0;
    hi = 1;
  }
  if (hi === lo) {
    const pad = Math.abs(hi) > 0 ? Math.abs(hi) * 0.5 : 1;
    lo -= pad;
    hi += pad;
    if (min >= 0 && lo < 0) lo = 0;
  }
  const step = niceStep(hi - lo);
  return { lo: Math.floor(lo / step + 1e-9) * step, hi: Math.ceil(hi / step - 1e-9) * step, step };
}

export function ticksFor(lo: number, hi: number, step: number): number[] {
  const out: number[] = [];
  const n = Math.round((hi - lo) / step);
  for (let i = 0; i <= n && i < 50; i++) out.push(lo + i * step);
  return out;
}
