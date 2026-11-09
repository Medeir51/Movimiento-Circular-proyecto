import { TWO_PI } from './constants';
import type { Motion, SolveResult } from './types';

/** Valores instantáneos en el tiempo τ (sección 10.4). */
export interface InstantValues {
  tau: number;
  /** Posición angular física (rad, convención matemática). */
  theta: number;
  /** Ángulo girado desde t = 0, con signo relativo al sentido elegido (rad). */
  turned: number;
  /** Vueltas: (θ(τ) − θ0)/2π, relativas al sentido elegido. */
  turns: number;
  /** ω(τ) con signo relativo al sentido elegido (rad/s). */
  omega: number;
  v: number;
  ac: number;
  /** a_t con signo relativo al sentido elegido (m/s²). */
  at: number;
  a: number;
  /** Ángulo entre la aceleración total y el radio (°); NaN si a = 0. */
  phi: number;
  rpm: number;
  f: number;
  T: number;
  x: number;
  y: number;
  Fc: number | null;
  Ft: number | null;
  Fnet: number | null;
}

/** τ limitado al intervalo válido del movimiento. */
export function clampTau(motion: Motion, tau: number): number {
  const t = Math.max(0, tau);
  return motion.tEnd !== null ? Math.min(t, motion.tEnd) : t;
}

export function instantFromMotion(motion: Motion, tau: number): InstantValues {
  const t = clampTau(motion, tau);
  const omega = motion.omega0 + motion.alpha * t;
  const turned = motion.omega0 * t + 0.5 * motion.alpha * t * t;
  const theta = motion.theta0 + motion.dirSign * turned;
  const w = Math.abs(omega);
  const v = w * motion.rp;
  const ac = omega * omega * motion.rp;
  const at = motion.alpha * motion.rp;
  const a = Math.hypot(ac, at);
  const phi = a === 0 ? Number.NaN : ac === 0 ? 90 : (Math.atan(Math.abs(at) / ac) * 180) / Math.PI;
  const f = w / TWO_PI;
  const m = motion.m;
  return {
    tau: t,
    theta,
    turned,
    turns: turned / TWO_PI,
    omega,
    v,
    ac,
    at,
    a,
    phi,
    rpm: 60 * f,
    f,
    T: w > 0 ? TWO_PI / w : Number.POSITIVE_INFINITY,
    x: motion.rp * Math.cos(theta),
    y: motion.rp * Math.sin(theta),
    Fc: m === null ? null : m * ac,
    Ft: m === null ? null : m * at,
    Fnet: m === null ? null : m * a,
  };
}

/** Valores en el instante τ (0 ≤ τ ≤ t en MCUV; sin límite superior en MCU). */
export function instant(result: SolveResult, tau: number): InstantValues | null {
  return result.motion ? instantFromMotion(result.motion, tau) : null;
}

/** Ángulo total recorrido (sin signo) desde 0 hasta τ, contando la inversión de sentido. */
export function traveledAngle(motion: Motion, tau: number): number {
  const t = clampTau(motion, tau);
  const { omega0: w0, alpha: a } = motion;
  const rel = (x: number) => w0 * x + 0.5 * a * x * x;
  if (a !== 0) {
    const ts = -w0 / a;
    if (ts > 0 && ts < t) return Math.abs(rel(ts)) + Math.abs(rel(t) - rel(ts));
  }
  return Math.abs(rel(t));
}

/** Muestras uniformes de una magnitud en [t0, t1]. */
export function sample(
  motion: Motion,
  domain: [number, number],
  count: number,
  pick: (v: InstantValues) => number,
): Array<[number, number]> {
  const [t0, t1] = domain;
  const out: Array<[number, number]> = [];
  for (let i = 0; i < count; i++) {
    const tau = count === 1 ? t0 : t0 + ((t1 - t0) * i) / (count - 1);
    out.push([tau, pick(instantFromMotion(motion, tau))]);
  }
  return out;
}
