import { es } from '../../i18n/es';
import { APP_TABS, useAppStore } from '../../store/useAppStore';
import { BankedCurveApp, FlatCurveApp } from './CurveApps';
import { OrbitApp } from './OrbitApp';
import styles from './applications.module.css';

/** Pestaña «Aplicaciones» con tres subpestañas (sección 17). */
export function ApplicationsPage() {
  const tab = useAppStore((s) => s.ui.appTab);
  const setTab = useAppStore((s) => s.setAppTab);
  const A = es.applications;
  return (
    <div className={styles.page}>
      <h2 className={styles.heading}>{A.heading}</h2>
      <div className={styles.tabs} role="tablist" aria-label={A.tabsLabel}>
        {APP_TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            id={`app-tab-${t}`}
            aria-selected={tab === t}
            aria-controls={`app-panel-${t}`}
            className={styles.tab}
            onClick={() => setTab(t)}
          >
            {A[t]}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`app-panel-${tab}`} aria-labelledby={`app-tab-${tab}`}>
        {tab === 'flat' && <FlatCurveApp />}
        {tab === 'banked' && <BankedCurveApp />}
        {tab === 'orbit' && <OrbitApp />}
      </div>
    </div>
  );
}
