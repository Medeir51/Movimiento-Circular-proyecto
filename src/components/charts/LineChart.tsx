import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { es, fill } from '../../i18n/es';
import type { Clock } from '../../store/clock';
import { Rich } from '../layout/Sym';
import { niceDomain, ticksFor } from './ticks';
import styles from './charts.module.css';

export interface Series {
  id: string;
  label: string;
  color: string;
  points: Array<[number, number]>;
  dashed?: boolean;
}

interface LineChartProps {
  title: string;
  /** Unidad del eje vertical (texto plano). */
  yUnit: string;
  series: Series[];
  xMax: number;
  formatX: (x: number) => string;
  formatY: (y: number) => string;
  markers?: Array<{ x: number; label: string }>;
  note: string;
  ariaLabel: string;
  clock: Clock;
  /** Convierte τ en la posición del cursor (o null si queda fuera). */
  cursorAt: (tau: number) => number | null;
  onSeekStart?: () => void;
  onSeek: (t: number) => void;
}

/** Subíndices dentro de un <text> de SVG (a_c → a con c abajo). */
function svgRich(text: string) {
  const parts: Array<{ t: string; sub: boolean }> = [];
  let last = 0;
  for (const m of text.matchAll(/_([\p{L}\p{N}]+)/gu)) {
    const i = m.index ?? 0;
    if (i > last) parts.push({ t: text.slice(last, i), sub: false });
    parts.push({ t: m[1], sub: true });
    last = i + m[0].length;
  }
  if (last < text.length) parts.push({ t: text.slice(last), sub: false });
  return parts.map((pt, i) =>
    pt.sub ? (
      <tspan key={i} baselineShift="sub" fontSize="0.75em">
        {pt.t}
      </tspan>
    ) : (
      <tspan key={i}>{pt.t}</tspan>
    ),
  );
}

const W = 360;
const H = 220;
const M = { l: 54, r: 12, t: 14, b: 36 };

/** Gráfica propia en SVG con cursor sincronizado con la animación (sección 13). */
export function LineChart(p: LineChartProps) {
  const cursorRef = useRef<SVGLineElement>(null);
  const dragging = useRef(false);
  const [hover, setHover] = useState<number | null>(null);
  const clipId = useId();

  const { lo, hi, step } = useMemo(() => {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const s of p.series) {
      for (const [, y] of s.points) {
        if (Number.isFinite(y)) {
          min = Math.min(min, y);
          max = Math.max(max, y);
        }
      }
    }
    if (!Number.isFinite(min)) {
      min = 0;
      max = 1;
    }
    return niceDomain(min, max);
  }, [p.series]);

  const xs = useMemo(() => niceDomain(0, p.xMax), [p.xMax]);
  const xMax = p.xMax > 0 ? p.xMax : 1;
  const sx = (x: number) => M.l + (x / xMax) * (W - M.l - M.r);
  const sy = (y: number) => H - M.b - ((y - lo) / (hi - lo || 1)) * (H - M.t - M.b);

  const paths = useMemo(
    () =>
      p.series.map((s) =>
        s.points
          .filter(([, y]) => Number.isFinite(y))
          .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${sx(x).toFixed(2)},${sy(y).toFixed(2)}`)
          .join(''),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.series, lo, hi, xMax],
  );

  const { clock, cursorAt } = p;
  useEffect(() => {
    const update = (tau: number) => {
      const line = cursorRef.current;
      if (!line) return;
      const x = cursorAt(tau);
      if (x === null || x < 0 || x > xMax) {
        line.setAttribute('visibility', 'hidden');
        return;
      }
      const X = (M.l + (x / xMax) * (W - M.l - M.r)).toFixed(2);
      line.setAttribute('x1', X);
      line.setAttribute('x2', X);
      line.setAttribute('visibility', 'visible');
    };
    update(clock.tau);
    return clock.subscribe(update);
  }, [clock, cursorAt, xMax]);

  const toData = (e: PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    return Math.min(xMax, Math.max(0, frac * xMax));
  };

  const hoverIndex = (x: number) => {
    const pts = p.series[0]?.points ?? [];
    if (pts.length === 0) return null;
    let best = 0;
    for (let i = 1; i < pts.length; i++)
      if (Math.abs(pts[i][0] - x) < Math.abs(pts[best][0] - x)) best = i;
    return best;
  };

  const yTicks = ticksFor(lo, hi, step);
  const xTicks = ticksFor(0, xs.hi, xs.step).filter((t) => t <= xMax + 1e-9);
  const hp = hover !== null ? p.series[0]?.points[hover] : undefined;

  return (
    <figure className={styles.figure}>
      <figcaption className={styles.caption}>
        <Rich text={p.title} />
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="img" aria-label={p.ariaLabel}>
        <defs>
          <clipPath id={clipId}>
            <rect x={M.l} y={M.t - 2} width={W - M.l - M.r} height={H - M.t - M.b + 4} />
          </clipPath>
        </defs>
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={M.l} x2={W - M.r} y1={sy(t)} y2={sy(t)} className={styles.gridLine} />
            <text x={M.l - 6} y={sy(t)} className={styles.tickY}>
              {p.formatY(t)}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <g key={`x${t}`}>
            <line x1={sx(t)} x2={sx(t)} y1={M.t} y2={H - M.b} className={styles.gridLine} />
            <text x={sx(t)} y={H - M.b + 14} className={styles.tickX}>
              {p.formatX(t)}
            </text>
          </g>
        ))}
        <line
          x1={M.l}
          x2={W - M.r}
          y1={sy(Math.max(lo, Math.min(hi, 0)))}
          y2={sy(Math.max(lo, Math.min(hi, 0)))}
          className={styles.axis}
        />
        <line x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} className={styles.axis} />
        <text x={(M.l + W - M.r) / 2} y={H - 4} className={styles.axisLabel}>
          {es.charts.time}
        </text>
        <text
          x={12}
          y={(M.t + H - M.b) / 2}
          className={styles.axisLabel}
          transform={`rotate(-90 12 ${(M.t + H - M.b) / 2})`}
        >
          {p.yUnit}
        </text>
        <g clipPath={`url(#${clipId})`}>
          {p.series.map((s, i) => (
            <path
              key={s.id}
              d={paths[i]}
              fill="none"
              stroke={s.color}
              strokeWidth={2.5}
              strokeDasharray={s.dashed ? '6 4' : undefined}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
        {(p.markers ?? []).map((mk) => (
          <g key={mk.label + mk.x}>
            <line x1={sx(mk.x)} x2={sx(mk.x)} y1={M.t} y2={H - M.b} className={styles.marker} />
            <text x={sx(mk.x) + 4} y={M.t + 10} className={styles.markerText}>
              {mk.label}
            </text>
          </g>
        ))}
        <line ref={cursorRef} y1={M.t} y2={H - M.b} className={styles.cursor} visibility="hidden" />
        {hp && hover !== null && (
          <g className={styles.tooltip} pointerEvents="none">
            {(() => {
              const x = sx(hp[0]);
              const lines = [
                fill(es.charts.tooltip, { t: p.formatX(hp[0]) }),
                ...p.series.map(
                  (s) => `${s.label}: ${p.formatY(s.points[hover]?.[1] ?? Number.NaN)}`,
                ),
              ];
              const w = 132;
              const h = 14 * lines.length + 8;
              const left = x + w + 8 > W ? x - w - 6 : x + 6;
              return (
                <>
                  <line x1={x} x2={x} y1={M.t} y2={H - M.b} className={styles.hoverLine} />
                  <rect
                    x={left}
                    y={M.t + 2}
                    width={w}
                    height={h}
                    rx={4}
                    className={styles.tooltipBox}
                  />
                  {lines.map((l, i) => (
                    <text key={i} x={left + 6} y={M.t + 16 + i * 14} className={styles.tooltipText}>
                      {svgRich(l)}
                    </text>
                  ))}
                </>
              );
            })()}
          </g>
        )}
        <rect
          x={M.l}
          y={M.t}
          width={W - M.l - M.r}
          height={H - M.t - M.b}
          fill="transparent"
          className={styles.hit}
          onPointerDown={(e) => {
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            p.onSeekStart?.();
            p.onSeek(toData(e));
          }}
          onPointerMove={(e) => {
            const x = toData(e);
            if (dragging.current) p.onSeek(x);
            setHover(hoverIndex(x));
          }}
          onPointerUp={(e) => {
            dragging.current = false;
            e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      <p className={styles.legend}>
        {p.series.map((s) => (
          <span key={s.id} className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ borderColor: s.color }}
              aria-hidden="true"
            />
            <Rich text={s.label} />
          </span>
        ))}
      </p>
      <p className={styles.note}>
        <Rich text={p.note} />
      </p>
    </figure>
  );
}
