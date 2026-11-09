/**
 * Reloj de la animación: guarda τ fuera de React para que el ciclo de
 * requestAnimationFrame no provoque renderizados en cada cuadro.
 */
export class Clock {
  tau = 0;
  private listeners = new Set<(tau: number) => void>();

  set(tau: number): void {
    this.tau = tau;
    for (const fn of this.listeners) fn(tau);
  }

  subscribe(fn: (tau: number) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
}

/** Reloj del simulador principal. */
export const simClock = new Clock();
