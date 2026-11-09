import { useEffect, useState } from 'react';
import { es, fill } from '../../i18n/es';
import { formatQuantity } from '../../core/numberFormat';
import { PRESET_IDS, isPresetId } from '../../data/presets';
import { selectView } from '../../store/selectors';
import { useAppStore } from '../../store/useAppStore';
import { DisplayOptions } from '../canvas/DisplayOptions';
import { PlaybackControls } from '../canvas/PlaybackControls';
import { SimCanvas } from '../canvas/SimCanvas';
import { TimeScaleBar } from '../canvas/TimeScaleBar';
import { Segmented } from '../inputs/Segmented';
import { Icon } from '../layout/Icon';
import { Rich } from '../layout/Sym';
import canvasStyles from '../canvas/canvas.module.css';
import styles from './simulator.module.css';

const S = es.simulator;

/** Selector de modo y menú de casos. */
export function ModeBar() {
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  const activePreset = useAppStore((s) => s.ui.activePreset);
  const loadPreset = useAppStore((s) => s.loadPreset);
  return (
    <div className={`card ${styles.modeBar}`}>
      <Segmented
        label={S.modeLabel}
        value={mode}
        onChange={setMode}
        options={[
          { value: 'MCU', label: S.modeMCU },
          { value: 'MCUV', label: S.modeMCUV },
        ]}
      />
      <label className={styles.presetSelect}>
        <span>{S.presetsLabel}</span>
        <select
          value={activePreset ?? ''}
          onChange={(e) => {
            if (isPresetId(e.target.value)) loadPreset(e.target.value);
          }}
        >
          <option value="" disabled>
            {S.presetsPlaceholder}
          </option>
          {PRESET_IDS.map((id) => (
            <option key={id} value={id}>
              {es.presets[id].name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

/** Tarjeta del caso cargado con su pregunta para explorar. */
export function PresetCard() {
  const id = useAppStore((s) => s.ui.activePreset);
  if (!id) return null;
  const p = es.presets[id];
  return (
    <aside className={canvasStyles.presetCard} aria-label={S.presetCardLabel}>
      <h3>{p.name}</h3>
      <p>
        <Rich text={p.description} />
      </p>
      <p className={canvasStyles.question}>
        <span className="sr-only">{S.presetQuestion}: </span>
        <Rich text={p.question} />
      </p>
    </aside>
  );
}

/** Lienzo con escala de tiempo, controles, leyenda y tarjeta del caso. */
export function CanvasArea({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`card ${canvasStyles.area}`} aria-label={S.heading}>
      <TimeScaleBar />
      <SimCanvas />
      <PlaybackControls />
      {!compact && <DisplayOptions />}
      {!compact && <PresetCard />}
    </section>
  );
}

/** Aviso cerrable en la primera visita. */
export function FirstVisitNotice() {
  const dismissed = useAppStore((s) => s.ui.firstVisitDismissed);
  const dismiss = useAppStore((s) => s.dismissFirstVisit);
  const loadPreset = useAppStore((s) => s.loadPreset);
  if (dismissed) return null;
  return (
    <div className={`msg-info ${styles.firstVisit}`} role="note">
      <span>
        {S.firstVisit}{' '}
        <button
          type="button"
          className={styles.linkButton}
          onClick={() => {
            loadPreset('bicycle');
            dismiss();
          }}
        >
          {S.firstVisitCase}
        </button>
      </span>
      <button
        type="button"
        className="btn btn-ghost btn-icon btn-small"
        aria-label={S.firstVisitDismiss}
        onClick={dismiss}
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}

/** Anuncia los resultados en una región aria-live como máximo una vez por segundo. */
export function ResultsAnnouncer() {
  const view = useAppStore(selectView);
  const sig = useAppStore((s) => s.settings.sigFigs);
  const g = useAppStore((s) => s.settings.g);
  const [text, setText] = useState('');
  const si = view.shown.si;
  const parts: string[] = [];
  const keys =
    view.shown.mode === 'MCU'
      ? ([
          ['f', 'Hz'],
          ['T', 's'],
          ['omega', 'rad/s'],
          ['v', 'm/s'],
          ['ac', 'm/s2'],
          ['Fc', 'N'],
        ] as const)
      : ([
          ['omega0', 'rad/s'],
          ['omegaF', 'rad/s'],
          ['alpha', 'rad/s2'],
          ['t', 's'],
          ['dtheta', 'rad'],
        ] as const);
  for (const [k, unit] of keys) {
    const v = si[k];
    if (v !== undefined && Number.isFinite(v)) {
      parts.push(`${es.fields[k].sym.replace(/_(\w)/, '$1')} = ${formatQuantity(v, unit, sig, g)}`);
    }
  }
  const summary = parts.length ? fill(S.announce, { summary: parts.join(', ') }) : '';

  useEffect(() => {
    const id = window.setTimeout(() => setText(summary), 1000);
    return () => window.clearTimeout(id);
  }, [summary]);

  return (
    <div className="sr-only" aria-live="polite" role="status">
      {text}
    </div>
  );
}
