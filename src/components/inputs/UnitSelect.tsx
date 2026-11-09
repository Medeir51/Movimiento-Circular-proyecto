import { es, fill } from '../../i18n/es';
import { unitOptionLabel, unitSymbol } from '../../core/units';
import type { UnitId } from '../../core/types';
import styles from './inputs.module.css';

interface UnitSelectProps {
  value: UnitId;
  units: readonly UnitId[];
  name: string;
  onChange?: (unit: UnitId) => void;
  id?: string;
}

/** Selector de unidad; si solo hay una unidad, muestra su símbolo. */
export function UnitSelect({ value, units, name, onChange, id }: UnitSelectProps) {
  if (units.length <= 1 || !onChange) {
    const symbol = unitSymbol(value);
    return symbol ? <span className={styles.unitFixed}>{symbol}</span> : null;
  }
  return (
    <select
      id={id}
      className={styles.unitSelect}
      value={value}
      aria-label={fill(es.common.unitOf, { name })}
      onChange={(e) => onChange(e.target.value)}
    >
      {units.map((u) => (
        <option key={u} value={u}>
          {unitOptionLabel(u)}
        </option>
      ))}
    </select>
  );
}
