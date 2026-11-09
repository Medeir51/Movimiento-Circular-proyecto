import { useId } from 'react';
import type { ReactNode } from 'react';
import styles from './inputs.module.css';

interface SegmentedProps<T extends string> {
  label: ReactNode;
  value: T;
  options: ReadonlyArray<{ value: T; label: ReactNode; title?: string }>;
  onChange: (value: T) => void;
  hideLabel?: boolean;
}

/** Control segmentado accesible (grupo de botones de opción). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  hideLabel,
}: SegmentedProps<T>) {
  const name = useId();
  return (
    <fieldset className={styles.segmentedWrap}>
      <legend className={hideLabel ? 'sr-only' : styles.segmentedLegend}>{label}</legend>
      <div className={styles.segmented}>
        {options.map((o) => (
          <label
            key={o.value}
            className={`${styles.segment} ${o.value === value ? styles.segmentOn : ''}`}
            title={o.title}
          >
            <input
              type="radio"
              className="sr-only"
              name={name}
              value={o.value}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
