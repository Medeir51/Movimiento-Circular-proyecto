import { es } from '../i18n/es';
import { SETTINGS_KEY, STATE_KEY, decodeShare, writeStorage } from './persistence';
import type { PersistedState } from './persistence';
import { useAppStore } from './useAppStore';
import type { StoreState } from './useAppStore';

/** Carga una configuración compartida desde #s=… (19.8). */
export function importSharedFromHash(): void {
  const { hash, pathname, search } = window.location;
  if (!hash.startsWith('#s=')) return;
  const sim = decodeShare(hash.slice(3));
  const st = useAppStore.getState();
  if (sim) {
    st.importShared(sim);
    st.pushToast(es.share.loaded);
  } else {
    st.pushToast(es.share.invalid, 'error');
  }
  window.history.replaceState(null, '', `${pathname}${search}`);
}

function persistedOf(s: StoreState): PersistedState {
  return {
    v: 1,
    sim: {
      mode: s.mode,
      geometry: s.geometry,
      mass: s.mass,
      mcu: s.mcu,
      mcuv: s.mcuv,
      reference: s.reference,
      display: s.display,
      loop: s.playback.loop,
      timeScaleOverride: s.playback.timeScaleOverride,
    },
    apps: s.apps,
    ui: {
      tab: s.ui.tab,
      appTab: s.ui.appTab,
      activePreset: s.ui.activePreset,
      firstVisitDismissed: s.ui.firstVisitDismissed,
    },
  };
}

/** Partes del estado que se guardan (para no escribir en cada cuadro de la animación). */
function watched(s: StoreState): unknown[] {
  return [
    s.mode,
    s.geometry,
    s.mass,
    s.mcu,
    s.mcuv,
    s.reference,
    s.display,
    s.playback.loop,
    s.playback.timeScaleOverride,
    s.apps,
    s.ui.tab,
    s.ui.appTab,
    s.ui.activePreset,
    s.ui.firstVisitDismissed,
    s.settings,
  ];
}

function save(): void {
  const s = useAppStore.getState();
  writeStorage(STATE_KEY, JSON.stringify(persistedOf(s)));
  writeStorage(SETTINGS_KEY, JSON.stringify(s.settings));
}

/** Guardado automático 500 ms después de cada cambio (19.7). */
export function setupPersistence(): void {
  let timer: number | undefined;
  let prev = watched(useAppStore.getState());
  let pending = false;
  useAppStore.subscribe((s) => {
    const cur = watched(s);
    if (cur.every((v, i) => v === prev[i])) return;
    prev = cur;
    pending = true;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      pending = false;
      save();
    }, 500);
  });
  const flush = () => {
    if (pending) {
      window.clearTimeout(timer);
      pending = false;
      save();
    }
  };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

/** Tema y tamaño del texto según los ajustes. */
export function setupTheme(): void {
  const root = document.documentElement;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = () => {
    const { theme, textSize } = useAppStore.getState().settings;
    root.dataset.theme = theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme;
    root.dataset.textSize = textSize;
  };
  apply();
  mq.addEventListener('change', apply);
  let prevSettings = useAppStore.getState().settings;
  useAppStore.subscribe((s) => {
    if (s.settings !== prevSettings) {
      prevSettings = s.settings;
      apply();
    }
  });
}
