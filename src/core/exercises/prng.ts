/** Generador pseudoaleatorio con semilla (18.1). */

/** Hash FNV-1a de 32 bits sobre los bytes UTF-8 del texto. */
export function fnv1a(text: string): number {
  const bytes = new TextEncoder().encode(text);
  let h = 0x811c9dc5;
  for (const b of bytes) {
    h ^= b;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32: devuelve números en [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** El código se compara sin espacios al inicio o al final y sin distinguir mayúsculas. */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Semilla = FNV-1a de "<códigoTaller>#<númeroEstudiante>#<idPlantilla>". */
export function exerciseSeed(code: string, student: number, templateId: string): number {
  return fnv1a(`${normalizeCode(code)}#${student}#${templateId}`);
}

/** Valor «de libro»: min + k·paso, con k entero aleatorio. */
export function pickStepped(rng: () => number, min: number, max: number, step: number): number {
  const n = Math.round((max - min) / step);
  const k = Math.min(n, Math.floor(rng() * (n + 1)));
  const decimals = (String(step).split('.')[1] ?? '').length;
  return Number((min + k * step).toFixed(decimals));
}
