import type { Message } from './messages';

export type UnitId = string;

/** Un campo guarda el texto tal como lo escribió el usuario y su unidad. */
export interface Quantity {
  text: string;
  unit: UnitId;
}

export type Mode = 'MCU' | 'MCUV';
/** ccw = antihorario, cw = horario. */
export type Direction = 'ccw' | 'cw';
export type PointKind = 'rim' | 'half' | 'axis' | 'custom';
export type WheelStyle = 'wheel' | 'disc' | 'fan' | 'orbit' | 'planet';

export type RateField = 'rpm' | 'f' | 'T' | 'omega' | 'v' | 'ac' | 'Fc';
export type TimeField = 't' | 'dtheta' | 's';
export type KinVar = 'omega0' | 'omegaF' | 'alpha' | 't' | 'dtheta';
export type McuvField = KinVar | 'at' | 's';
export type RadiusPolicy = 'keepOmega' | 'keepV';

export const RATE_FIELDS: readonly RateField[] = ['rpm', 'f', 'T', 'omega', 'v', 'ac', 'Fc'];
export const TIME_FIELDS: readonly TimeField[] = ['t', 'dtheta', 's'];
export const KIN_VARS: readonly KinVar[] = ['omega0', 'omegaF', 'alpha', 't', 'dtheta'];
export const MCUV_FIELDS: readonly McuvField[] = [
  'omega0',
  'omegaF',
  'alpha',
  'at',
  't',
  'dtheta',
  's',
];
export const WHEEL_STYLES: readonly WheelStyle[] = ['wheel', 'disc', 'fan', 'orbit', 'planet'];
export const POINT_KINDS: readonly PointKind[] = ['rim', 'half', 'axis', 'custom'];

/** Identificadores de las magnitudes (todas en SI dentro del núcleo). */
export type VarId =
  | 'R'
  | 'd'
  | 'rp'
  | 'C'
  | 'theta0'
  | 'm'
  | 'rpm'
  | 'f'
  | 'T'
  | 'omega'
  | 'v'
  | 'ac'
  | 'Fc'
  | 't'
  | 'dtheta'
  | 's'
  | 'N'
  | 'thetaF'
  | 'x'
  | 'y'
  | 'omega0'
  | 'omegaF'
  | 'alpha'
  | 'at'
  | 'tStop'
  | 'totalAngle';

export type SiValues = Partial<Record<VarId, number>>;

export interface Settings {
  /** Valor de g (m/s²). */
  g: number;
  gPreset: '9.8' | '9.81' | '9.80665' | 'custom';
  /** Cifras significativas al mostrar (3 a 6). */
  sigFigs: number;
  theme: 'light' | 'dark' | 'system';
  textSize: 'normal' | 'large';
  startUnits: 'practical' | 'si';
}

export interface ReferenceSnapshot {
  mode: Mode;
  /** Todos los resultados en SI al momento de guardar. */
  si: SiValues;
  R: number;
  rp: number;
  /** Datos (en SI) con los que se obtuvo la referencia, por campo. */
  inputs: Partial<Record<string, number>>;
}

export interface Playback {
  playing: boolean;
  tau: number;
  loop: boolean;
  timeScaleOverride: number | null;
}

export interface DisplayOptions {
  showV: boolean;
  showAc: boolean;
  showAt: boolean;
  showA: boolean;
  showTrail: boolean;
  showAngle: boolean;
  showAxes: boolean;
  lockVectorScale: boolean;
}

export interface Geometry {
  /** Texto del radio o del diámetro, según radiusEditedAs. */
  radius: Quantity;
  radiusEditedAs: 'r' | 'd';
  /** custom: longitud o '%'. */
  point: { kind: PointKind; custom: Quantity };
  theta0: Quantity;
  direction: Direction;
  style: WheelStyle;
}

export interface McuState {
  rateSource: RateField | null;
  rate: Record<RateField, Quantity>;
  timeSource: TimeField | null;
  time: Record<TimeField, Quantity>;
  radiusPolicy: RadiusPolicy;
}

export interface McuvState {
  fields: Record<McuvField, Quantity>;
  /** Datos, máximo 3, en orden de edición. */
  knowns: KinVar[];
  /** Datos fijados con el alfiler. */
  pinned: KinVar[];
  alphaEnteredAs: 'alpha' | 'at';
  dthetaEnteredAs: 'dtheta' | 's';
}

export interface AppState {
  mode: Mode;
  geometry: Geometry;
  mass: Quantity;
  mcu: McuState;
  mcuv: McuvState;
  reference: ReferenceSnapshot | null;
  playback: Playback;
  display: DisplayOptions;
  settings: Settings;
}

export type FieldStatus = 'input' | 'computed' | 'empty' | 'error' | 'disabled';

/** Parámetros del movimiento para calcular valores instantáneos. */
export interface Motion {
  /** ω inicial con signo relativo al sentido elegido (rad/s). */
  omega0: number;
  /** α con signo relativo al sentido elegido (rad/s²). */
  alpha: number;
  /** Duración del intervalo (s) o null si no hay límite (MCU). */
  tEnd: number | null;
  R: number;
  rp: number;
  theta0: number;
  dirSign: 1 | -1;
  /** Masa (kg) o null si no se conoce. */
  m: number | null;
}

export interface Step {
  id: string;
  /** «Frecuencia» */
  title: string;
  /** Vínculo con el apartado de fórmulas (F05…). */
  formulaId?: string;
  /** f = \frac{rpm}{60} */
  formulaTex: string;
  /** \frac{120}{60} */
  substitutionTex: string;
  /** Resultado en SI con la unidad en que se muestra. */
  result: { value: number; unit: UnitId };
  note?: string;
  /** Campo de la calculadora que se resalta al pasar el cursor. */
  field?: string;
  formulaText: string;
  substitutionText: string;
  resultText: string;
  resultTex: string;
  /** Resultado en la unidad elegida en el campo, si no es la del SI. */
  altText?: string;
}

export interface SolveResult {
  ok: boolean;
  mode: Mode;
  /** No hay datos suficientes para determinar el movimiento. */
  incomplete: boolean;
  si: SiValues;
  fieldStatus: Record<string, FieldStatus>;
  errors: Message[];
  warnings: Message[];
  steps: Step[];
  motion: Motion | null;
  /** Combinación de la tabla 10.3 (solo MCUV). */
  combination?: number;
}
