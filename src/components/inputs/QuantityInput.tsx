import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { es, fill } from '../../i18n/es';
import { formatNumber, formatQuantity, parseNumber } from '../../core/numberFormat';
import { fromSI, isSIUnit, siUnitOf } from '../../core/units';
import type { FieldStatus, Quantity, UnitId } from '../../core/types';
import { Icon } from '../layout/Icon';
import { Rich, Sym } from '../layout/Sym';
import { UnitSelect } from './UnitSelect';
import styles from './inputs.module.css';

export interface QuantityInputProps {
  /** id único del <input>. */
  id: string;
  sym: string;
  name: string;
  quantity: Quantity;
  status: FieldStatus;
  /** Valor (en SI) que se muestra si el campo es calculado. */
  computedSI?: number;
  units: readonly UnitId[];
  /** Guarda el texto; devuelve false si la edición se rechazó. */
  onCommit: (text: string) => boolean | void;
  onUnit?: (unit: UnitId) => void;
  /** Mensaje de error del campo (ya traducido). */
  error?: string | null;
  /** Explicación cuando el campo no puede ser dato (por ejemplo, E-AXIS). */
  disabledReason?: string | null;
  infoSymbol?: string;
  onInfo?: (symbol: string) => void;
  pin?: { pinned: boolean; disabled?: boolean; onToggle: () => void };
  stale?: boolean;
  highlight?: boolean;
  g: number;
  sigFigs: number;
  /** Guarda y restaura el estado al presionar Esc. */
  snapshot?: () => unknown;
  restore?: (snap: unknown) => void;
  /** Texto para mostrar valores infinitos (T con ω = 0). */
  infinityText?: string;
  optional?: boolean;
}

const DEBOUNCE_MS = 250;

/**
 * Campo con símbolo, unidad, distintivo dato/calculado, alfiler (MCUV), ⓘ y mensaje de error.
 * Recalcula 250 ms después de la última tecla; Enter confirma y Esc restaura (8.2).
 */
export function QuantityInput(p: QuantityInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const pending = useRef<string | null>(null);
  const snap = useRef<unknown>(undefined);
  const [focused, setFocused] = useState(false);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const isData = p.status === 'input' || p.status === 'error';
  const disabled = p.status === 'disabled';
  const unit = p.quantity.unit;

  let computedText = '';
  if (!isData && p.computedSI !== undefined) {
    const v = fromSI(p.computedSI, unit, p.g);
    computedText =
      !Number.isFinite(v) && p.infinityText ? p.infinityText : formatNumber(v, p.sigFigs);
  }
  const shown = draft ?? (isData ? p.quantity.text : computedText);

  const localError = (() => {
    if (draft === null) return null;
    const r = parseNumber(draft);
    return r.status === 'error' ? es.messages[r.code] : null;
  })();
  const message = localError ?? p.error ?? null;
  const errId = `${p.id}-msg`;
  const hintId = `${p.id}-hint`;

  const commit = (text: string) => {
    window.clearTimeout(timer.current);
    pending.current = null;
    const accepted = p.onCommit(text);
    if (accepted === false) setDraft(null);
  };

  const flush = () => {
    if (pending.current !== null) commit(pending.current);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      flush();
      setDraft(null);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      window.clearTimeout(timer.current);
      pending.current = null;
      if (p.restore && snap.current !== undefined) p.restore(snap.current);
      setDraft(null);
    }
  };

  const siHint =
    focused && p.computedSI !== undefined && Number.isFinite(p.computedSI) && !isSIUnit(unit)
      ? fill(es.common.siEquivalent, {
          value: formatQuantity(p.computedSI, siUnitOf(unit), p.sigFigs, p.g),
        })
      : null;
  const titleHint =
    p.computedSI !== undefined && Number.isFinite(p.computedSI) && !isSIUnit(unit)
      ? fill(es.common.siEquivalent, {
          value: formatQuantity(p.computedSI, siUnitOf(unit), p.sigFigs, p.g),
        })
      : undefined;

  const classes = [
    styles.field,
    isData ? styles.isData : '',
    p.status === 'computed' ? styles.isComputed : '',
    disabled ? styles.isDisabled : '',
    message ? styles.hasError : '',
    p.stale && !isData ? styles.isStale : '',
    p.highlight ? styles.isHighlighted : '',
  ]
    .filter(Boolean)
    .join(' ');

  const describedBy = [message ? errId : '', siHint ? hintId : ''].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <div className={styles.labelRow}>
        <label htmlFor={p.id} className={styles.label}>
          <Sym s={p.sym} /> <span className={styles.labelName}>— {p.name}</span>
          {p.optional && <span className="soft"> ({es.common.optional})</span>}
        </label>
        {(isData || shown !== '') && (
          <span className={`${styles.badge} ${isData ? styles.badgeData : styles.badgeComputed}`}>
            {isData ? es.common.dato : es.common.calculado}
          </span>
        )}
        {p.pin && (
          <button
            type="button"
            className={`${styles.iconBtn} ${p.pin.pinned ? styles.pinned : ''}`}
            aria-pressed={p.pin.pinned}
            aria-label={fill(p.pin.pinned ? es.common.unpin : es.common.pin, { name: p.name })}
            title={fill(p.pin.pinned ? es.common.unpin : es.common.pin, { name: p.name })}
            disabled={p.pin.disabled}
            onClick={p.pin.onToggle}
          >
            <Icon name="pin" size={16} />
          </button>
        )}
        {p.infoSymbol && p.onInfo && (
          <button
            type="button"
            className={styles.iconBtn}
            aria-label={fill(es.common.infoAbout, { name: p.name })}
            title={fill(es.common.infoAbout, { name: p.name })}
            onClick={() => p.onInfo?.(p.infoSymbol as string)}
          >
            <Icon name="info" size={16} />
          </button>
        )}
      </div>
      <div className={styles.inputRow}>
        <input
          id={p.id}
          className={styles.input}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={shown}
          placeholder={es.common.dash}
          readOnly={disabled}
          aria-invalid={message ? true : undefined}
          aria-describedby={describedBy || undefined}
          title={titleHint}
          onFocus={() => {
            setFocused(true);
            snap.current = p.snapshot?.();
          }}
          onBlur={() => {
            setFocused(false);
            flush();
            setDraft(null);
          }}
          onKeyDown={onKeyDown}
          onChange={(e) => {
            if (disabled) return;
            const text = e.target.value;
            setDraft(text);
            pending.current = text;
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => commit(text), DEBOUNCE_MS);
          }}
        />
        <UnitSelect value={unit} units={p.units} name={p.name} onChange={p.onUnit} />
      </div>
      {message && (
        <p id={errId} className={styles.message}>
          <Rich text={message} />
        </p>
      )}
      {!message && disabled && p.disabledReason && (
        <p className={styles.note}>
          <Rich text={p.disabledReason} />
        </p>
      )}
      {siHint && (
        <p id={hintId} className={styles.note}>
          {siHint}
        </p>
      )}
    </div>
  );
}
