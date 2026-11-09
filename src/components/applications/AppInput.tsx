import { es } from '../../i18n/es';
import { messageText } from '../../core/messages';
import type { Message } from '../../core/messages';
import type { FieldStatus, Quantity, UnitId } from '../../core/types';
import type { AppsInputs } from '../../store/persistence';
import { useAppStore } from '../../store/useAppStore';
import type { AppField } from '../../store/useAppStore';
import { QuantityInput } from '../inputs/QuantityInput';

const snapshot = () => useAppStore.getState().apps;
const restore = (snap: unknown) => useAppStore.getState().setApps(snap as AppsInputs);

interface AppInputProps {
  target: AppField;
  quantity: Quantity;
  units: readonly UnitId[];
  errors: Message[];
  /** Si se indica, el campo es calculado y muestra este valor (en SI). */
  computedSI?: number;
  computed?: boolean;
  optional?: boolean;
  infoSymbol?: string;
}

/** Campo de una aplicación conectado al store. */
export function AppInput({
  target,
  quantity,
  units,
  errors,
  computedSI,
  computed,
  optional,
  infoSymbol,
}: AppInputProps) {
  const editApp = useAppStore((s) => s.editApp);
  const setAppUnit = useAppStore((s) => s.setAppUnit);
  const setInfo = useAppStore((s) => s.setInfoSymbol);
  const sig = useAppStore((s) => s.settings.sigFigs);
  const g = useAppStore((s) => s.settings.g);
  const meta =
    es.applications.fields[
      target.field === 'R' && target.app === 'orbit'
        ? 'Rorbit'
        : target.field === 'm' && target.app === 'orbit'
          ? 'msat'
          : target.field
    ];
  const err = errors.find((e) => e.field === target.field);
  let status: FieldStatus;
  if (err) status = 'error';
  else if (computed) status = 'computed';
  else status = quantity.text.trim() ? 'input' : 'empty';
  return (
    <QuantityInput
      id={`app-${target.app}-${target.field}`}
      sym={meta.sym}
      name={meta.name}
      quantity={quantity}
      status={status}
      computedSI={computedSI}
      units={units}
      onCommit={(t) => editApp(target, t)}
      onUnit={(u) => setAppUnit(target, u)}
      error={err ? messageText(err, sig, g) : null}
      g={g}
      sigFigs={sig}
      snapshot={snapshot}
      restore={restore}
      optional={optional}
      infoSymbol={infoSymbol}
      onInfo={infoSymbol ? setInfo : undefined}
    />
  );
}
