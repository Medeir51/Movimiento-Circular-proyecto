import { es } from '../../i18n/es';
import { TIME_SCALE_FACTORS, timeScaleLabel, timeScaleOption } from '../../core/timeScale';
import { useAppStore } from '../../store/useAppStore';
import { buildAnimModel } from './animModel';
import styles from './canvas.module.css';

/** Distintivo «Cámara lenta ×1/20» con selector manual y aviso W-STROBE (12.4). */
export function TimeScaleBar() {
  const model = useAppStore(buildAnimModel);
  const override = useAppStore((s) => s.playback.timeScaleOverride);
  const setOverride = useAppStore((s) => s.setTimeScaleOverride);
  const C = es.canvas;
  return (
    <div className={styles.timeBar}>
      <span className={styles.badge} aria-live="polite">
        {timeScaleLabel(model.timeScale)}
      </span>
      <label className={styles.timeSelect}>
        <span className="sr-only">{C.timeScaleLabel}</span>
        <select
          value={override === null ? 'auto' : String(override)}
          onChange={(e) => setOverride(e.target.value === 'auto' ? null : Number(e.target.value))}
        >
          <option value="auto">
            {C.timeAuto} ({timeScaleOption(model.autoScale)})
          </option>
          {TIME_SCALE_FACTORS.map((f) => (
            <option key={f} value={String(f)}>
              {timeScaleOption(f)}
            </option>
          ))}
        </select>
      </label>
      {model.strobe && (
        <p className={`msg-warning ${styles.strobe}`} role="status">
          {es.messages['W-STROBE']}
        </p>
      )}
    </div>
  );
}
