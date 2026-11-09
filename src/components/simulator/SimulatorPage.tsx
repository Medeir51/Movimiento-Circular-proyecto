import { useRef, useState } from 'react';
import { es } from '../../i18n/es';
import { selectView } from '../../store/selectors';
import { useAppStore } from '../../store/useAppStore';
import { DisplayOptions } from '../canvas/DisplayOptions';
import { PlaybackControls } from '../canvas/PlaybackControls';
import { SimCanvas } from '../canvas/SimCanvas';
import { TimeScaleBar } from '../canvas/TimeScaleBar';
import { ChartsPanel } from '../charts/ChartsPanel';
import { Icon } from '../layout/Icon';
import { DESKTOP_QUERY, MOBILE_QUERY, useMediaQuery } from '../layout/useMediaQuery';
import { StepsPanel } from '../steps/StepsPanel';
import { InputsColumn } from './Panels';
import { ResultsTable } from './ResultsTable';
import {
  CanvasArea,
  FirstVisitNotice,
  ModeBar,
  PresetCard,
  ResultsAnnouncer,
} from './SimulatorParts';
import { useSimulatorShortcuts } from './useSimulatorShortcuts';
import styles from './simulator.module.css';

function SimulatorSteps() {
  const view = useAppStore(selectView);
  return (
    <div className="card">
      <StepsPanel steps={view.result.steps} errors={view.result.errors} highlight />
    </div>
  );
}

type Section = 'data' | 'results' | 'steps' | 'charts';
const SECTIONS: Section[] = ['data', 'results', 'steps', 'charts'];

/** Celular: lienzo fijo arriba (plegable) y pestañas internas. */
function MobileSimulator() {
  const [section, setSection] = useState<Section>('data');
  const [collapsed, setCollapsed] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const playing = useAppStore((s) => s.playback.playing);
  const togglePlay = useAppStore((s) => s.togglePlay);
  const S = es.simulator;
  return (
    <div className={styles.mobile}>
      <h2 className="sr-only">{es.simulator.heading}</h2>
      <FirstVisitNotice />
      <ModeBar />
      <div ref={anchorRef} aria-hidden="true" />
      <div className={`${styles.mobileCanvas} ${collapsed ? styles.collapsed : ''}`}>
        {collapsed ? (
          <div className={styles.collapsedBar}>
            <button
              type="button"
              className="btn btn-primary btn-icon btn-small"
              onClick={togglePlay}
              aria-label={playing ? es.canvas.pause : es.canvas.play}
            >
              <Icon name={playing ? 'pause' : 'play'} size={18} />
            </button>
            <button type="button" className="btn btn-small" onClick={() => setCollapsed(false)}>
              <Icon name="chevronDown" size={18} />
              {S.expandCanvas}
            </button>
          </div>
        ) : (
          <section className={styles.mobileCanvasInner} aria-label={S.heading}>
            <div className={styles.mobileTop}>
              <TimeScaleBar />
              <button
                type="button"
                className="btn btn-ghost btn-icon btn-small"
                onClick={() => setCollapsed(true)}
                aria-label={S.collapseCanvas}
                title={S.collapseCanvas}
              >
                <Icon name="chevronUp" size={18} />
              </button>
            </div>
            <SimCanvas fill />
            <PlaybackControls />
          </section>
        )}
        <div className={styles.innerTabs} role="tablist" aria-label={S.mobileSections.label}>
          {SECTIONS.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              id={`sim-tab-${s}`}
              aria-selected={s === section}
              aria-controls={`sim-panel-${s}`}
              className={styles.innerTab}
              onClick={() => {
                setSection(s);
                // Si la barra fija ya está pegada arriba, mostrar el inicio de la nueva sección.
                const anchor = anchorRef.current;
                if (anchor) {
                  const header =
                    document.querySelector('header')?.getBoundingClientRect().height ?? 0;
                  const y = anchor.getBoundingClientRect().top + window.scrollY - header;
                  if (window.scrollY > y) window.scrollTo({ top: y });
                }
              }}
            >
              {S.mobileSections[s]}
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel" id={`sim-panel-${section}`} aria-labelledby={`sim-tab-${section}`}>
        {section === 'data' && (
          <>
            <InputsColumn />
            <div className={`card ${styles.mobileExtras}`}>
              <DisplayOptions />
              <PresetCard />
            </div>
          </>
        )}
        {section === 'results' && <ResultsTable />}
        {section === 'steps' && <SimulatorSteps />}
        {section === 'charts' && <ChartsPanel />}
      </div>
      <ResultsAnnouncer />
    </div>
  );
}

export function SimulatorPage() {
  useSimulatorShortcuts();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  if (isMobile) return <MobileSimulator />;
  return (
    <div className={styles.page}>
      <h2 className="sr-only">{es.simulator.heading}</h2>
      <FirstVisitNotice />
      <ModeBar />
      <div className={isDesktop ? styles.gridDesktop : styles.gridTablet}>
        <div className={styles.colInputs}>
          <InputsColumn />
        </div>
        <div className={styles.colCenter}>
          <CanvasArea />
          <ChartsPanel />
        </div>
        <div className={styles.colRight}>
          <ResultsTable />
          <SimulatorSteps />
        </div>
      </div>
      <ResultsAnnouncer />
    </div>
  );
}
