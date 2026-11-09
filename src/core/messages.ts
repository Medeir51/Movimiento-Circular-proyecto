import { es, fill } from '../i18n/es';
import { formatNumber, formatQuantity } from './numberFormat';
import type { UnitId } from './types';

/** Catálogo de códigos (sección 20). El texto vive en src/i18n/es.ts. */
export const MESSAGE_CODES = [
  'E-NUM-SEP',
  'E-NUM-INV',
  'E-RANGE-R',
  'E-RANGE-RP',
  'E-RANGE-NEG',
  'E-RANGE-T',
  'E-RANGE-W0',
  'E-RANGE-MU',
  'E-RANGE-BETA',
  'E-AXIS',
  'E-MASS',
  'E-NOROT',
  'E-MCUV-PIN',
  'E-MCUV-INDET',
  'E-MCUV-ALPHA0',
  'E-MCUV-NEVER',
  'E-MCUV-STOP',
  'E-MCUV-IMPOSSIBLE',
  'E-ORBIT-INSIDE',
  'E-LIGHT',
  'W-REL',
  'W-W0NEG',
  'W-REV',
  'W-STROBE',
] as const;

export type MessageCode = (typeof MESSAGE_CODES)[number];

/** Un parámetro es texto, número o una magnitud en SI con la unidad en que se muestra. */
export type MessageParam = string | number | { value: number; unit: UnitId };

export interface Message {
  code: MessageCode;
  /** Campo al que se asocia el mensaje (se muestra debajo de él). */
  field?: string;
  params?: Record<string, MessageParam>;
}

export function makeMessage(
  code: MessageCode,
  field?: string,
  params?: Record<string, MessageParam>,
): Message {
  const m: Message = { code };
  if (field !== undefined) m.field = field;
  if (params !== undefined) m.params = params;
  return m;
}

export function isErrorCode(code: MessageCode): boolean {
  return code.startsWith('E-');
}

/** Texto final del mensaje, con los parámetros formateados. */
export function messageText(m: Message, sigFigs: number, g: number): string {
  const template: string = es.messages[m.code];
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(m.params ?? {})) {
    if (typeof value === 'number') params[key] = formatNumber(value, sigFigs);
    else if (typeof value === 'string') {
      const details = es.messageDetails as Record<string, string>;
      params[key] = key === 'detail' && value in details ? details[value] : value;
    } else params[key] = formatQuantity(value.value, value.unit, sigFigs, g);
  }
  return fill(template, params);
}
