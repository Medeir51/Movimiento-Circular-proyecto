import { fromSI, joinValueUnit, unitTex } from './units';
import { DEFAULT_G } from './constants';
import type { UnitId } from './types';

/**
 * Lectura y formato de números (sección 8).
 * Se calcula con todos los decimales; se redondea solo al mostrar.
 */

export type ParseResult =
  | { status: 'empty' }
  | { status: 'ok'; value: number }
  | { status: 'error'; code: 'E-NUM-SEP' | 'E-NUM-INV' };

const EMPTY: ParseResult = { status: 'empty' };
const SEP: ParseResult = { status: 'error', code: 'E-NUM-SEP' };
const INV: ParseResult = { status: 'error', code: 'E-NUM-INV' };

const SUPERSCRIPT_TO_ASCII: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
  '⁻': '-',
  '⁺': '+',
};

const ASCII_TO_SUPERSCRIPT: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '-': '⁻',
  '+': '⁺',
};

function ok(value: number): ParseResult {
  return Number.isFinite(value) ? { status: 'ok', value } : INV;
}

/** Mantisa con un solo separador decimal (coma o punto). */
function parseMantissa(mant: string): { value: string } | ParseResult {
  if (/^[+-]?(\d+([.,]\d*)?|[.,]\d+)$/.test(mant)) {
    return { value: mant.replace(',', '.') };
  }
  // Grupos de dígitos con varios separadores: separador de miles o separadores mezclados.
  if (/^[+-]?\d+([.,]\d+){2,}$/.test(mant)) return SEP;
  return INV;
}

/** Un número sin división: mantisa con exponente opcional (e3, ×10^3, ·10^3). */
function parseSimple(s: string): ParseResult {
  if (s === '') return INV;
  let mant = s;
  let exp = 0;
  let m = /^(.*?)[eE]([+-]?\d+)$/.exec(s);
  if (m && m[1] !== '') {
    mant = m[1];
    exp = Number.parseInt(m[2], 10);
  } else {
    m = /^(.+?)[×xX·*]10(?:\^([+-]?\d+))?$/.exec(s);
    if (m) {
      mant = m[1];
      exp = m[2] !== undefined ? Number.parseInt(m[2], 10) : 1;
    } else {
      m = /^([+-]?)10\^([+-]?\d+)$/.exec(s);
      if (m) {
        mant = `${m[1]}1`;
        exp = Number.parseInt(m[2], 10);
      }
    }
  }
  const parsed = parseMantissa(mant);
  if ('status' in parsed) return parsed;
  return ok(Number(`${parsed.value}e${exp}`));
}

/**
 * Lee un número escrito por el usuario.
 * Acepta coma o punto decimal, notación científica (1,5e3, 1,5×10^3, 1,5·10³),
 * una división entre dos números (100/3) y espacios al inicio y al final.
 */
export function parseNumber(text: string): ParseResult {
  let s = text.trim();
  if (s === '') return EMPTY;
  // Signos menos tipográficos.
  s = s.replace(/[−‒–—]/g, '-');
  // Exponentes en superíndice: 10⁻⁶ → 10^-6.
  s = s.replace(
    /[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g,
    (sup) =>
      '^' +
      Array.from(sup)
        .map((c) => SUPERSCRIPT_TO_ASCII[c])
        .join(''),
  );
  // Espacios alrededor de los operadores.
  s = s.replace(/\s*([×xX·*/^])\s*/g, '$1');
  if (/\s/.test(s)) {
    return /^[+-]?\d[\d\s.,]*$/.test(s) ? SEP : INV;
  }
  const parts = s.split('/');
  if (parts.length > 2) return INV;
  if (parts.length === 2) {
    const a = parseSimple(parts[0]);
    const b = parseSimple(parts[1]);
    if (a.status === 'error') return a;
    if (b.status === 'error') return b;
    if (a.status !== 'ok' || b.status !== 'ok' || b.value === 0) return INV;
    return ok(a.value / b.value);
  }
  return parseSimple(s);
}

export function toSuperscript(n: number | string): string {
  return Array.from(String(n))
    .map((c) => ASCII_TO_SUPERSCRIPT[c] ?? c)
    .join('');
}

export interface NumberParts {
  /** '-' o '' */
  sign: string;
  /** Mantisa con coma decimal, sin ceros finales. */
  mantissa: string;
  /** Exponente de 10 si va en notación científica. */
  exponent: number | null;
}

/** Descompone un número redondeado a `sigFigs` cifras significativas. */
export function numberParts(x: number, sigFigs: number): NumberParts {
  if (x === 0) return { sign: '', mantissa: '0', exponent: null };
  const sign = x < 0 ? '-' : '';
  const [mantStr, expStr] = Math.abs(x)
    .toExponential(Math.max(0, sigFigs - 1))
    .split('e');
  const e = Number.parseInt(expStr, 10);
  const digits = mantStr.replace('.', '');
  if (e >= -3 && e < 6) {
    let intPart: string;
    let fracPart: string;
    if (e >= 0) {
      if (digits.length <= e + 1) {
        intPart = digits + '0'.repeat(e + 1 - digits.length);
        fracPart = '';
      } else {
        intPart = digits.slice(0, e + 1);
        fracPart = digits.slice(e + 1);
      }
    } else {
      intPart = '0';
      fracPart = '0'.repeat(-e - 1) + digits;
    }
    fracPart = fracPart.replace(/0+$/, '');
    return { sign, mantissa: fracPart ? `${intPart},${fracPart}` : intPart, exponent: null };
  }
  let mant = mantStr;
  if (mant.includes('.')) mant = mant.replace(/0+$/, '').replace(/\.$/, '');
  return { sign, mantissa: mant.replace('.', ','), exponent: e };
}

/**
 * Formato de salida: coma decimal, sin separador de miles, `sigFigs` cifras
 * significativas y notación científica fuera de 10⁻³ ≤ |x| < 10⁶.
 */
export function formatNumber(x: number, sigFigs: number): string {
  if (Number.isNaN(x)) return '—';
  if (!Number.isFinite(x)) return x > 0 ? '∞' : '-∞';
  const p = numberParts(x, sigFigs);
  if (p.exponent === null) return p.sign + p.mantissa;
  return `${p.sign}${p.mantissa} × 10${toSuperscript(p.exponent)}`;
}

/** Número en KaTeX (coma decimal entre llaves para que no agregue espacio). */
export function texNumber(x: number, sigFigs: number): string {
  if (Number.isNaN(x)) return '\\text{—}';
  if (!Number.isFinite(x)) return x > 0 ? '\\infty' : '-\\infty';
  const p = numberParts(x, sigFigs);
  const mant = p.mantissa.replace(',', '{,}');
  if (p.exponent === null) return p.sign + mant;
  return `${p.sign}${mant} \\times 10^{${p.exponent}}`;
}

/** Valor en SI mostrado en la unidad indicada: «12,57 rad/s». */
export function formatQuantity(
  valueSI: number,
  unit: UnitId,
  sigFigs: number,
  g: number = DEFAULT_G,
): string {
  return joinValueUnit(formatNumber(fromSI(valueSI, unit, g), sigFigs), unit);
}

export function texQuantity(
  valueSI: number,
  unit: UnitId,
  sigFigs: number,
  g: number = DEFAULT_G,
): string {
  const n = texNumber(fromSI(valueSI, unit, g), sigFigs);
  const u = unitTex(unit);
  if (u === '') return n;
  if (unit === 'deg') return `${n}${u}`;
  return `${n}\\,${u}`;
}

/**
 * Texto con precisión completa (15 cifras), para cuando la app reescribe un dato
 * (por ejemplo, al cambiar su unidad). Se puede volver a leer con parseNumber.
 */
export function formatExact(x: number): string {
  if (!Number.isFinite(x)) return '';
  const rounded = Number(x.toPrecision(15));
  return String(rounded).replace('.', ',').replace('e+', 'e');
}

/** Agrupa los miles con espacio fino solo para etiquetas (≥ 10 000): «500 000». */
export function groupDigits(n: number): string {
  const s = String(Math.round(n));
  if (s.length < 5) return s;
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
