import type { BodyId } from '../constants';
import type { Message } from '../messages';
import type { FieldStatus, Quantity, Step } from '../types';

export interface FlatCurveInputs {
  R: Quantity;
  v: Quantity;
  mu: Quantity;
  m: Quantity;
}

export interface BankedCurveInputs {
  R: Quantity;
  beta: Quantity;
  mu: Quantity;
  v: Quantity;
  m: Quantity;
}

export type OrbitBody = BodyId | 'custom';
export type OrbitSource = 'R' | 'h' | 'T';

export interface OrbitInputs {
  body: OrbitBody;
  /** Masa y radio del cuerpo personalizado. */
  M: Quantity;
  Rbody: Quantity;
  source: OrbitSource;
  R: Quantity;
  h: Quantity;
  T: Quantity;
  m: Quantity;
}

export interface AppResult<V extends string> {
  ok: boolean;
  values: Partial<Record<V, number>>;
  fieldStatus: Record<string, FieldStatus>;
  errors: Message[];
  warnings: Message[];
  steps: Step[];
}

export interface AppSettings {
  g: number;
  sigFigs: number;
}
