import { useId } from 'react';
import { es, fill } from '../../i18n/es';
import styles from './applications.module.css';

const D = es.applications.diagramLabels;

function Arrow({
  x1,
  y1,
  x2,
  y2,
  color,
  label,
  dashed,
  labelDx = 6,
  labelDy = -6,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  label: string;
  dashed?: boolean;
  labelDx?: number;
  labelDy?: number;
}) {
  const id = useId();
  const parts = label.split('_');
  return (
    <g>
      <defs>
        <marker
          id={id}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill={color} />
        </marker>
      </defs>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={3}
        strokeDasharray={dashed ? '6 4' : undefined}
        markerEnd={`url(#${id})`}
      />
      <text x={x2 + labelDx} y={y2 + labelDy} className={styles.diagramLabel} fill={color}>
        {parts[0]}
        {parts[1] && (
          <tspan baselineShift="sub" fontSize="0.75em">
            {parts[1]}
          </tspan>
        )}
      </text>
    </g>
  );
}

/** Curva plana: vista desde arriba y vista lateral (17.1). */
export function FlatCurveDiagram({ radiusText }: { radiusText: string }) {
  return (
    <svg
      viewBox="0 0 360 330"
      className={styles.diagram}
      role="img"
      aria-label={fill(es.applications.flatDiagramLabel, { R: radiusText })}
    >
      <text x={8} y={16} className={styles.diagramTitle}>
        {es.applications.diagramTop}
      </text>
      {/* Curva vista desde arriba */}
      <path
        d="M40 190 A140 140 0 0 1 320 190"
        fill="none"
        stroke="var(--border-strong)"
        strokeWidth={28}
      />
      <path
        d="M40 190 A140 140 0 0 1 320 190"
        fill="none"
        stroke="var(--surface)"
        strokeWidth={2}
        strokeDasharray="8 8"
      />
      <circle cx={180} cy={190} r={4} fill="var(--text)" />
      <text x={188} y={186} className={styles.diagramSmall}>
        {D.center}
      </text>
      <line x1={180} y1={190} x2={180} y2={50} stroke="var(--text-soft)" strokeDasharray="3 3" />
      <text x={186} y={130} className={styles.diagramSmall}>
        R = {radiusText}
      </text>
      <rect x={166} y={38} width={28} height={16} rx={4} fill="var(--primary)" />
      <Arrow
        x1={180}
        y1={58}
        x2={180}
        y2={104}
        color="var(--vec-ac)"
        label={D.friction}
        labelDx={8}
        labelDy={4}
      />
      {/* Vista lateral */}
      <text x={8} y={226} className={styles.diagramTitle}>
        {es.applications.diagramSide}
      </text>
      <line x1={20} y1={300} x2={340} y2={300} stroke="var(--text-soft)" strokeWidth={2} />
      <rect x={150} y={262} width={60} height={30} rx={6} fill="var(--primary)" />
      <circle cx={162} cy={296} r={6} fill="var(--text)" />
      <circle cx={198} cy={296} r={6} fill="var(--text)" />
      <Arrow
        x1={180}
        y1={276}
        x2={180}
        y2={324}
        color="var(--text)"
        label={D.weight}
        labelDx={6}
        labelDy={0}
      />
      <Arrow
        x1={180}
        y1={276}
        x2={180}
        y2={234}
        color="var(--vec-v)"
        label={D.normal}
        labelDx={6}
        labelDy={4}
      />
      <Arrow
        x1={150}
        y1={296}
        x2={96}
        y2={296}
        color="var(--vec-ac)"
        label={D.friction}
        labelDx={-14}
        labelDy={-6}
      />
      <text x={30} y={290} className={styles.diagramSmall}>
        ← {D.center}
      </text>
    </svg>
  );
}

/** Curva peraltada: corte transversal con mg, N_f, f y F_c (17.2). */
export function BankedCurveDiagram({
  betaDeg,
  frictionSign,
}: {
  betaDeg: number;
  /** +1 hacia abajo de la pendiente, −1 hacia arriba, 0 sin fricción. */
  frictionSign: number;
}) {
  const b = (Math.max(0, Math.min(60, betaDeg)) * Math.PI) / 180;
  // Pendiente que sube hacia la derecha; el centro de la curva está a la izquierda.
  const x0 = 40;
  const y0 = 260;
  const L = 300;
  const x1 = x0 + L * Math.cos(b);
  const y1 = y0 - L * Math.sin(b);
  const cx = x0 + 170 * Math.cos(b);
  const cy = y0 - 170 * Math.sin(b);
  // Normal hacia afuera de la vía (arriba a la izquierda).
  const nx = -Math.sin(b);
  const ny = -Math.cos(b);
  const ux = Math.cos(b);
  const uy = -Math.sin(b);
  const carX = cx + nx * 16;
  const carY = cy + ny * 16;
  return (
    <svg
      viewBox="0 0 360 300"
      className={styles.diagram}
      role="img"
      aria-label={fill(es.applications.bankedDiagramLabel, { beta: `${Math.round(betaDeg)}°` })}
    >
      <text x={8} y={16} className={styles.diagramTitle}>
        {es.applications.diagramSection}
      </text>
      <polygon
        points={`${x0},${y0} ${x1},${y1} ${x1},${y0}`}
        fill="var(--surface-2)"
        stroke="var(--text-soft)"
        strokeWidth={2}
      />
      <path
        d={`M ${x0 + 46} ${y0} A 46 46 0 0 0 ${x0 + 46 * Math.cos(b)} ${y0 - 46 * Math.sin(b)}`}
        fill="none"
        stroke="var(--text)"
      />
      <text x={x0 + 54} y={y0 - 8} className={styles.diagramSmall}>
        β
      </text>
      <g transform={`rotate(${-betaDeg} ${carX} ${carY})`}>
        <rect x={carX - 28} y={carY - 14} width={56} height={28} rx={6} fill="var(--primary)" />
      </g>
      <Arrow
        x1={carX}
        y1={carY}
        x2={carX}
        y2={carY + 70}
        color="var(--text)"
        label={D.weight}
        labelDx={6}
        labelDy={0}
      />
      <Arrow
        x1={carX}
        y1={carY}
        x2={carX + nx * 70}
        y2={carY + ny * 70}
        color="var(--vec-v)"
        label={D.normal}
        labelDx={-28}
        labelDy={-4}
      />
      {frictionSign !== 0 && (
        <Arrow
          x1={carX + ux * 30 * -frictionSign}
          y1={carY + uy * 30 * -frictionSign}
          x2={carX + ux * 80 * -frictionSign}
          y2={carY + uy * 80 * -frictionSign}
          color="var(--vec-ac)"
          label={D.friction}
          labelDx={4}
          labelDy={-6}
        />
      )}
      <Arrow
        x1={carX - 10}
        y1={carY - 46}
        x2={carX - 90}
        y2={carY - 46}
        color="var(--vec-a)"
        label={D.Fc}
        dashed
        labelDx={-30}
        labelDy={-6}
      />
      <text x={12} y={44} className={styles.diagramSmall}>
        ← {D.center}
      </text>
    </svg>
  );
}
