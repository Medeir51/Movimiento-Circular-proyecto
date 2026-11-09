import { useMemo } from 'react';
import { instantFromMotion } from '../../core/kinematics';
import type { TryContext } from '../../data/formulas';
import { selectBanked, selectFlat, selectOrbit, selectView } from '../../store/selectors';
import { useAppStore } from '../../store/useAppStore';

/** Valores actuales del simulador y de las aplicaciones para «Probar con los datos actuales». */
export function useTryContext(): TryContext {
  const view = useAppStore(selectView);
  const flat = useAppStore(selectFlat);
  const banked = useAppStore(selectBanked);
  const orbit = useAppStore(selectOrbit);
  const g = useAppStore((s) => s.settings.g);
  return useMemo(() => {
    const r = view.shown;
    const sim: Partial<Record<string, number>> = { ...r.si };
    if (r.mode === 'MCU') {
      sim.a = r.si.ac;
    } else if (r.motion && r.motion.tEnd !== null) {
      const iv = instantFromMotion(r.motion, r.motion.tEnd);
      Object.assign(sim, {
        omega: Math.abs(iv.omega),
        f: iv.f,
        rpm: iv.rpm,
        T: iv.T,
        v: iv.v,
        ac: iv.ac,
        a: iv.a,
        at: iv.at,
      });
      if (iv.Fc !== null) sim.Fc = iv.Fc;
    }
    return {
      sim,
      flat: { R: flat.values.R, mu: flat.values.mu },
      banked: {
        R: banked.values.R,
        beta: banked.values.beta,
        mu: banked.values.mu,
        v: banked.values.v,
      },
      orbit: {
        M: orbit.values.M,
        Rbody: orbit.values.Rbody,
        R: orbit.values.R,
        h: orbit.values.h,
        m: orbit.values.m,
      },
      g,
    };
  }, [view, flat, banked, orbit, g]);
}
