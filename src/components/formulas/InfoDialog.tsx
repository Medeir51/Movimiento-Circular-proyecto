import { es } from '../../i18n/es';
import { formulasWithSymbol, symbolDef } from '../../data/formulas';
import type { SymbolId } from '../../data/formulas';
import { useAppStore } from '../../store/useAppStore';
import { Dialog } from '../layout/Dialog';
import { Rich, Sym } from '../layout/Sym';
import styles from './formulas.module.css';

/** Ventana ⓘ: definición del símbolo, unidad y fórmulas donde aparece (15.1). */
export function InfoDialog() {
  const symbol = useAppStore((s) => s.ui.infoSymbol);
  const setInfo = useAppStore((s) => s.setInfoSymbol);
  const openFormula = useAppStore((s) => s.openFormula);
  const openSymbol = useAppStore((s) => s.openSymbol);
  const def = symbol ? symbolDef(symbol) : undefined;
  const P = es.formulasPage;
  return (
    <Dialog
      open={Boolean(def)}
      onClose={() => setInfo(null)}
      title={
        def ? (
          <>
            <Sym s={def.sym} /> — {def.name}
          </>
        ) : (
          ''
        )
      }
    >
      {def && (
        <div className={styles.info}>
          <p>
            <Rich text={def.meaning} />
          </p>
          <p>
            <strong>{P.unit}:</strong> {def.unit}
          </p>
          <div>
            <strong>{P.usedIn}:</strong>
            <ul className={styles.infoList}>
              {formulasWithSymbol(def.id as SymbolId).map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    className={styles.infoLink}
                    onClick={() => openFormula(f.id)}
                  >
                    {f.id} · <Rich text={f.name} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <button type="button" className="btn btn-small" onClick={() => openSymbol(def.id)}>
            {P.glossary}
          </button>
        </div>
      )}
    </Dialog>
  );
}
