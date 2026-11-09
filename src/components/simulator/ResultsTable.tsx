import { es, fill } from '../../i18n/es';
import { compareSummary, compareValues, formatComparison } from '../../core/compare';
import { inputValues } from '../../core/edits';
import { messageText } from '../../core/messages';
import { formatNumber, formatQuantity } from '../../core/numberFormat';
import { isSIUnit, siUnitOf } from '../../core/units';
import type { AppState, SiValues, UnitId, VarId } from '../../core/types';
import { selectView } from '../../store/selectors';
import { useAppStore } from '../../store/useAppStore';
import { Rich, Sym } from '../layout/Sym';
import styles from './simulator.module.css';

interface Row {
  key: VarId;
  field: keyof typeof es.fields;
  unit: UnitId;
  /** Valor en SI (para filas compuestas se usa `text`). */
  value?: number;
  ref?: number;
  text?: string;
  compare?: boolean;
}

/** Tabla de resultados con la comparación con la referencia (secciones 9.1 y 14). */
export function ResultsTable() {
  const view = useAppStore(selectView);
  const mode = useAppStore((s) => s.mode);
  const geometry = useAppStore((s) => s.geometry);
  const mcu = useAppStore((s) => s.mcu);
  const mcuv = useAppStore((s) => s.mcuv);
  const reference = useAppStore((s) => s.reference);
  const sig = useAppStore((s) => s.settings.sigFigs);
  const g = useAppStore((s) => s.settings.g);
  const saveReference = useAppStore((s) => s.saveReference);
  const clearReference = useAppStore((s) => s.clearReference);
  const r = view.shown;
  const si: SiValues = r.si;
  const ref = reference && reference.mode === r.mode ? reference : null;
  const R = es.results;
  const radiusUnit = geometry.radius.unit;

  const rows: Row[] = [];
  const add = (key: VarId, field: Row['field'], unit: UnitId, compare = true) => {
    const value = si[key];
    if (value === undefined) return;
    rows.push({ key, field, unit, value, ref: ref ? ref.si[key] : undefined, compare });
  };

  add('R', 'R', radiusUnit);
  if (geometry.point.kind !== 'rim') add('rp', 'rp', radiusUnit);
  if (r.mode === 'MCU') {
    const rate = mcu.rate;
    const time = mcu.time;
    add('f', 'f', 'Hz');
    add('T', 'T', rate.T.unit);
    add('omega', 'omega', rate.omega.unit);
    add('rpm', 'rpm', 'rev/min');
    add('v', 'v', rate.v.unit);
    add('ac', 'ac', rate.ac.unit);
    add('Fc', 'Fc', rate.Fc.unit);
    add('t', 't', time.t.unit);
    add('dtheta', 'dtheta', time.dtheta.unit);
    add('s', 's', time.s.unit);
    add('N', 'N', 'turns');
  } else {
    const f = mcuv.fields;
    add('omega0', 'omega0', f.omega0.unit);
    add('omegaF', 'omegaF', f.omegaF.unit);
    add('alpha', 'alpha', f.alpha.unit);
    add('t', 't', f.t.unit);
    add('dtheta', 'dtheta', f.dtheta.unit);
    add('N', 'N', 'turns');
    add('at', 'at', f.at.unit);
    add('s', 's', f.s.unit);
    add('tStop', 'tStop', 's', false);
    if (si.totalAngle !== undefined) {
      rows.push({
        key: 'totalAngle',
        field: 'totalAngle',
        unit: 'rad',
        text: `${formatQuantity(si.totalAngle, 'rad', sig, g)} = ${formatQuantity(si.totalAngle, 'rev', sig, g)}`,
      });
    }
  }

  // Resultados adicionales (solo lectura).
  const extras: Array<{ field: keyof typeof es.fields; text: string }> = [];
  if (si.C !== undefined)
    extras.push({ field: 'C', text: formatQuantity(si.C, radiusUnit, sig, g) });
  if (si.thetaF !== undefined) {
    const deg = (si.thetaF * 180) / Math.PI;
    const full = Math.floor(deg / 360);
    const rem = deg - 360 * full;
    extras.push({
      field: 'thetaF',
      text: `${formatNumber(rem, sig)}° (${fill(es.simulator.turnsSuffix, { n: full })})`,
    });
  }
  if (si.x !== undefined && si.y !== undefined) {
    extras.push({
      field: 'xy',
      text: `(${formatQuantity(si.x, radiusUnit, sig, g)}; ${formatQuantity(si.y, radiusUnit, sig, g)})`,
    });
  }
  if (si.ac !== undefined && r.mode === 'MCU') {
    extras.push({ field: 'acG', text: formatQuantity(si.ac, 'g', sig, g) });
  }

  const fmt = (v: number | undefined, unit: UnitId) => {
    if (v === undefined) return es.common.dash;
    if (!Number.isFinite(v)) return es.common.notRotating;
    return formatQuantity(v, unit, sig, g);
  };
  const siTitle = (v: number | undefined, unit: UnitId) =>
    v !== undefined && Number.isFinite(v) && !isSIUnit(unit)
      ? fill(es.common.siEquivalent, { value: formatQuantity(v, siUnitOf(unit), sig, g) })
      : undefined;

  const summary = ref
    ? compareSummary(ref, si, inputValues({ mode, geometry, mcu, mcuv } as AppState, r), r.mode)
    : null;
  const canSave = view.result.ok && !view.result.incomplete;
  const warnings = view.result.warnings;
  const generalErrors = r.mode === 'MCU' ? view.result.errors.filter((e) => !e.field) : [];

  return (
    <section className={`card ${styles.results}`} aria-labelledby="results-heading">
      <div className={styles.resultsHeader}>
        <h2 id="results-heading">{R.heading}</h2>
        {view.stale && <span className={styles.staleTag}>{es.simulator.staleResults}</span>}
      </div>
      {warnings.map((w, i) => (
        <p key={i} className="msg-warning" role="status">
          <Rich text={messageText(w, sig, g)} />
        </p>
      ))}
      {generalErrors.map((e, i) => (
        <p key={i} className="msg-error" role="alert">
          <Rich text={messageText(e, sig, g)} />
        </p>
      ))}
      {summary && (
        <p className={styles.summary} aria-live="polite">
          <Rich text={summary} />
        </p>
      )}
      {rows.length === 0 ? (
        <p className="muted">{R.empty}</p>
      ) : (
        <div className={`${styles.tableWrap} ${view.stale ? styles.stale : ''}`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{es.simulator.quantity}</th>
                {ref && <th scope="col">{R.reference}</th>}
                <th scope="col">{R.current}</th>
                {ref && <th scope="col">{R.change}</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const meta = es.fields[row.field];
                const cmp = row.compare !== false && ref ? compareValues(row.ref, row.value) : null;
                return (
                  <tr key={row.key} data-key={row.key}>
                    <th scope="row">
                      <Sym s={meta.sym} /> <span className={styles.rowName}>{meta.name}</span>
                    </th>
                    {ref && (
                      <td className="num" title={siTitle(row.ref, row.unit)}>
                        {row.text ? es.common.dash : fmt(row.ref, row.unit)}
                      </td>
                    )}
                    <td className="num" title={siTitle(row.value, row.unit)}>
                      {row.text ?? fmt(row.value, row.unit)}
                    </td>
                    {ref && (
                      <td className={`num ${styles.change}`}>
                        {cmp ? formatComparison(cmp) : es.common.dash}
                        {cmp?.notable && (
                          <span className={styles.notable} title={R.badge} aria-label={R.badge}>
                            ★
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {extras.length > 0 && (
        <div className={styles.extras}>
          <h3>{es.simulator.extraResults}</h3>
          <dl>
            {extras.map((x) => (
              <div key={x.field} className={styles.extraRow}>
                <dt>
                  <Sym s={es.fields[x.field].sym} />{' '}
                  <span className={styles.rowName}>{es.fields[x.field].name}</span>
                </dt>
                <dd className="num">{x.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      <div className={styles.refButtons}>
        <button type="button" className="btn" onClick={saveReference} disabled={!canSave}>
          {R.saveReference}
        </button>
        {reference && (
          <button type="button" className="btn btn-ghost" onClick={clearReference}>
            {R.clearReference}
          </button>
        )}
      </div>
    </section>
  );
}
