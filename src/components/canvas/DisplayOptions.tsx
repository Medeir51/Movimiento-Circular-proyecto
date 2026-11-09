import { es } from '../../i18n/es';
import type { DisplayOptions as Opts } from '../../core/types';
import { useAppStore } from '../../store/useAppStore';
import { Rich } from '../layout/Sym';
import styles from './canvas.module.css';

const ITEMS: Array<{
  key: keyof Opts;
  label: string;
  swatch?: string;
  dashed?: boolean;
  mcuvOnly?: boolean;
}> = [
  { key: 'showV', label: es.canvas.display.v, swatch: 'var(--vec-v)' },
  { key: 'showAc', label: es.canvas.display.ac, swatch: 'var(--vec-ac)' },
  { key: 'showAt', label: es.canvas.display.at, swatch: 'var(--vec-at)', mcuvOnly: true },
  {
    key: 'showA',
    label: es.canvas.display.a,
    swatch: 'var(--vec-a)',
    dashed: true,
    mcuvOnly: true,
  },
  { key: 'showTrail', label: es.canvas.display.trail },
  { key: 'showAngle', label: es.canvas.display.angle },
  { key: 'showAxes', label: es.canvas.display.axes },
  { key: 'lockVectorScale', label: es.canvas.display.lock },
];

/** Casillas debajo del lienzo; cada vector muestra su muestra de color (12.6). */
export function DisplayOptions() {
  const display = useAppStore((s) => s.display);
  const mode = useAppStore((s) => s.mode);
  const setDisplay = useAppStore((s) => s.setDisplay);
  return (
    <fieldset className={styles.display}>
      <legend className="sr-only">{es.canvas.display.label}</legend>
      {ITEMS.map((it) => (
        <label
          key={it.key}
          className={`${styles.check} ${it.mcuvOnly && mode !== 'MCUV' ? styles.dim : ''}`}
        >
          <input
            type="checkbox"
            checked={display[it.key]}
            onChange={(e) => setDisplay(it.key, e.target.checked)}
          />
          {it.swatch && (
            <span
              className={`${styles.swatch} ${it.dashed ? styles.swatchDashed : ''}`}
              style={{ borderColor: it.swatch, background: it.dashed ? 'transparent' : it.swatch }}
              aria-hidden="true"
            />
          )}
          <span>
            <Rich text={it.label} />
          </span>
        </label>
      ))}
    </fieldset>
  );
}
