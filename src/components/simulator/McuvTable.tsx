import { es } from '../../i18n/es';
import { instantFromMotion } from '../../core/kinematics';
import type { InstantValues } from '../../core/kinematics';
import { formatQuantity } from '../../core/numberFormat';
import type { UnitId } from '../../core/types';
import { selectView } from '../../store/selectors';
import { useAppStore } from '../../store/useAppStore';
import { Rich, Sym } from '../layout/Sym';
import styles from './simulator.module.css';

type Row = { key: keyof typeof es.fields; pick: (v: InstantValues) => number | null; unit: UnitId };

const ROWS: Row[] = [
  { key: 'omega', pick: (v) => v.omega, unit: 'rad/s' },
  { key: 'rpm', pick: (v) => v.rpm, unit: 'rev/min' },
  { key: 'f', pick: (v) => v.f, unit: 'Hz' },
  { key: 'T', pick: (v) => v.T, unit: 's' },
  { key: 'v', pick: (v) => v.v, unit: 'm/s' },
  { key: 'ac', pick: (v) => v.ac, unit: 'm/s2' },
  { key: 'at', pick: (v) => v.at, unit: 'm/s2' },
  { key: 'a', pick: (v) => v.a, unit: 'm/s2' },
  {
    key: 'phi',
    pick: (v) => (Number.isFinite(v.phi) ? (v.phi * Math.PI) / 180 : Number.NaN),
    unit: 'deg',
  },
  { key: 'Fc', pick: (v) => v.Fc, unit: 'N' },
  { key: 'Ft', pick: (v) => v.Ft, unit: 'N' },
  { key: 'Fnet', pick: (v) => v.Fnet, unit: 'N' },
];

/** Panel B en MCUV: columnas Inicial, Instante τ (en vivo) y Final (10.1). */
export function McuvTable() {
  const view = useAppStore(selectView);
  const tau = useAppStore((s) => s.playback.tau);
  const sig = useAppStore((s) => s.settings.sigFigs);
  const g = useAppStore((s) => s.settings.g);
  const m = view.shown.motion;
  const S = es.simulator;
  if (!m || m.tEnd === null) {
    return (
      <p className="muted">
        <Rich text={S.kinPrompt} />
      </p>
    );
  }
  const cols = [instantFromMotion(m, 0), instantFromMotion(m, tau), instantFromMotion(m, m.tEnd)];
  const fmt = (x: number | null, unit: UnitId) => {
    if (x === null || Number.isNaN(x)) return es.common.dash;
    if (!Number.isFinite(x)) return es.common.notRotating;
    return formatQuantity(x, unit, sig, g);
  };
  return (
    <div className={`${styles.tableWrap} ${view.stale ? styles.stale : ''}`}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">{S.quantity}</th>
            <th scope="col">
              <Rich text={S.colInitial} />
            </th>
            <th scope="col">
              <Rich text={S.colInstant} />
            </th>
            <th scope="col">
              <Rich text={S.colFinal} />
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.key}>
              <th scope="row">
                <Sym s={es.fields[r.key].sym} />
              </th>
              {cols.map((c, i) => (
                <td key={i} className="num">
                  {fmt(r.pick(c), r.unit)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
