import { useEffect, useMemo, useState } from 'react';
import { es, fill } from '../../i18n/es';
import { createFmt } from '../../core/fmt';
import { CATEGORIES, FORMULAS, SYMBOLS, symbolDef } from '../../data/formulas';
import type { FormulaCategory, SymbolId } from '../../data/formulas';
import { useAppStore } from '../../store/useAppStore';
import { Rich, Sym } from '../layout/Sym';
import { FormulaCard } from './FormulaCard';
import { useTryContext } from './useTryContext';
import styles from './formulas.module.css';

/** Minúsculas y sin tildes, para buscar. */
function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/_/g, '');
}

const SEARCH_INDEX = new Map(
  FORMULAS.map((f) => [
    f.id,
    norm(
      [
        f.id,
        f.name,
        f.says,
        f.whenToUse,
        f.commonMistake,
        ...f.symbols.flatMap((id) => {
          const s = symbolDef(id);
          return s ? [s.sym, s.name, s.meaning] : [];
        }),
      ].join(' '),
    ),
  ]),
);

function Glossary({ selected }: { selected: SymbolId | null }) {
  const openSymbol = useAppStore((s) => s.openSymbol);
  const clear = useAppStore((s) => s.clearFormulaFocus);
  const P = es.formulasPage;
  return (
    <section
      id="glossary"
      className={`card ${styles.glossary}`}
      aria-labelledby="glossary-title"
      tabIndex={-1}
    >
      <h2 id="glossary-title">{P.glossary}</h2>
      <p className="soft">{P.glossaryHint}</p>
      <table className={styles.glossaryTable}>
        <thead>
          <tr>
            <th scope="col">{P.symbol}</th>
            <th scope="col">{P.meaning}</th>
            <th scope="col">{P.unit}</th>
          </tr>
        </thead>
        <tbody>
          {SYMBOLS.map((s) => (
            <tr key={s.id} className={selected === s.id ? styles.selectedRow : ''}>
              <th scope="row">
                <button
                  type="button"
                  className={styles.symbolButton}
                  aria-pressed={selected === s.id}
                  onClick={() => (selected === s.id ? clear() : openSymbol(s.id))}
                >
                  <Sym s={s.sym} />
                </button>
              </th>
              <td>
                <strong>{s.name}.</strong> <Rich text={s.meaning} />
              </td>
              <td className={styles.unitCell}>{s.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** Pestaña «Fórmulas»: buscador, filtros, glosario y tarjetas (15.1). */
export function FormulasPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FormulaCategory | 'all'>('all');
  const focus = useAppStore((s) => s.ui.formulaFocus);
  const clear = useAppStore((s) => s.clearFormulaFocus);
  const sig = useAppStore((s) => s.settings.sigFigs);
  const g = useAppStore((s) => s.settings.g);
  const ctx = useTryContext();
  const F = useMemo(() => createFmt(sig, g), [sig, g]);
  const P = es.formulasPage;
  const selected = (focus?.symbol as SymbolId | undefined) ?? null;
  const focusedId = focus?.formulaId ?? null;

  const visible = useMemo(() => {
    const q = norm(query.trim());
    return FORMULAS.filter(
      (f) =>
        (category === 'all' || f.category === category) &&
        (q === '' || (SEARCH_INDEX.get(f.id) ?? '').includes(q)),
    );
  }, [query, category]);

  // Desplazarse hasta la fórmula, el primer resultado resaltado o el glosario.
  useEffect(() => {
    if (!focus) return;
    let target: HTMLElement | null = null;
    if (focus.formulaId) target = document.getElementById(`formula-${focus.formulaId}`);
    else if (focus.glossary) target = document.getElementById('glossary');
    else if (focus.symbol) {
      const first = FORMULAS.find((f) => f.symbols.includes(focus.symbol as SymbolId));
      if (first) target = document.getElementById(`formula-${first.id}`);
    }
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (focus.formulaId || focus.glossary) target.focus({ preventScroll: true });
    }
  }, [focus]);

  const selectedDef = selected ? symbolDef(selected) : undefined;

  return (
    <div className={styles.page}>
      <h2 className={styles.heading}>{P.heading}</h2>
      <div className={`card ${styles.filters}`}>
        <label className={styles.search}>
          <span>{P.search}</span>
          <input
            type="search"
            value={query}
            placeholder={P.searchPlaceholder}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className={styles.chips} role="group" aria-label={P.search}>
          <button
            type="button"
            className={styles.chip}
            aria-pressed={category === 'all'}
            onClick={() => setCategory('all')}
          >
            {P.allCategories}
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={styles.chip}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {P.categories[c]}
            </button>
          ))}
        </div>
        {selectedDef && (
          <p className={styles.highlightNote} aria-live="polite">
            <Rich text={fill(P.highlightOn, { sym: selectedDef.sym })} />{' '}
            <button type="button" className="btn btn-small" onClick={clear}>
              {P.clearHighlight}
            </button>
          </p>
        )}
      </div>
      <div className={styles.layout}>
        <Glossary selected={selected} />
        <div className={styles.cards}>
          {visible.length === 0 && <p className="muted">{P.noResults}</p>}
          {visible.map((f) => {
            const uses = selected ? f.symbols.includes(selected) : false;
            return (
              <FormulaCard
                key={f.id}
                formula={f}
                ctx={ctx}
                F={F}
                highlighted={uses}
                dimmed={selected !== null && !uses}
                focused={focusedId === f.id}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
