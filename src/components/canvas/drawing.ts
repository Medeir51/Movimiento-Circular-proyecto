import { es, fill } from '../../i18n/es';
import { TWO_PI } from '../../core/constants';
import { instantFromMotion, traveledAngle } from '../../core/kinematics';
import { formatNumber, formatQuantity } from '../../core/numberFormat';
import { fromSI, unitSymbol } from '../../core/units';
import type { Motion, WheelStyle } from '../../core/types';
import type { AnimModel } from './animModel';

/** Colores leídos de las variables CSS del tema. */
export interface Colors {
  bg: string;
  fg: string;
  muted: string;
  grid: string;
  panel: string;
  tire: string;
  rim: string;
  spoke: string;
  hub: string;
  disc: string;
  groove: string;
  discLabel: string;
  fanBlade: string;
  fanEdge: string;
  planet: string;
  planetLine: string;
  planetLand: string;
  orbitBody: string;
  orbitPath: string;
  reference: string;
  point: string;
  vecV: string;
  vecAc: string;
  vecAt: string;
  vecA: string;
  vecVText: string;
  vecAcText: string;
  vecAtText: string;
  vecAText: string;
}

export function readColors(el: Element): Colors {
  const cs = getComputedStyle(el);
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  return {
    bg: v('--canvas-bg', '#ffffff'),
    fg: v('--canvas-fg', '#0f172a'),
    muted: v('--canvas-muted', '#64748b'),
    grid: v('--canvas-grid', '#cbd5e1'),
    panel: v('--canvas-panel', 'rgba(255,255,255,0.86)'),
    tire: v('--wheel-tire', '#1f2937'),
    rim: v('--wheel-rim', '#9ca3af'),
    spoke: v('--wheel-spoke', '#6b7280'),
    hub: v('--wheel-hub', '#374151'),
    disc: v('--disc', '#111827'),
    groove: v('--disc-groove', '#4b5563'),
    discLabel: v('--disc-label', '#f59e0b'),
    fanBlade: v('--fan-blade', '#93c5fd'),
    fanEdge: v('--fan-edge', '#2563eb'),
    planet: v('--planet', '#38bdf8'),
    planetLine: v('--planet-line', '#e0f2fe'),
    planetLand: v('--planet-land', '#22c55e'),
    orbitBody: v('--orbit-body', '#2563eb'),
    orbitPath: v('--orbit-path', '#94a3b8'),
    reference: v('--reference', '#94a3b8'),
    point: v('--point', '#2563eb'),
    vecV: v('--vec-v', '#16a34a'),
    vecAc: v('--vec-ac', '#dc2626'),
    vecAt: v('--vec-at', '#ea580c'),
    vecA: v('--vec-a', '#7c3aed'),
    vecVText: v('--vec-v-text', '#15803d'),
    vecAcText: v('--vec-ac-text', '#b91c1c'),
    vecAtText: v('--vec-at-text', '#c2410c'),
    vecAText: v('--vec-a-text', '#6d28d9'),
  };
}

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Física → lienzo (el eje y del lienzo apunta hacia abajo). */
interface Frame {
  cx: number;
  cy: number;
}
const px = (f: Frame, x: number) => f.cx + x;
const py = (f: Frame, y: number) => f.cy - y;

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, TWO_PI);
}

function drawBody(
  ctx: CanvasRenderingContext2D,
  f: Frame,
  style: WheelStyle,
  R: number,
  angle: number,
  C: Colors,
) {
  const { cx, cy } = f;
  ctx.save();
  switch (style) {
    case 'wheel': {
      const tire = Math.max(6, 0.08 * R);
      ctx.lineWidth = tire;
      ctx.strokeStyle = C.tire;
      circle(ctx, cx, cy, R - tire / 2);
      ctx.stroke();
      ctx.lineWidth = Math.max(2, 0.02 * R);
      ctx.strokeStyle = C.rim;
      circle(ctx, cx, cy, R - tire - 2);
      ctx.stroke();
      ctx.lineWidth = Math.max(1.5, 0.012 * R);
      ctx.strokeStyle = C.spoke;
      for (let k = 0; k < 8; k++) {
        const a = angle + (k * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(cx + 0.1 * R * Math.cos(a), cy - 0.1 * R * Math.sin(a));
        ctx.lineTo(cx + (R - tire - 2) * Math.cos(a), cy - (R - tire - 2) * Math.sin(a));
        ctx.stroke();
      }
      ctx.fillStyle = C.hub;
      circle(ctx, cx, cy, Math.max(4, 0.1 * R));
      ctx.fill();
      break;
    }
    case 'disc': {
      ctx.fillStyle = C.disc;
      circle(ctx, cx, cy, R);
      ctx.fill();
      ctx.strokeStyle = C.groove;
      ctx.lineWidth = 1;
      for (let k = 0; k < 6; k++) {
        circle(ctx, cx, cy, R * (0.42 + k * 0.1));
        ctx.stroke();
      }
      // Brillo que gira con el disco.
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = Math.max(2, 0.03 * R);
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.7, -angle - 0.35, -angle + 0.35);
      ctx.stroke();
      ctx.fillStyle = C.discLabel;
      circle(ctx, cx, cy, R * 0.32);
      ctx.fill();
      ctx.strokeStyle = 'rgba(17,24,39,0.75)';
      ctx.lineWidth = Math.max(2, 0.025 * R);
      ctx.beginPath();
      ctx.moveTo(cx + 0.08 * R * Math.cos(angle), cy - 0.08 * R * Math.sin(angle));
      ctx.lineTo(cx + 0.29 * R * Math.cos(angle), cy - 0.29 * R * Math.sin(angle));
      ctx.stroke();
      ctx.fillStyle = C.disc;
      circle(ctx, cx, cy, Math.max(3, 0.035 * R));
      ctx.fill();
      break;
    }
    case 'fan': {
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1.5;
      circle(ctx, cx, cy, R);
      ctx.stroke();
      for (let k = 0; k < 3; k++) {
        const a = angle + (k * TWO_PI) / 3;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-a);
        ctx.beginPath();
        ctx.moveTo(0.12 * R, -0.05 * R);
        ctx.bezierCurveTo(0.45 * R, -0.32 * R, 0.95 * R, -0.22 * R, R, 0);
        ctx.bezierCurveTo(0.9 * R, 0.12 * R, 0.45 * R, 0.14 * R, 0.12 * R, 0.05 * R);
        ctx.closePath();
        ctx.fillStyle = C.fanBlade;
        ctx.fill();
        ctx.strokeStyle = C.fanEdge;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = C.hub;
      circle(ctx, cx, cy, Math.max(5, 0.13 * R));
      ctx.fill();
      break;
    }
    case 'orbit': {
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = C.orbitPath;
      ctx.lineWidth = 1.5;
      circle(ctx, cx, cy, R);
      ctx.stroke();
      ctx.setLineDash([]);
      const rb = Math.max(10, 0.16 * R);
      const grad = ctx.createRadialGradient(cx - rb * 0.3, cy - rb * 0.3, rb * 0.2, cx, cy, rb);
      grad.addColorStop(0, C.planet);
      grad.addColorStop(1, C.orbitBody);
      ctx.fillStyle = grad;
      circle(ctx, cx, cy, rb);
      ctx.fill();
      break;
    }
    case 'planet': {
      ctx.fillStyle = C.planet;
      circle(ctx, cx, cy, R);
      ctx.fill();
      // «Continentes» que giran con el planeta.
      ctx.fillStyle = C.planetLand;
      for (const [a0, r0, s0] of [
        [0.3, 0.55, 0.22],
        [2.4, 0.7, 0.16],
        [4.1, 0.4, 0.18],
      ]) {
        const a = angle + a0;
        circle(ctx, cx + r0 * R * Math.cos(a), cy - r0 * R * Math.sin(a), s0 * R);
        ctx.fill();
      }
      ctx.strokeStyle = C.planetLine;
      ctx.lineWidth = 1;
      for (const k of [0.33, 0.66]) {
        circle(ctx, cx, cy, k * R);
        ctx.stroke();
      }
      for (let k = 0; k < 12; k++) {
        const a = angle + (k * Math.PI) / 6;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + R * Math.cos(a), cy - R * Math.sin(a));
        ctx.stroke();
      }
      ctx.strokeStyle = C.fg;
      ctx.lineWidth = 1.5;
      circle(ctx, cx, cy, R);
      ctx.stroke();
      ctx.fillStyle = C.fg;
      circle(ctx, cx, cy, 3);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

function arrow(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  dx: number,
  dy: number,
  len: number,
  color: string,
  dashed: boolean,
  clipped: boolean,
) {
  if (len <= 0) return { x: x0, y: y0 };
  const ux = dx;
  const uy = dy;
  const x1 = x0 + ux * len;
  const y1 = y0 + uy * len;
  const head = 10;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  if (dashed) ctx.setLineDash([7, 5]);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1 - ux * Math.min(head * 0.8, len * 0.5), y1 - uy * Math.min(head * 0.8, len * 0.5));
  ctx.stroke();
  ctx.setLineDash([]);
  const hl = Math.min(head, len);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - ux * hl - uy * hl * 0.5, y1 - uy * hl + ux * hl * 0.5);
  ctx.lineTo(x1 - ux * hl + uy * hl * 0.5, y1 - uy * hl - ux * hl * 0.5);
  ctx.closePath();
  ctx.fill();
  if (clipped) {
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('»', x1 + ux * 10, y1 + uy * 10);
  }
  ctx.restore();
  return { x: x1, y: y1 };
}

/** Texto con subíndices escritos como a_c: se dibujan más pequeños y abajo. */
function richSegments(text: string): Array<{ t: string; sub: boolean }> {
  const out: Array<{ t: string; sub: boolean }> = [];
  const re = /_([\p{L}\p{N}]+)/gu;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ t: text.slice(last, i), sub: false });
    out.push({ t: m[1], sub: true });
    last = i + m[0].length;
  }
  if (last < text.length) out.push({ t: text.slice(last), sub: false });
  return out;
}

function richWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: string,
  px: number,
): number {
  let w = 0;
  for (const s of richSegments(text)) {
    ctx.font = `${weight} ${s.sub ? Math.round(px * 0.75) : px}px ${FONT}`;
    w += ctx.measureText(s.t).width;
  }
  return w;
}

/** Dibuja texto con subíndices (alineado a la izquierda, línea base al medio). */
function fillRich(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  weight: string,
  px: number,
): void {
  let cursor = x;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (const s of richSegments(text)) {
    const size = s.sub ? Math.round(px * 0.75) : px;
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.fillText(s.t, cursor, s.sub ? y + px * 0.3 : y);
    cursor += ctx.measureText(s.t).width;
  }
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  yIn: number,
  color: string,
  C: Colors,
  align: CanvasTextAlign = 'left',
  avoid: Rect[] = [],
) {
  ctx.save();
  const w = richWidth(ctx, text, '600', 12);
  const h = 18;
  const size = ctx.canvas.width / (ctx.getTransform().a || 1);
  let left = x;
  if (align === 'center') left = x - w / 2;
  else if (align === 'right') left = x - w;
  // La etiqueta completa queda dentro del lienzo y fuera de las lecturas y la leyenda.
  left = Math.min(size - w - 6, Math.max(6, left));
  let y = yIn;
  for (const r of avoid) {
    const overlaps =
      left - 4 < r.x + r.w && left + w + 4 > r.x && y - h / 2 < r.y + r.h && y + h / 2 > r.y;
    if (overlaps) y = r.y + r.h + h / 2 + 4;
  }
  y = Math.min(size - h / 2 - 2, y);
  ctx.fillStyle = C.panel;
  ctx.beginPath();
  ctx.roundRect(left - 4, y - h / 2, w + 8, h, 4);
  ctx.fill();
  ctx.fillStyle = color;
  fillRich(ctx, text, left, y, '600', 12);
  ctx.restore();
}

/** Busca τ_s tal que el ángulo recorrido entre τ_s y τ sea una vuelta (o desde 0). */
function trailStart(m: Motion, tau: number): number {
  const total = traveledAngle(m, tau);
  if (total <= TWO_PI) return 0;
  if (m.alpha === 0 && m.omega0 !== 0) return Math.max(0, tau - TWO_PI / Math.abs(m.omega0));
  let lo = 0;
  let hi = tau;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (total - traveledAngle(m, mid) > TWO_PI) lo = mid;
    else hi = mid;
  }
  return hi;
}

function niceLength(target: number): number {
  if (!(target > 0)) return 0;
  const p = 10 ** Math.floor(Math.log10(target));
  for (const k of [5, 2, 1]) if (k * p <= target) return k * p;
  return p;
}

function readableUnit(meters: number): string {
  if (meters < 0.01) return 'mm';
  if (meters < 1) return 'cm';
  if (meters < 1000) return 'm';
  return 'km';
}

export interface Readouts {
  lines: string[];
}

/** Lecturas en vivo (se actualizan como máximo 10 veces por segundo). */
export function computeReadouts(m: AnimModel, tau: number): string[] {
  if (!m.motion) return [];
  const iv = instantFromMotion(m.motion, tau);
  const sig = Math.min(m.sig, 4);
  const deg = ((((iv.theta * 180) / Math.PI) % 360) + 360) % 360;
  const C = es.canvas;
  return [
    fill(C.readTau, { value: formatQuantity(iv.tau, 's', sig) }),
    fill(C.readTheta, { value: `${formatNumber(deg, 3)}°` }),
    fill(C.readTurns, { value: formatNumber(iv.turns, sig) }),
    fill(C.readOmega, { value: formatQuantity(iv.omega, 'rad/s', sig) }),
    fill(C.readV, { value: formatQuantity(iv.v, 'm/s', sig) }),
    fill(C.readAc, { value: formatQuantity(iv.ac, 'm/s2', sig) }),
  ];
}

/** Dibuja un cuadro completo del lienzo. */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  size: number,
  m: AnimModel,
  tau: number,
  readouts: string[],
  C: Colors,
): void {
  ctx.save();
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, size, size);
  const f: Frame = { cx: size / 2, cy: size / 2 };
  const Rpx = 0.38 * size;
  const disp = m.display;

  if (disp.showAxes) {
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(8, f.cy);
    ctx.lineTo(size - 8, f.cy);
    ctx.moveTo(f.cx, 8);
    ctx.lineTo(f.cx, size - 8);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.muted;
    ctx.font = `12px ${FONT}`;
    ctx.fillText('x', size - 18, f.cy - 6);
    ctx.fillText('y', f.cx + 6, 18);
    ctx.restore();
  }

  if (m.R === null) {
    drawMessage(ctx, size, m.message ?? es.canvas.noData, C);
    ctx.restore();
    return;
  }

  const Rbig = Math.max(m.R, m.refR ?? 0);
  const scale = Rpx / Rbig;
  const Rdraw = m.R * scale;
  const motion = m.motion;
  const iv = motion ? instantFromMotion(motion, tau) : null;
  const rp = motion ? motion.rp : m.R;
  const rpPx = rp * scale;
  const theta = iv ? iv.theta : (m.result.si.theta0 ?? 0);

  if (m.refR !== null) {
    ctx.save();
    ctx.strokeStyle = C.reference;
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    circle(ctx, f.cx, f.cy, m.refR * scale);
    ctx.stroke();
    ctx.restore();
  }

  drawBody(ctx, f, m.style, Rdraw, theta, C);

  const pX = px(f, rpPx * Math.cos(theta));
  const pY = py(f, rpPx * Math.sin(theta));

  // Trayectoria de la última vuelta.
  if (disp.showTrail && motion && rpPx > 0) {
    const t1 = iv ? iv.tau : 0;
    const t0 = trailStart(motion, t1);
    const n = 64;
    ctx.save();
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    let prev: [number, number] | null = null;
    for (let i = 0; i <= n; i++) {
      const t = t0 + ((t1 - t0) * i) / n;
      const v = instantFromMotion(motion, t);
      const x = px(f, rpPx * Math.cos(v.theta));
      const y = py(f, rpPx * Math.sin(v.theta));
      if (prev) {
        ctx.globalAlpha = (i / n) * 0.9;
        ctx.strokeStyle = C.point;
        ctx.beginPath();
        ctx.moveTo(prev[0], prev[1]);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      prev = [x, y];
    }
    ctx.restore();
  }

  // Línea del radio.
  ctx.save();
  ctx.strokeStyle = C.muted;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(f.cx, f.cy);
  ctx.lineTo(pX, pY);
  ctx.stroke();
  ctx.restore();

  // Arco del ángulo θ.
  if (disp.showAngle) {
    const mod = ((theta % TWO_PI) + TWO_PI) % TWO_PI;
    const rr = Math.max(22, Math.min(0.28 * Rdraw, Math.max(rpPx * 0.6, 22)));
    ctx.save();
    ctx.strokeStyle = C.fg;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(f.cx, f.cy, rr, 0, -mod, true);
    ctx.stroke();
    const turns = motion ? Math.trunc((motion.dirSign * (iv?.turned ?? 0)) / TWO_PI) : 0;
    const text = fill(es.canvas.thetaLabel, {
      deg: formatNumber((mod * 180) / Math.PI, 3),
      turns: `${turns >= 0 ? '+' : '−'}${Math.abs(turns)}`,
    });
    const mid = -mod / 2;
    label(
      ctx,
      text,
      f.cx + (rr + 10) * Math.cos(mid),
      f.cy + (rr + 10) * Math.sin(mid),
      C.fg,
      C,
      'center',
    );
    ctx.restore();
  }

  // Punto marcado.
  ctx.save();
  ctx.fillStyle = C.point;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  circle(ctx, pX, pY, 7);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Posición de las lecturas (arriba a la izquierda) y de la leyenda (arriba a la derecha).
  // En lienzos pequeños (celular) se muestran menos lecturas y más pequeñas.
  const small = size < 320;
  const roLines =
    readouts.length === 0
      ? []
      : small
        ? [readouts[0], readouts[3], readouts[4]].filter(Boolean)
        : readouts;
  const roPx = small ? 10 : 12;
  const roLineH = small ? 13 : 17;
  const roRect: Rect | null = roLines.length
    ? {
        x: 4,
        y: 4,
        w: Math.max(...roLines.map((r) => richWidth(ctx, r, '400', roPx))) + 12,
        h: roLines.length * roLineH + 6,
      }
    : null;
  const legendEntries: Array<[string, string, boolean]> = [];
  if (motion) {
    const L = es.canvas.legend;
    if (disp.showV) legendEntries.push([L.v, C.vecV, false]);
    if (disp.showAc) legendEntries.push([L.ac, C.vecAc, false]);
    if (m.mode === 'MCUV' && disp.showAt) legendEntries.push([L.at, C.vecAt, false]);
    if (m.mode === 'MCUV' && disp.showA) legendEntries.push([L.a, C.vecA, true]);
  }
  const legendRect: Rect | null = legendEntries.length
    ? { x: size - 64, y: 6, w: 58, h: legendEntries.length * 17 + 8 }
    : null;
  const avoid = [roRect, legendRect].filter((r): r is Rect => r !== null);

  // Vectores.
  if (motion && iv) {
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);
    // Tangente antihoraria (física) y radial hacia el centro, en coordenadas del lienzo.
    const tx = -sinT;
    const ty = -cosT;
    const inx = -cosT;
    const iny = sinT;
    const maxLen = 1.2 * Rdraw;
    const sig = Math.min(m.sig, 3);
    const lengthOf = (k: number, value: number) => {
      const raw = k * Rdraw * Math.abs(value);
      if (!(value !== 0)) return { len: 0, clipped: false };
      const len = Math.max(8, raw);
      return len > maxLen ? { len: maxLen, clipped: true } : { len, clipped: false };
    };
    const showMcuv = m.mode === 'MCUV';
    const atPhys = motion.dirSign * motion.alpha * motion.rp;
    const acVec = { x: inx * iv.ac, y: iny * iv.ac };
    const atVec = { x: tx * atPhys, y: ty * atPhys };
    const items: Array<{
      dx: number;
      dy: number;
      value: number;
      k: number;
      color: string;
      text: string;
      textColor: string;
      dashed: boolean;
    }> = [];
    if (disp.showV && iv.v > 0) {
      const sgn = motion.dirSign * Math.sign(iv.omega);
      items.push({
        dx: tx * sgn,
        dy: ty * sgn,
        value: iv.v,
        k: m.kv,
        color: C.vecV,
        textColor: C.vecVText,
        text: `${es.fields.v.sym} = ${formatQuantity(iv.v, 'm/s', sig)}`,
        dashed: false,
      });
    }
    if (disp.showAc && iv.ac > 0) {
      items.push({
        dx: inx,
        dy: iny,
        value: iv.ac,
        k: m.ka,
        color: C.vecAc,
        textColor: C.vecAcText,
        text: `${es.fields.ac.sym} = ${formatQuantity(iv.ac, 'm/s2', sig)}`,
        dashed: false,
      });
    }
    if (disp.showAt && showMcuv && motion.alpha !== 0 && motion.rp > 0) {
      const s = Math.sign(atPhys);
      items.push({
        dx: tx * s,
        dy: ty * s,
        value: Math.abs(atPhys),
        k: m.ka,
        color: C.vecAt,
        textColor: C.vecAtText,
        text: `${es.fields.at.sym} = ${formatQuantity(Math.abs(atPhys), 'm/s2', sig)}`,
        dashed: false,
      });
    }
    if (disp.showA && showMcuv && iv.a > 0) {
      const ax = acVec.x + atVec.x;
      const ay = acVec.y + atVec.y;
      const mag = Math.hypot(ax, ay);
      items.push({
        dx: ax / mag,
        dy: ay / mag,
        value: iv.a,
        k: m.ka,
        color: C.vecA,
        textColor: C.vecAText,
        text: `${es.fields.a.sym} = ${formatQuantity(iv.a, 'm/s2', sig)}`,
        dashed: true,
      });
    }
    const placed: Array<{ x: number; y: number }> = [];
    for (const it of items) {
      const { len, clipped } = lengthOf(it.k, it.value);
      const tip = arrow(ctx, pX, pY, it.dx, it.dy, len, it.color, it.dashed, clipped);
      let lx = tip.x + it.dx * 14;
      let ly = tip.y + it.dy * 14;
      for (const p of placed) {
        if (Math.abs(p.x - lx) < 70 && Math.abs(p.y - ly) < 16) ly += 18;
      }
      lx = Math.min(size - 8, Math.max(8, lx));
      ly = Math.min(size - 10, Math.max(10, ly));
      placed.push({ x: lx, y: ly });
      const align: CanvasTextAlign = it.dx < -0.3 ? 'right' : it.dx > 0.3 ? 'left' : 'center';
      label(ctx, it.text, lx, ly, it.textColor, C, align, avoid);
    }
  }

  // Lecturas en vivo (arriba a la izquierda).
  if (roRect) {
    ctx.save();
    ctx.fillStyle = C.panel;
    ctx.beginPath();
    ctx.roundRect(roRect.x, roRect.y, roRect.w, roRect.h, 6);
    ctx.fill();
    ctx.fillStyle = C.fg;
    roLines.forEach((r, i) =>
      fillRich(ctx, r, 10, 4 + roLineH * 0.5 + 3 + i * roLineH, '400', roPx),
    );
    ctx.restore();
  }

  // Leyenda (arriba a la derecha).
  if (legendRect) {
    ctx.save();
    const x0 = legendRect.x;
    ctx.fillStyle = C.panel;
    ctx.beginPath();
    ctx.roundRect(x0, legendRect.y, legendRect.w, legendRect.h, 6);
    ctx.fill();
    legendEntries.forEach(([name, color, dashed], i) => {
      const y = 18 + i * 17;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      if (dashed) ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x0 + 6, y);
      ctx.lineTo(x0 + 24, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.fg;
      fillRich(ctx, name, x0 + 30, y, '600', 12);
    });
    ctx.restore();
  }

  // Barra de escala (abajo a la izquierda) y diámetro (abajo a la derecha).
  const meters = niceLength((0.5 * Rdraw) / scale);
  if (meters > 0) {
    const unit = readableUnit(meters);
    const lenPx = meters * scale;
    const y = size - 14;
    const x0 = 12;
    ctx.save();
    ctx.strokeStyle = C.fg;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, y - 5);
    ctx.lineTo(x0, y + 5);
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + lenPx, y);
    ctx.moveTo(x0 + lenPx, y - 5);
    ctx.lineTo(x0 + lenPx, y + 5);
    ctx.stroke();
    ctx.fillStyle = C.fg;
    ctx.font = `12px ${FONT}`;
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${formatNumber(fromSI(meters, unit), 3)} ${unitSymbol(unit)}`, x0, y - 7);
    ctx.restore();
  }
  if (m.diameterLabel) {
    ctx.save();
    ctx.fillStyle = C.fg;
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(m.diameterLabel, size - 10, size - 8);
    ctx.restore();
  }

  if (!motion && m.message) drawMessage(ctx, size, m.message, C);
  ctx.restore();
}

function drawMessage(ctx: CanvasRenderingContext2D, size: number, text: string, C: Colors) {
  ctx.save();
  const words = text.replace(/([ωθ])0(?!\p{N})/gu, '$1_0').split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (richWidth(ctx, test, '600', 14) > size * 0.8 && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  const widths = lines.map((l) => richWidth(ctx, l, '600', 14));
  const h = lines.length * 20 + 16;
  const w = Math.min(size * 0.9, Math.max(...widths) + 24);
  ctx.fillStyle = C.panel;
  ctx.beginPath();
  ctx.roundRect(size / 2 - w / 2, size / 2 - h / 2, w, h, 8);
  ctx.fill();
  ctx.fillStyle = C.fg;
  lines.forEach((l, i) =>
    fillRich(ctx, l, size / 2 - widths[i] / 2, size / 2 - h / 2 + 18 + i * 20, '600', 14),
  );
  ctx.restore();
}
