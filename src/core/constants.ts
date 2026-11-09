/** Constantes físicas y límites (todas en unidades del SI). */

/** Valor de g por defecto (m/s²). Se puede cambiar en los ajustes. */
export const DEFAULT_G = 9.8;

/** Constante de gravitación universal (N·m²/kg²). */
export const GRAV_CONSTANT = 6.6743e-11;

export const TWO_PI = 2 * Math.PI;

/** Día sidéreo (s). */
export const SIDEREAL_DAY = 86164;

/** Segundos en un día solar (s). */
export const SECONDS_PER_DAY = 86400;

/** Radio máximo admitido (m). */
export const R_MAX = 1e13;

/** A partir de esta rapidez se avisa que la física clásica deja de ser exacta (m/s). */
export const RELATIVISTIC_SPEED = 3e7;

/** Velocidad de la luz redondeada: ninguna rapidez puede igualarla (m/s). */
export const LIGHT_SPEED = 3e8;

export type BodyId = 'earth' | 'moon' | 'mars' | 'sun';

/** Cuerpos celestes para la aplicación de órbitas: masa (kg) y radio medio (m). */
export const BODIES: Record<BodyId, { M: number; R: number }> = {
  earth: { M: 5.9722e24, R: 6371e3 },
  moon: { M: 7.342e22, R: 1737.4e3 },
  mars: { M: 6.417e23, R: 3389.5e3 },
  sun: { M: 1.989e30, R: 695700e3 },
};
