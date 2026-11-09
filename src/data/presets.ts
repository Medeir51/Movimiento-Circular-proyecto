import { es } from '../i18n/es';
import { blankState } from '../core/defaults';
import type {
  AppState,
  KinVar,
  Mode,
  PointKind,
  RateField,
  UnitId,
  WheelStyle,
} from '../core/types';

/**
 * Casos predefinidos (sección 16). Los textos de los datos guardan el valor exacto;
 * la interfaz puede redondear al mostrar, pero el dato almacenado no.
 */

export const PRESET_IDS = [
  'bicycle',
  'vinyl',
  'fan',
  'car',
  'washer',
  'moon',
  'earthEquator',
  'bogota',
  'iss',
  'motorStart',
  'braking',
] as const;

export type PresetId = (typeof PRESET_IDS)[number];

interface PresetDef {
  mode: Mode;
  radius: [string, UnitId, 'r' | 'd'];
  point?: { kind: PointKind; custom: [string, UnitId] };
  style: WheelStyle;
  mass?: [string, UnitId];
  rate?: [RateField, string, UnitId];
  kin?: Array<[KinVar, string, UnitId]>;
}

const PRESETS: Record<PresetId, PresetDef> = {
  bicycle: {
    mode: 'MCU',
    radius: ['66', 'cm', 'd'],
    style: 'wheel',
    mass: ['0,5', 'kg'],
    rate: ['rpm', '120', 'rev/min'],
  },
  vinyl: {
    mode: 'MCU',
    radius: ['30', 'cm', 'd'],
    style: 'disc',
    mass: ['5', 'gram'],
    rate: ['rpm', '100/3', 'rev/min'],
  },
  fan: {
    mode: 'MCU',
    radius: ['40', 'cm', 'd'],
    style: 'fan',
    mass: ['10', 'gram'],
    rate: ['rpm', '1200', 'rev/min'],
  },
  car: {
    mode: 'MCU',
    radius: ['63,5', 'cm', 'd'],
    style: 'wheel',
    mass: ['30', 'gram'],
    rate: ['v', '60', 'km/h'],
  },
  washer: {
    mode: 'MCU',
    radius: ['48', 'cm', 'd'],
    style: 'disc',
    mass: ['1', 'kg'],
    rate: ['rpm', '1200', 'rev/min'],
  },
  moon: {
    mode: 'MCU',
    radius: ['384400', 'km', 'r'],
    style: 'orbit',
    mass: ['7,342e22', 'kg'],
    rate: ['T', '27,321661', 'd'],
  },
  earthEquator: {
    mode: 'MCU',
    radius: ['6378,137', 'km', 'r'],
    style: 'planet',
    mass: ['1', 'kg'],
    rate: ['T', '86164', 's'],
  },
  bogota: {
    mode: 'MCU',
    radius: ['6378,137', 'km', 'r'],
    point: { kind: 'custom', custom: ['6357,5', 'km'] },
    style: 'planet',
    mass: ['1', 'kg'],
    rate: ['T', '86164', 's'],
  },
  iss: {
    mode: 'MCU',
    radius: ['6791', 'km', 'r'],
    style: 'orbit',
    mass: ['420', 't'],
    rate: ['v', '7,66', 'km/s'],
  },
  motorStart: {
    mode: 'MCUV',
    radius: ['66', 'cm', 'd'],
    style: 'wheel',
    mass: ['0,5', 'kg'],
    kin: [
      ['omega0', '0', 'rpm'],
      ['omegaF', '300', 'rpm'],
      ['t', '5', 's'],
    ],
  },
  braking: {
    mode: 'MCUV',
    radius: ['0,5', 'm', 'r'],
    style: 'wheel',
    kin: [
      ['omega0', '20', 'rad/s'],
      ['alpha', '-4', 'rad/s2'],
      ['omegaF', '0', 'rad/s'],
    ],
  },
};

export function presetName(id: PresetId): string {
  return es.presets[id].name;
}

export function isPresetId(x: unknown): x is PresetId {
  return typeof x === 'string' && (PRESET_IDS as readonly string[]).includes(x);
}

/**
 * Estado completo de un caso. Conserva los ajustes, la visualización y la
 * reproducción del estado base; borra la referencia.
 */
export function presetState(id: PresetId, base: AppState): AppState {
  const def = PRESETS[id];
  const st = blankState(base.settings);
  st.display = { ...base.display };
  st.playback = { ...base.playback, tau: 0 };
  st.mode = def.mode;
  st.geometry.radius = { text: def.radius[0], unit: def.radius[1] };
  st.geometry.radiusEditedAs = def.radius[2];
  st.geometry.style = def.style;
  if (def.point) {
    st.geometry.point = {
      kind: def.point.kind,
      custom: { text: def.point.custom[0], unit: def.point.custom[1] },
    };
  }
  if (def.mass) st.mass = { text: def.mass[0], unit: def.mass[1] };
  if (def.rate) {
    const [field, text, unit] = def.rate;
    st.mcu.rate[field] = { text, unit };
    st.mcu.rateSource = field;
  }
  if (def.kin) {
    for (const [k, text, unit] of def.kin) {
      st.mcuv.fields[k] = { text, unit };
      st.mcuv.knowns.push(k);
    }
  }
  st.reference = null;
  return st;
}
