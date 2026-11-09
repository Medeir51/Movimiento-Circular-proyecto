import { es } from '../../i18n/es';
import type { PointKind } from '../../core/types';
import { Segmented } from './Segmented';

/** Borde · Mitad · Eje · Otro (el campo «Otro» lo agrega el panel). */
export function PointSelector({
  value,
  onChange,
}: {
  value: PointKind;
  onChange: (k: PointKind) => void;
}) {
  const S = es.simulator;
  return (
    <Segmented
      label={S.point}
      value={value}
      onChange={onChange}
      options={[
        { value: 'rim', label: S.pointRim },
        { value: 'half', label: S.pointHalf },
        { value: 'axis', label: S.pointAxis },
        { value: 'custom', label: S.pointCustom },
      ]}
    />
  );
}
