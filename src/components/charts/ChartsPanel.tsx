import { useCallback, useMemo, useState } from 'react';
import { es, fill } from '../../i18n/es';
import { TWO_PI } from '../../core/constants';
import { sample } from '../../core/kinematics';
import { formatNumber, formatQuantity } from '../../core/numberFormat';
import { unitSymbol } from '../../core/units';
import type { UnitId } from '../../core/types';
import { simClock } from '../../store/clock';
import { selectView } from '../../store/selectors';
import { useAppStore } from '../../store/useAppStore';
import { MOBILE_QUERY, useMediaQuery } from '../layout/useMediaQuery';
import { LineChart } from './LineChart';
import type { Series } from './LineChart';
import styles from './charts.module.css';

type ChartId = 'theta' | 'omega' | 'v' | 'acc';
const N = 200;

function summary(
  name: string,
  pts: Array<[number, number]>,
  unit: UnitId,
  sig: number,
  tEnd: number,
) {
  if (pts.length === 0) return '';
  const first = pts[0][1];
  const last = pts[pts.length - 1][1];
  const C = es.charts;
  const t = formatQuantity(tEnd, 's', sig);
  if (Math.abs(last - first) <= 1e-9 * Math.max(1, Math.abs(first))) {
    return fill(C.summaryConstant, { name, value: formatQuantity(first, unit, sig), t });
  }
  return fill(last > first ? C.summaryIncrease : C.summaryDecrease, {
    name,
    from: formatQuantity(first, unit, sig),
    to: formatQuantity(last, unit, sig),
    t,
  });
}

/** θ(t), ω(t), v(t) y a_c(t) con a_t(t), con cursor sincronizado (sección 13). */
export function ChartsPanel() {
  const view = useAppStore(selectView);
  const sig = useAppStore((s) => s.settings.sigFigs);
  const seek = useAppStore((s) => s.seek);
  const setPlaying = useAppStore((s) => s.setPlaying);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [thetaUnit, setThetaUnit] = useState<'turns' | 'rad'>('turns');
  const [active, setActive] = useState<ChartId>('omega');
  const r = view.shown;
  const motion = r.motion;
  const C = es.charts;

  const domainEnd = useMemo(() => {
    if (!motion) return 1;
    if (motion.tEnd !== null) return motion.tEnd;
    const t = r.si.t;
    if (t !== undefined && t > 0) return t;
    const T = r.si.T;
    if (T !== undefined && Number.isFinite(T) && T > 0) return 2 * T;
    return 10;
  }, [motion, r.si.t, r.si.T]);

  const data = useMemo(() => {
    if (!motion) return null;
    const d: [number, number] = [0, domainEnd];
    const theta = sample(motion, d, N, (v) =>
      thetaUnit === 'turns' ? v.turned / TWO_PI : v.turned,
    );
    return {
      theta,
      omega: sample(motion, d, N, (v) => v.omega),
      v: sample(motion, d, N, (v) => v.v),
      ac: sample(motion, d, N, (v) => v.ac),
      at: sample(motion, d, N, (v) => v.at),
    };
  }, [motion, domainEnd, thetaUnit]);

  const cursorAt = useCallback(
    (tau: number) => {
      if (!motion) return null;
      if (motion.tEnd === null && tau > domainEnd) return tau % domainEnd;
      return Math.min(tau, domainEnd);
    },
    [motion, domainEnd],
  );

  if (!data) {
    return (
      <section className={`card ${styles.panel}`} aria-label={C.heading}>
        <h2 className={styles.title}>{C.heading}</h2>
        <p className="muted">{C.noData}</p>
      </section>
    );
  }

  const fx = (x: number) => formatNumber(x, 3);
  const fy = (y: number) => formatNumber(y, 3);
  const markers = r.si.tStop !== undefined ? [{ x: r.si.tStop, label: C.stop }] : [];
  const onSeekStart = () => setPlaying(false);
  const thetaUnitText = thetaUnit === 'turns' ? C.turns : C.rad;

  const F = es.fields;
  const charts: Array<{
    id: ChartId;
    title: string;
    yUnit: string;
    series: Series[];
    note: string;
    aria: string;
  }> = [
    {
      id: 'theta',
      title: C.theta,
      yUnit: thetaUnitText,
      series: [{ id: 'theta', label: C.thetaSeries, color: 'var(--primary)', points: data.theta }],
      note: C.noteTheta,
      aria: summary(
        C.thetaSeries,
        data.theta,
        thetaUnit === 'turns' ? 'turns' : 'rad',
        sig,
        domainEnd,
      ),
    },
    {
      id: 'omega',
      title: C.omega,
      yUnit: unitSymbol('rad/s'),
      series: [{ id: 'omega', label: F.omega.sym, color: 'var(--primary)', points: data.omega }],
      note: C.noteOmega,
      aria: summary(F.omega.sym, data.omega, 'rad/s', sig, domainEnd),
    },
    {
      id: 'v',
      title: C.v,
      yUnit: unitSymbol('m/s'),
      series: [{ id: 'v', label: F.v.sym, color: 'var(--vec-v)', points: data.v }],
      note: C.noteV,
      aria: summary(F.v.sym, data.v, 'm/s', sig, domainEnd),
    },
    {
      id: 'acc',
      title: C.acc,
      yUnit: unitSymbol('m/s2'),
      series: [
        { id: 'ac', label: F.ac.sym, color: 'var(--vec-ac)', points: data.ac },
        { id: 'at', label: F.at.sym, color: 'var(--vec-at)', points: data.at, dashed: true },
      ],
      note: C.noteAcc,
      aria: summary(F.ac.sym, data.ac, 'm/s2', sig, domainEnd),
    },
  ];

  const visible = isMobile ? charts.filter((c) => c.id === active) : charts;

  return (
    <section className={`card ${styles.panel}`} aria-label={C.heading}>
      <div className={styles.header}>
        <h2 className={styles.title}>{C.heading}</h2>
        <label className={styles.unitSel}>
          {C.thetaUnit}
          <select
            value={thetaUnit}
            onChange={(e) => setThetaUnit(e.target.value as 'turns' | 'rad')}
          >
            <option value="turns">{C.turns}</option>
            <option value="rad">{C.rad}</option>
          </select>
        </label>
      </div>
      {isMobile && (
        <div className={styles.tabs} role="group" aria-label={C.tabsLabel}>
          {charts.map((c) => (
            <button
              key={c.id}
              type="button"
              className={styles.tab}
              aria-pressed={c.id === active}
              onClick={() => setActive(c.id)}
            >
              {c.title}
            </button>
          ))}
        </div>
      )}
      <div className={isMobile ? styles.single : styles.grid}>
        {visible.map((c) => (
          <LineChart
            key={c.id}
            title={c.title}
            yUnit={c.yUnit}
            series={c.series}
            xMax={domainEnd}
            formatX={fx}
            formatY={fy}
            markers={markers}
            note={c.note}
            ariaLabel={c.aria}
            clock={simClock}
            cursorAt={cursorAt}
            onSeekStart={onSeekStart}
            onSeek={seek}
          />
        ))}
      </div>
    </section>
  );
}
