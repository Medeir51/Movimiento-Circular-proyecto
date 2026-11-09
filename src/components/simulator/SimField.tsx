import { es } from '../../i18n/es';
import type { Quantity, UnitId, VarId } from '../../core/types';
import { selectView } from '../../store/selectors';
import { useAppStore } from '../../store/useAppStore';
import type { SimSnapshot } from '../../store/useAppStore';
import { QuantityInput } from '../inputs/QuantityInput';
import { FIELD_SYMBOL, fieldError } from './fieldMeta';

/** Clave de SiValues que se muestra en cada campo. */
const SI_KEY: Record<string, VarId> = { r: 'R' };

const snapshot = () => useAppStore.getState().snapshotSim();
const restore = (snap: unknown) => useAppStore.getState().restoreSim(snap as SimSnapshot);

interface SimFieldProps {
  field: string;
  quantity: Quantity;
  units: readonly UnitId[];
  onCommit: (text: string) => boolean | void;
  onUnit?: (unit: UnitId) => void;
  pin?: { pinned: boolean; disabled?: boolean; onToggle: () => void };
  optional?: boolean;
}

/** Campo del simulador conectado al resultado (estado, valor calculado, errores, resaltado). */
export function SimField({
  field,
  quantity,
  units,
  onCommit,
  onUnit,
  pin,
  optional,
}: SimFieldProps) {
  const view = useAppStore(selectView);
  const sig = useAppStore((s) => s.settings.sigFigs);
  const g = useAppStore((s) => s.settings.g);
  const highlight = useAppStore((s) => s.ui.highlightField === field);
  const transient = useAppStore((s) => s.ui.fieldErrors[field]);
  const setInfo = useAppStore((s) => s.setInfoSymbol);
  const meta = (es.fields as Record<string, { sym: string; name: string }>)[field];
  const status = view.result.fieldStatus[field] ?? 'empty';
  const key = SI_KEY[field] ?? (field as VarId);
  const error = transient ?? fieldError(view.result, field, sig, g);
  return (
    <QuantityInput
      id={`f-${field}`}
      sym={meta.sym}
      name={meta.name}
      quantity={quantity}
      status={status}
      computedSI={view.shown.si[key]}
      units={units}
      onCommit={onCommit}
      onUnit={onUnit}
      error={error}
      disabledReason={status === 'disabled' ? es.messages['E-AXIS'] : null}
      infoSymbol={FIELD_SYMBOL[field]}
      onInfo={setInfo}
      pin={pin}
      stale={view.stale}
      highlight={highlight}
      g={g}
      sigFigs={sig}
      snapshot={snapshot}
      restore={restore}
      infinityText={es.common.notRotating}
      optional={optional}
    />
  );
}
