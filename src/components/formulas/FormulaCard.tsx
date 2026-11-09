import { useState } from 'react';
import { es, fill } from '../../i18n/es';
import type { Fmt } from '../../core/fmt';
import { symbolDef } from '../../data/formulas';
import type { Formula, TryContext } from '../../data/formulas';
import { useAppStore } from '../../store/useAppStore';
import { Rich, Sym } from '../layout/Sym';
import { Tex } from '../steps/Tex';
import styles from './formulas.module.css';

interface FormulaCardProps {
  formula: Formula;
  ctx: TryContext;
  F: Fmt;
  highlighted?: boolean;
  dimmed?: boolean;
  focused?: boolean;
}

/** Tarjeta de una fórmula con significado, símbolos, uso, error común y prueba (15.1). */
export function FormulaCard({
  formula: f,
  ctx,
  F,
  highlighted,
  dimmed,
  focused,
}: FormulaCardProps) {
  const [showTry, setShowTry] = useState(false);
  const openSymbol = useAppStore((s) => s.openSymbol);
  const P = es.formulasPage;
  const tried = f.tryIt(ctx, F);
  const titleId = `formula-title-${f.id}`;
  const cls = [
    'card',
    styles.card,
    highlighted ? styles.highlighted : '',
    dimmed ? styles.dimmed : '',
    focused ? styles.focused : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <article id={`formula-${f.id}`} className={cls} aria-labelledby={titleId} tabIndex={-1}>
      <header className={styles.cardHeader}>
        <span className={styles.code}>{f.id}</span>
        <h3 id={titleId}>
          <Rich text={f.name} />
        </h3>
      </header>
      <Tex tex={f.tex} display className={styles.formula} />
      <p>
        <strong>{P.says}: </strong>
        <Rich text={f.says} />
      </p>
      <div className={styles.symbols}>
        <strong>{P.symbols}: </strong>
        {f.symbols.map((id) => {
          const s = symbolDef(id);
          if (!s) return null;
          return (
            <button
              key={id}
              type="button"
              className={styles.symbolChip}
              title={`${s.name}: ${s.meaning} (${s.unit})`}
              onClick={() => openSymbol(id)}
            >
              <Sym s={s.sym} /> <span className={styles.chipName}>{s.name}</span>{' '}
              <span className={styles.chipUnit}>[{s.unit}]</span>
            </button>
          );
        })}
      </div>
      <p>
        <strong>{P.when}: </strong>
        <Rich text={f.whenToUse} />
      </p>
      <p className={styles.mistake}>
        <strong>{P.mistake}: </strong>
        <Rich text={f.commonMistake} />
      </p>
      <div className={styles.tryRow}>
        <button
          type="button"
          className="btn btn-small"
          disabled={!tried.ok}
          aria-expanded={showTry && tried.ok}
          onClick={() => setShowTry((v) => !v)}
        >
          {showTry && tried.ok ? P.tryItHide : P.tryIt}
        </button>
        {!tried.ok && (
          <span className="soft">
            <Rich text={fill(P.missing, { list: tried.missing.join(', ') })} />
          </span>
        )}
      </div>
      {showTry && tried.ok && <Tex tex={tried.tex} display className={styles.tryTex} />}
    </article>
  );
}
