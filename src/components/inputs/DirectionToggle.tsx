import { es } from '../../i18n/es';
import type { Direction } from '../../core/types';
import { Icon } from '../layout/Icon';
import { Segmented } from './Segmented';

/** ↺ Antihorario / ↻ Horario. */
export function DirectionToggle({
  value,
  onChange,
}: {
  value: Direction;
  onChange: (d: Direction) => void;
}) {
  return (
    <Segmented
      label={es.simulator.direction}
      value={value}
      onChange={onChange}
      options={[
        {
          value: 'ccw',
          label: (
            <>
              <Icon name="ccw" size={16} /> {es.simulator.ccw}
            </>
          ),
        },
        {
          value: 'cw',
          label: (
            <>
              <Icon name="cw" size={16} /> {es.simulator.cw}
            </>
          ),
        },
      ]}
    />
  );
}
