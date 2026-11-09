import type { DefaultUnits } from '../defaults';
import type { BankedCurveInputs, FlatCurveInputs, OrbitInputs } from './types';

/** Datos iniciales de las aplicaciones (17). */

export function defaultFlatInputs(u: DefaultUnits): FlatCurveInputs {
  return {
    R: { text: '50', unit: u.appRadius },
    v: { text: '', unit: u.appSpeed },
    mu: { text: '0,7', unit: 'one' },
    m: { text: '1000', unit: 'kg' },
  };
}

export function defaultBankedInputs(u: DefaultUnits): BankedCurveInputs {
  return {
    R: { text: '100', unit: u.appRadius },
    beta: { text: '15', unit: 'deg' },
    mu: { text: '0,4', unit: 'one' },
    v: { text: '', unit: u.appSpeed },
    m: { text: '1000', unit: 'kg' },
  };
}

export function defaultOrbitInputs(u: DefaultUnits): OrbitInputs {
  return {
    body: 'earth',
    M: { text: '', unit: 'kg' },
    Rbody: { text: '', unit: u.orbitLength },
    source: 'h',
    R: { text: '', unit: u.orbitLength },
    h: { text: '420', unit: u.orbitLength },
    T: { text: '', unit: u.orbitPeriod },
    m: { text: '420', unit: 't' },
  };
}
