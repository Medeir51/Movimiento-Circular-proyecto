import { Suspense, lazy } from 'react';
import { es } from '../../i18n/es';
import { shareUrl } from '../../store/persistence';
import { TABS, useAppStore } from '../../store/useAppStore';
import type { Tab } from '../../store/useAppStore';
import { InfoDialog } from '../formulas/InfoDialog';
import { SimulatorPage } from '../simulator/SimulatorPage';

// Las pestañas que no son el simulador se cargan aparte (también quedan en la precarga de la PWA).
const FormulasPage = lazy(() =>
  import('../formulas/FormulasPage').then((m) => ({ default: m.FormulasPage })),
);
const ApplicationsPage = lazy(() =>
  import('../applications/ApplicationsPage').then((m) => ({ default: m.ApplicationsPage })),
);
const ExercisesPage = lazy(() =>
  import('../exercises/ExercisesPage').then((m) => ({ default: m.ExercisesPage })),
);
const HelpPage = lazy(() => import('../help/HelpPage').then((m) => ({ default: m.HelpPage })));
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { SettingsDialog } from './SettingsDialog';
import { Toasts } from './Toasts';
import styles from './layout.module.css';

const TAB_ICONS: Record<Tab, IconName> = {
  simulator: 'simulator',
  formulas: 'formulas',
  applications: 'applications',
  exercises: 'exercises',
  help: 'help',
};

async function shareConfiguration(): Promise<void> {
  const s = useAppStore.getState();
  const url = shareUrl({
    mode: s.mode,
    geometry: s.geometry,
    mass: s.mass,
    mcu: s.mcu,
    mcuv: s.mcuv,
  });
  try {
    await navigator.clipboard.writeText(url);
    s.pushToast(es.share.copied);
  } catch {
    window.history.replaceState(null, '', url);
    s.pushToast(es.share.copyFailed, 'error');
  }
}

function Page({ tab }: { tab: Tab }) {
  switch (tab) {
    case 'simulator':
      return <SimulatorPage />;
    case 'formulas':
      return <FormulasPage />;
    case 'applications':
      return <ApplicationsPage />;
    case 'exercises':
      return <ExercisesPage />;
    case 'help':
      return <HelpPage />;
  }
}

function TabButtons({ variant }: { variant: 'top' | 'bottom' }) {
  const tab = useAppStore((s) => s.ui.tab);
  const setTab = useAppStore((s) => s.setTab);
  return (
    <>
      {TABS.map((t) => (
        <button
          key={t}
          type="button"
          className={variant === 'top' ? styles.tab : styles.bottomTab}
          aria-current={t === tab ? 'page' : undefined}
          onClick={() => {
            setTab(t);
            window.scrollTo({ top: 0 });
          }}
        >
          {variant === 'bottom' && <Icon name={TAB_ICONS[t]} size={22} />}
          <span>{es.nav[t]}</span>
        </button>
      ))}
    </>
  );
}

export function AppShell() {
  const tab = useAppStore((s) => s.ui.tab);
  const openSettings = useAppStore((s) => s.setSettingsOpen);
  return (
    <div className={styles.app}>
      <a className="skip-link" href="#main">
        {es.app.skipToContent}
      </a>
      <header className={styles.header}>
        <div className={styles.brand}>
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={28} height={28} />
          <h1 className={styles.appName}>{es.app.name}</h1>
        </div>
        <nav className={styles.topNav} aria-label={es.nav.label}>
          <TabButtons variant="top" />
        </nav>
        <div className={styles.headerActions}>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            aria-label={es.nav.settings}
            title={es.nav.settings}
            onClick={() => openSettings(true)}
          >
            <Icon name="gear" />
          </button>
          <button
            type="button"
            className="btn btn-small"
            aria-label={es.nav.share}
            onClick={() => void shareConfiguration()}
          >
            <Icon name="share" size={18} />
            <span className={styles.shareLabel}>{es.nav.share}</span>
          </button>
        </div>
      </header>
      <main id="main" className={styles.main} tabIndex={-1}>
        <Suspense fallback={<p className="muted">{es.common.loading}</p>}>
          <Page tab={tab} />
        </Suspense>
      </main>
      <nav className={`${styles.bottomNav} no-print`} aria-label={es.nav.label}>
        <TabButtons variant="bottom" />
      </nav>
      <Toasts />
      <SettingsDialog />
      <InfoDialog />
    </div>
  );
}
