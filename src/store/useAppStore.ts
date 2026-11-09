import { create } from 'zustand';
import { es, fill } from '../i18n/es';
import {
  defaultBankedInputs,
  defaultFlatInputs,
  defaultOrbitInputs,
} from '../core/applications/defaults';
import { solveOrbit } from '../core/applications/orbit';
import type { OrbitBody, OrbitSource } from '../core/applications/types';
import { DEFAULT_SETTINGS, blankState, defaultUnits } from '../core/defaults';
import * as E from '../core/edits';
import type { FieldPath } from '../core/edits';
import type { ExerciseLoad } from '../core/exercises/templates';
import { instantFromMotion } from '../core/kinematics';
import { formatExact, parseNumber } from '../core/numberFormat';
import { fromSI, toSI } from '../core/units';
import type {
  AppState,
  Direction,
  DisplayOptions,
  KinVar,
  McuvField,
  Mode,
  PointKind,
  Quantity,
  RadiusPolicy,
  RateField,
  Settings,
  TimeField,
  UnitId,
  WheelStyle,
} from '../core/types';
import { isPresetId, presetName, presetState } from '../data/presets';
import type { PresetId } from '../data/presets';
import { simClock } from './clock';
import {
  SETTINGS_KEY,
  STATE_KEY,
  parsePersisted,
  parseSettings,
  readStorage,
  removeStorage,
} from './persistence';
import type { AppsInputs, SharedSim } from './persistence';

export type Tab = 'simulator' | 'formulas' | 'applications' | 'exercises' | 'help';
export const TABS: readonly Tab[] = ['simulator', 'formulas', 'applications', 'exercises', 'help'];
export type AppTab = 'flat' | 'banked' | 'orbit';
export const APP_TABS: readonly AppTab[] = ['flat', 'banked', 'orbit'];

export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'error';
}

export interface UiState {
  tab: Tab;
  appTab: AppTab;
  activePreset: PresetId | null;
  /** Campo resaltado al pasar el cursor por un paso. */
  highlightField: string | null;
  /** Pedido de abrir una fórmula, un símbolo o el glosario en el apartado de fórmulas. */
  formulaFocus: { formulaId?: string; symbol?: string; glossary?: boolean; nonce: number } | null;
  /** Símbolo de la ventana ⓘ abierta. */
  infoSymbol: string | null;
  settingsOpen: boolean;
  firstVisitDismissed: boolean;
  toasts: Toast[];
  /** Mensajes temporales por campo (por ejemplo, E-MCUV-PIN). */
  fieldErrors: Record<string, string>;
}

export type SimSnapshot = Pick<AppState, 'mode' | 'geometry' | 'mass' | 'mcu' | 'mcuv'>;

export type AppField =
  | { app: 'flat'; field: 'R' | 'v' | 'mu' | 'm' }
  | { app: 'banked'; field: 'R' | 'beta' | 'mu' | 'v' | 'm' }
  | { app: 'orbit'; field: 'M' | 'Rbody' | 'R' | 'h' | 'T' | 'm' };

export interface StoreState extends AppState {
  apps: AppsInputs;
  ui: UiState;
}

export interface StoreActions {
  setMode: (mode: Mode) => void;
  loadPreset: (id: PresetId) => void;
  editRadius: (which: 'r' | 'd', text: string) => void;
  setPointKind: (kind: PointKind) => void;
  editPointCustom: (text: string) => void;
  editTheta0: (text: string) => void;
  setDirection: (d: Direction) => void;
  setStyle: (s: WheelStyle) => void;
  setRadiusPolicy: (p: RadiusPolicy) => void;
  editMass: (text: string) => void;
  editRate: (field: RateField, text: string) => void;
  editTime: (field: TimeField, text: string) => void;
  editMcuv: (field: McuvField, text: string) => boolean;
  togglePin: (v: KinVar) => void;
  setUnit: (path: FieldPath, unit: UnitId) => void;
  snapshotSim: () => SimSnapshot;
  restoreSim: (snap: SimSnapshot) => void;
  saveReference: () => void;
  clearReference: () => void;
  setPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  seek: (tau: number) => void;
  syncTau: (tau: number) => void;
  stepFrame: (dir: 1 | -1) => void;
  setLoop: (loop: boolean) => void;
  setTimeScaleOverride: (factor: number | null) => void;
  setDisplay: (key: keyof DisplayOptions, value: boolean) => void;
  setSettings: (patch: Partial<Settings>) => void;
  resetAll: () => void;
  editApp: (f: AppField, text: string) => void;
  setApps: (apps: AppsInputs) => void;
  setAppUnit: (f: AppField, unit: UnitId) => void;
  setOrbitBody: (body: OrbitBody) => void;
  orbitShortcut: (kind: 'iss' | 'gps' | 'geo' | 'moon') => void;
  openOrbitInSimulator: () => void;
  loadExercise: (load: ExerciseLoad) => void;
  importShared: (sim: SharedSim) => void;
  setTab: (tab: Tab) => void;
  setAppTab: (tab: AppTab) => void;
  setHighlightField: (field: string | null) => void;
  openFormula: (formulaId: string) => void;
  openSymbol: (symbol: string) => void;
  openGlossary: () => void;
  clearFormulaFocus: () => void;
  setInfoSymbol: (symbol: string | null) => void;
  setSettingsOpen: (open: boolean) => void;
  dismissFirstVisit: () => void;
  pushToast: (text: string, tone?: Toast['tone']) => void;
  dismissToast: (id: number) => void;
  setFieldError: (field: string, text: string | null) => void;
}

export type Store = StoreState & StoreActions;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function defaultApps(settings: Settings): AppsInputs {
  const u = defaultUnits(settings.startUnits);
  return {
    flat: defaultFlatInputs(u),
    banked: defaultBankedInputs(u),
    orbit: defaultOrbitInputs(u),
  };
}

function defaultUi(): UiState {
  return {
    tab: 'simulator',
    appTab: 'flat',
    activePreset: 'bicycle',
    highlightField: null,
    formulaFocus: null,
    infoSymbol: null,
    settingsOpen: false,
    firstVisitDismissed: false,
    toasts: [],
    fieldErrors: {},
  };
}

/** Estado por defecto: caso Rueda de bicicleta (19.7). */
export function defaultStoreState(settings: Settings = DEFAULT_SETTINGS): StoreState {
  const sim = presetState('bicycle', blankState(settings));
  sim.playback = { ...sim.playback, playing: !prefersReducedMotion() };
  return { ...sim, apps: defaultApps(settings), ui: defaultUi() };
}

function initialState(): StoreState {
  const settings = parseSettings(readStorage(SETTINGS_KEY)) ?? DEFAULT_SETTINGS;
  const state = defaultStoreState(settings);
  const saved = parsePersisted(readStorage(STATE_KEY));
  if (!saved) return state;
  const { sim } = saved;
  return {
    ...state,
    mode: sim.mode,
    geometry: sim.geometry,
    mass: sim.mass,
    mcu: sim.mcu,
    mcuv: sim.mcuv,
    reference: sim.reference,
    display: sim.display,
    playback: { ...state.playback, loop: sim.loop, timeScaleOverride: sim.timeScaleOverride },
    apps: saved.apps,
    ui: {
      ...state.ui,
      tab: (TABS as readonly string[]).includes(saved.ui.tab) ? (saved.ui.tab as Tab) : 'simulator',
      appTab: (APP_TABS as readonly string[]).includes(saved.ui.appTab)
        ? (saved.ui.appTab as AppTab)
        : 'flat',
      activePreset: isPresetId(saved.ui.activePreset) ? saved.ui.activePreset : null,
      firstVisitDismissed: saved.ui.firstVisitDismissed,
    },
  };
}

/** Parte del estado que reciben las funciones puras del núcleo. */
export function pickSim(s: StoreState): AppState {
  return {
    mode: s.mode,
    geometry: s.geometry,
    mass: s.mass,
    mcu: s.mcu,
    mcuv: s.mcuv,
    reference: s.reference,
    playback: s.playback,
    display: s.display,
    settings: s.settings,
  };
}

/** Solo las partes de datos (para que la reproducción y los ajustes no se reemplacen). */
function dataOf(next: AppState): Partial<StoreState> {
  return {
    mode: next.mode,
    geometry: next.geometry,
    mass: next.mass,
    mcu: next.mcu,
    mcuv: next.mcuv,
  };
}

let toastId = 0;

const kinName = (v: KinVar): string => {
  const sym = es.fields[v].sym;
  return sym.replace(/_(\d)/, '$1');
};

/** Convierte el texto de un campo de las aplicaciones al cambiar su unidad. */
function convertAppQuantity(q: Quantity, unit: UnitId, g: number): Quantity {
  const p = parseNumber(q.text);
  if (p.status !== 'ok') return { ...q, unit };
  return { text: formatExact(fromSI(toSI(p.value, q.unit, g), unit, g)), unit };
}

export const useAppStore = create<Store>()((set, get) => {
  /** Aplica una transición pura del núcleo a los datos del simulador. */
  const apply = (fn: (s: AppState) => AppState) => {
    const next = fn(pickSim(get()));
    set(dataOf(next));
  };

  return {
    ...initialState(),

    setMode: (mode) => {
      const s = get();
      const next = E.setMode(pickSim(s), mode, simClock.tau);
      set({ ...dataOf(next), reference: null });
      get().seek(0);
    },

    loadPreset: (id) => {
      const s = get();
      const next = presetState(id, pickSim(s));
      set({
        ...dataOf(next),
        reference: null,
        ui: { ...s.ui, activePreset: id, fieldErrors: {} },
      });
      get().seek(0);
      get().pushToast(fill(es.toasts.presetLoaded, { name: presetName(id) }));
    },

    editRadius: (which, text) => apply((st) => E.editRadius(st, which, text)),
    setPointKind: (kind) => apply((st) => E.setPointKind(st, kind)),
    editPointCustom: (text) => apply((st) => E.editPointCustom(st, text)),
    editTheta0: (text) => apply((st) => E.editTheta0(st, text)),
    setDirection: (d) => apply((st) => E.setDirection(st, d)),
    setStyle: (style) => apply((st) => E.setStyle(st, style)),
    setRadiusPolicy: (p) => apply((st) => E.setRadiusPolicy(st, p)),
    editMass: (text) => apply((st) => E.editMass(st, text)),
    editRate: (field, text) => apply((st) => E.editRate(st, field, text)),
    editTime: (field, text) => apply((st) => E.editTime(st, field, text)),

    editMcuv: (field, text) => {
      const res = E.editMcuv(pickSim(get()), field, text);
      if (res.rejected) {
        get().setFieldError(field, es.messages['E-MCUV-PIN']);
        return false;
      }
      set(dataOf(res.state));
      get().setFieldError(field, null);
      if (res.dropped)
        get().pushToast(fill(es.simulator.kinDropped, { name: kinName(res.dropped) }));
      return true;
    },

    togglePin: (v) => {
      const res = E.togglePin(pickSim(get()), v);
      if (res.rejected) {
        get().pushToast(es.messages['E-MCUV-PIN'], 'error');
        return;
      }
      set((s) => ({ ...dataOf(res.state), ui: { ...s.ui, fieldErrors: {} } }));
      if (res.dropped)
        get().pushToast(fill(es.simulator.kinDropped, { name: kinName(res.dropped) }));
    },

    setUnit: (path, unit) => apply((st) => E.setUnit(st, path, unit)),

    snapshotSim: () => {
      const s = get();
      return { mode: s.mode, geometry: s.geometry, mass: s.mass, mcu: s.mcu, mcuv: s.mcuv };
    },

    restoreSim: (snap) => set({ ...snap }),

    saveReference: () => {
      const st = pickSim(get());
      const ref = E.makeReference(st, E.solve(st));
      if (ref) {
        set({ reference: ref });
        get().pushToast(es.results.referenceSaved);
      }
    },

    clearReference: () => {
      set({ reference: null });
      get().pushToast(es.toasts.referenceCleared);
    },

    setPlaying: (playing) => set((s) => ({ playback: { ...s.playback, playing } })),

    togglePlay: () => {
      const s = get();
      const playing = !s.playback.playing;
      if (playing && s.mode === 'MCUV') {
        const motion = E.solve(pickSim(s)).motion;
        if (motion?.tEnd != null && simClock.tau >= motion.tEnd) get().seek(0);
      }
      set((st) => ({ playback: { ...st.playback, playing } }));
    },

    seek: (tau) => {
      const t = Math.max(0, tau);
      simClock.set(t);
      set((s) => ({ playback: { ...s.playback, tau: t } }));
    },

    syncTau: (tau) => set((s) => ({ playback: { ...s.playback, tau } })),

    stepFrame: (dir) => {
      const s = get();
      const r = E.solve(pickSim(s));
      const m = r.motion;
      let step = 0.1;
      let max = Number.POSITIVE_INFINITY;
      if (m) {
        if (m.tEnd !== null) {
          step = m.tEnd / 100;
          max = m.tEnd;
        } else {
          const w = Math.abs(instantFromMotion(m, 0).omega);
          if (w > 0) step = (2 * Math.PI) / w / 24;
        }
      }
      set((st) => ({ playback: { ...st.playback, playing: false } }));
      get().seek(Math.min(max, Math.max(0, simClock.tau + dir * step)));
    },

    setLoop: (loop) => set((s) => ({ playback: { ...s.playback, loop } })),
    setTimeScaleOverride: (factor) =>
      set((s) => ({ playback: { ...s.playback, timeScaleOverride: factor } })),
    setDisplay: (key, value) => set((s) => ({ display: { ...s.display, [key]: value } })),

    setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

    resetAll: () => {
      removeStorage(STATE_KEY);
      removeStorage(SETTINGS_KEY);
      const fresh = defaultStoreState(DEFAULT_SETTINGS);
      set({ ...fresh, ui: { ...fresh.ui, toasts: [] } });
      get().seek(0);
      get().pushToast(es.settings.resetDone);
    },

    editApp: (f, text) =>
      set((s) => {
        const apps = structuredClone(s.apps);
        if (f.app === 'flat') apps.flat[f.field].text = text;
        else if (f.app === 'banked') apps.banked[f.field].text = text;
        else {
          apps.orbit[f.field].text = text;
          if (f.field === 'R' || f.field === 'h' || f.field === 'T') {
            apps.orbit.source = f.field as OrbitSource;
          }
        }
        return { apps };
      }),

    setApps: (apps) => set({ apps }),

    setAppUnit: (f, unit) =>
      set((s) => {
        const apps = structuredClone(s.apps);
        const g = s.settings.g;
        if (f.app === 'flat') apps.flat[f.field] = convertAppQuantity(apps.flat[f.field], unit, g);
        else if (f.app === 'banked')
          apps.banked[f.field] = convertAppQuantity(apps.banked[f.field], unit, g);
        else {
          const isData =
            !(f.field === 'R' || f.field === 'h' || f.field === 'T') ||
            apps.orbit.source === f.field;
          apps.orbit[f.field] = isData
            ? convertAppQuantity(apps.orbit[f.field], unit, g)
            : { ...apps.orbit[f.field], unit };
        }
        return { apps };
      }),

    setOrbitBody: (body) => set((s) => ({ apps: { ...s.apps, orbit: { ...s.apps.orbit, body } } })),

    orbitShortcut: (kind) =>
      set((s) => {
        const o = structuredClone(s.apps.orbit);
        o.body = 'earth';
        const g = s.settings.g;
        const put = (field: 'R' | 'h' | 'T', valueSI: number) => {
          o.source = field;
          o[field].text = formatExact(fromSI(valueSI, o[field].unit, g));
        };
        if (kind === 'iss') put('h', 420e3);
        else if (kind === 'gps') put('h', 20200e3);
        else if (kind === 'geo') put('T', 86164);
        else put('R', 384400e3);
        return { apps: { ...s.apps, orbit: o } };
      }),

    openOrbitInSimulator: () => {
      const s = get();
      const r = solveOrbit(s.apps.orbit, s.settings);
      const R = r.values.R;
      const v = r.values.v;
      if (!r.ok || R === undefined || v === undefined) return;
      const st = blankState(s.settings);
      st.geometry.radius = { text: formatExact(R / 1000), unit: 'km' };
      st.geometry.radiusEditedAs = 'r';
      st.geometry.style = 'orbit';
      st.mcu.rate.v = { text: formatExact(v / 1000), unit: 'km/s' };
      st.mcu.rateSource = 'v';
      if (r.values.m !== undefined) st.mass = { ...s.apps.orbit.m };
      set({
        ...dataOf(st),
        reference: null,
        ui: { ...s.ui, tab: 'simulator', activePreset: null },
      });
      get().seek(0);
      get().pushToast(es.applications.openedInSimulator);
    },

    loadExercise: (load) => {
      const s = get();
      if (load.target === 'simulator') {
        set({
          ...dataOf(load.state),
          reference: null,
          ui: { ...s.ui, tab: 'simulator', activePreset: null },
        });
        get().seek(0);
      } else {
        const apps = structuredClone(s.apps);
        if (load.target === 'flat') apps.flat = load.inputs;
        else if (load.target === 'banked') apps.banked = load.inputs;
        else apps.orbit = load.inputs;
        set({ apps, ui: { ...s.ui, tab: 'applications', appTab: load.target } });
      }
      get().pushToast(es.exercises.opened);
    },

    importShared: (sim) => {
      const s = get();
      set({ ...sim, reference: null, ui: { ...s.ui, tab: 'simulator', activePreset: null } });
      get().seek(0);
    },

    setTab: (tab) => set((s) => ({ ui: { ...s.ui, tab } })),
    setAppTab: (appTab) => set((s) => ({ ui: { ...s.ui, appTab } })),
    setHighlightField: (field) =>
      set((s) => (s.ui.highlightField === field ? s : { ui: { ...s.ui, highlightField: field } })),
    openFormula: (formulaId) =>
      set((s) => ({
        ui: {
          ...s.ui,
          tab: 'formulas',
          infoSymbol: null,
          formulaFocus: { formulaId, nonce: (s.ui.formulaFocus?.nonce ?? 0) + 1 },
        },
      })),
    openSymbol: (symbol) =>
      set((s) => ({
        ui: {
          ...s.ui,
          tab: 'formulas',
          infoSymbol: null,
          formulaFocus: { symbol, nonce: (s.ui.formulaFocus?.nonce ?? 0) + 1 },
        },
      })),
    openGlossary: () =>
      set((s) => ({
        ui: {
          ...s.ui,
          tab: 'formulas',
          formulaFocus: { glossary: true, nonce: (s.ui.formulaFocus?.nonce ?? 0) + 1 },
        },
      })),
    clearFormulaFocus: () => set((s) => ({ ui: { ...s.ui, formulaFocus: null } })),
    setInfoSymbol: (symbol) => set((s) => ({ ui: { ...s.ui, infoSymbol: symbol } })),
    setSettingsOpen: (open) => set((s) => ({ ui: { ...s.ui, settingsOpen: open } })),
    dismissFirstVisit: () => set((s) => ({ ui: { ...s.ui, firstVisitDismissed: true } })),
    pushToast: (text, tone = 'info') => {
      const id = ++toastId;
      set((s) => ({ ui: { ...s.ui, toasts: [...s.ui.toasts.slice(-3), { id, text, tone }] } }));
      window.setTimeout(() => get().dismissToast(id), 4000);
    },
    dismissToast: (id) =>
      set((s) => ({ ui: { ...s.ui, toasts: s.ui.toasts.filter((t) => t.id !== id) } })),
    setFieldError: (field, text) =>
      set((s) => {
        const fieldErrors = { ...s.ui.fieldErrors };
        if (text === null) {
          if (!(field in fieldErrors)) return s;
          delete fieldErrors[field];
        } else fieldErrors[field] = text;
        return { ui: { ...s.ui, fieldErrors } };
      }),
  };
});
