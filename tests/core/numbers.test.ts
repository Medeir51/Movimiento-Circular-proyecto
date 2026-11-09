import { describe, expect, it } from 'vitest';
import {
  formatExact,
  formatNumber,
  formatQuantity,
  groupDigits,
  parseNumber,
  texNumber,
  texQuantity,
} from '../../src/core/numberFormat';
import {
  dimensionOf,
  fromSI,
  isKnownUnit,
  joinValueUnit,
  toSI,
  unitOptionLabel,
  unitSymbol,
} from '../../src/core/units';
import { messageText } from '../../src/core/messages';
import { expectClose } from './helpers';

const value = (text: string) => {
  const r = parseNumber(text);
  return r.status === 'ok' ? r.value : r;
};

describe('22.1 Lectura de números y unidades', () => {
  it('P1 y P2: coma o punto decimal', () => {
    expect(value('0,33')).toBe(0.33);
    expect(value('0.33')).toBe(0.33);
  });

  it('P3: notación científica', () => {
    expect(value('1,5e3')).toBe(1500);
    expect(value('1,5×10^3')).toBe(1500);
    expect(value('1.5E3')).toBe(1500);
    expect(value('1,5x10^3')).toBe(1500);
    expect(value('1,5·10^3')).toBe(1500);
    expect(value('1,5·10³')).toBe(1500);
    expect(value('2,662 × 10⁻⁶')).toBeCloseTo(2.662e-6, 15);
  });

  it('P4: una división entre dos números', () => {
    expectClose(value('100/3') as number, 100 / 3, 1e-15);
    expectClose(value('100/3') as number, 33.3333);
  });

  it('P5: separador de miles → E-NUM-SEP', () => {
    expect(parseNumber('1.234,5')).toEqual({ status: 'error', code: 'E-NUM-SEP' });
    expect(parseNumber('1,234.5')).toEqual({ status: 'error', code: 'E-NUM-SEP' });
    expect(parseNumber('1 000')).toEqual({ status: 'error', code: 'E-NUM-SEP' });
  });

  it('P6: texto no numérico → E-NUM-INV', () => {
    for (const t of ['abc', '2..3', '--1', '1/0', '1/2/3', 'e3', '1e', '×10^3', '1e400', '1 abc']) {
      expect(parseNumber(t), t).toEqual({ status: 'error', code: 'E-NUM-INV' });
    }
  });

  it('P7: vacío no es error', () => {
    expect(parseNumber('')).toEqual({ status: 'empty' });
    expect(parseNumber('   ')).toEqual({ status: 'empty' });
  });

  it('acepta espacios al inicio y al final, signos y menos tipográfico', () => {
    expect(value(' 12 ')).toBe(12);
    expect(value('-3')).toBe(-3);
    expect(value('−4')).toBe(-4);
    expect(value('+2')).toBe(2);
    expect(value('10^3')).toBe(1000);
    expect(value('5×10')).toBe(50);
    expect(value(',5')).toBe(0.5);
  });

  it('P8 a P11: conversiones a SI', () => {
    expectClose(toSI(66, 'cm'), 0.66);
    expectClose(toSI(60, 'km/h'), 16.6667);
    expectClose(toSI(120, 'rpm'), 12.5664);
    expectClose(toSI(1, 'g'), 9.8);
    expectClose(toSI(1, 'g', 9.81), 9.81);
    expectClose(fromSI(0.66, 'cm'), 66);
    expectClose(toSI(1, 'rev'), 2 * Math.PI);
    expectClose(toSI(1, 'd'), 86400);
    expectClose(toSI(1, 'in'), 0.0254);
  });

  it('P12 a P14: formato de salida', () => {
    expect(formatNumber(26.0558, 4)).toBe('26,06');
    expect(formatNumber(2.6617e-6, 4)).toBe('2,662 × 10⁻⁶');
    expect(formatNumber(2.0, 4)).toBe('2');
  });

  it('formato: casos de borde', () => {
    expect(formatNumber(0, 4)).toBe('0');
    expect(formatNumber(190.986, 4)).toBe('191');
    expect(formatNumber(0.5, 4)).toBe('0,5');
    expect(formatNumber(12.566370614, 4)).toBe('12,57');
    expect(formatNumber(3.844e8, 4)).toBe('3,844 × 10⁸');
    expect(formatNumber(999999.7, 4)).toBe('1 × 10⁶');
    expect(formatNumber(0.00099996, 4)).toBe('0,001');
    expect(formatNumber(12345.6, 4)).toBe('12350');
    expect(formatNumber(-4.5, 4)).toBe('-4,5');
    expect(formatNumber(Number.POSITIVE_INFINITY, 4)).toBe('∞');
    expect(formatNumber(Number.NaN, 4)).toBe('—');
    expect(formatNumber(1 / 3, 3)).toBe('0,333');
    expect(formatNumber(1 / 3, 6)).toBe('0,333333');
  });

  it('formato con unidades y en KaTeX', () => {
    expect(formatQuantity(12.566370614, 'rad/s', 4)).toBe('12,57 rad/s');
    expect(formatQuantity(Math.PI / 4, 'deg', 4)).toBe('45°');
    expect(formatQuantity(0.66, 'cm', 4)).toBe('66 cm');
    expect(texNumber(2.6617e-6, 4)).toBe('2{,}662 \\times 10^{-6}');
    expect(texNumber(-0.5, 4)).toBe('-0{,}5');
    expect(texQuantity(0.33, 'm', 4)).toBe('0{,}33\\,\\mathrm{m}');
    expect(texQuantity(Math.PI / 4, 'deg', 4)).toBe('45^{\\circ}');
    expect(joinValueUnit('3', 'one')).toBe('3');
  });

  it('formatExact conserva la precisión y se puede volver a leer', () => {
    for (const x of [0.66, 1 / 3, 2.54, 4.146902302738527, 7.342e22, 1e-7, -12.5]) {
      const text = formatExact(x);
      const back = value(text) as number;
      expect(Math.abs(back - x) / Math.abs(x)).toBeLessThan(1e-14);
    }
    expect(formatExact(Number.NaN)).toBe('');
  });

  it('unidades: símbolos, opciones y dimensiones', () => {
    expect(unitSymbol('m/s2')).toBe('m/s²');
    expect(unitOptionLabel('in')).toBe('in (pulgada)');
    expect(unitOptionLabel('cm')).toBe('cm');
    expect(dimensionOf('km/h')).toBe('velocity');
    expect(isKnownUnit('cm')).toBe(true);
    expect(isKnownUnit('furlong')).toBe(false);
    expect(() => toSI(1, 'furlong')).toThrow();
  });

  it('agrupa dígitos solo en etiquetas grandes', () => {
    expect(groupDigits(5000)).toBe('5000');
    expect(groupDigits(500000)).toBe('500 000');
  });

  it('mensajes con parámetros', () => {
    expect(
      messageText({ code: 'E-RANGE-RP', params: { R: { value: 0.33, unit: 'cm' } } }, 4, 9.8),
    ).toBe('El punto debe estar entre el eje (0) y el borde (33 cm).');
    expect(
      messageText({ code: 'E-MCUV-INDET', params: { detail: 'alpha0Same' } }, 4, 9.8),
    ).toContain('con α = 0 la rapidez no cambia');
    expect(
      messageText({ code: 'W-REV', params: { tStop: { value: 2.5, unit: 's' } } }, 4, 9.8),
    ).toBe(
      'La rueda se detiene en t = 2,5 s y después gira en sentido contrario. Si en tu problema la rueda solo frena, usa t = 2,5 s.',
    );
    expect(messageText({ code: 'E-MCUV-STOP', params: { max: 25 } }, 4, 9.8)).toContain('25');
  });
});
