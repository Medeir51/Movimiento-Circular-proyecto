import { useEffect, useMemo, useRef, useState } from 'react';
import { es, fill } from '../../i18n/es';
import { TWO_PI } from '../../core/constants';
import { formatQuantity } from '../../core/numberFormat';
import { autoTimeScale, timeScaleLabel } from '../../core/timeScale';
import { UNIT_LISTS } from '../../core/units';
import type { OrbitBody } from '../../core/applications/types';
import type { Motion, SolveResult } from '../../core/types';
import { DEFAULT_DISPLAY } from '../../core/defaults';
import { Clock } from '../../store/clock';
import { selectOrbit } from '../../store/selectors';
import { useAppStore } from '../../store/useAppStore';
import type { AnimModel } from '../canvas/animModel';
import { drawScene } from '../canvas/drawing';
import { useCanvasLoop } from '../canvas/useCanvasLoop';
import { Icon } from '../layout/Icon';
import { Rich } from '../layout/Sym';
import { StepsPanel } from '../steps/StepsPanel';
import { AppInput } from './AppInput';
import canvasStyles from '../canvas/canvas.module.css';
import styles from './applications.module.css';

const A = es.applications;
const BODIES: OrbitBody[] = ['earth', 'moon', 'mars', 'sun', 'custom'];

/** Lienzo de la órbita: reutiliza el dibujo del simulador con el estilo «órbita». */
function OrbitCanvas({ R, omega, m }: { R: number; omega: number; m: number | null }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(true);
  const sig = useAppStore((s) => s.settings.sigFigs);
  const clock = useMemo(() => new Clock(), []);
  const factor = autoTimeScale(omega / TWO_PI);

  const model = useMemo<AnimModel>(() => {
    const motion: Motion = {
      omega0: omega,
      alpha: 0,
      tEnd: null,
      R,
      rp: R,
      theta0: 0,
      dirSign: 1,
      m,
    };
    const result: SolveResult = {
      ok: true,
      mode: 'MCU',
      incomplete: false,
      si: { R, rp: R, theta0: 0 },
      fieldStatus: {},
      errors: [],
      warnings: [],
      steps: [],
      motion,
    };
    return {
      result,
      mode: 'MCU',
      motion,
      motionKey: `${R}|${omega}`,
      message: null,
      style: 'orbit',
      R,
      refR: null,
      display: { ...DEFAULT_DISPLAY, showAc: true, showV: true },
      autoScale: factor,
      timeScale: factor,
      manual: false,
      strobe: false,
      fMax: omega / TWO_PI,
      kv: 0.45 / (omega * R),
      ka: 0.45 / (omega * omega * R),
      sig,
      radiusUnit: 'km',
      diameterLabel: fill(es.canvas.diameter, { value: formatQuantity(2 * R, 'km', sig) }),
      tStop: null,
      sliderMax: (2 * TWO_PI) / omega,
      aria: fill(es.simulator.canvasLabel, {
        d: formatQuantity(2 * R, 'km', sig),
        rate: formatQuantity((omega * 60) / TWO_PI, 'rev/min', sig),
        dir: es.simulator.ccw.toLowerCase(),
      }),
    };
  }, [R, omega, m, factor, sig]);

  const live = useRef({ model, playing });
  useEffect(() => {
    live.current = { model, playing };
  }, [model, playing]);

  useCanvasLoop(wrapRef, canvasRef, ({ ctx, size, colors, dt }) => {
    const { model: md, playing: p } = live.current;
    if (p) clock.set(clock.tau + dt * md.timeScale);
    drawScene(ctx, size, md, clock.tau, [], colors);
  });

  return (
    <div className={styles.orbitCanvas}>
      <div className={canvasStyles.timeBar}>
        <span className={canvasStyles.badge}>{timeScaleLabel(factor)}</span>
        <button
          type="button"
          className="btn btn-primary btn-icon btn-small"
          onClick={() => setPlaying((x) => !x)}
          aria-label={playing ? es.canvas.pause : es.canvas.play}
        >
          <Icon name={playing ? 'pause' : 'play'} size={18} />
        </button>
      </div>
      <div ref={wrapRef} className={canvasStyles.canvasWrap}>
        <canvas
          ref={canvasRef}
          className={canvasStyles.canvas}
          role="img"
          aria-label={model.aria}
        />
      </div>
    </div>
  );
}

/** 17.3 Órbitas circulares. */
export function OrbitApp() {
  const inputs = useAppStore((s) => s.apps.orbit);
  const res = useAppStore(selectOrbit);
  const setBody = useAppStore((s) => s.setOrbitBody);
  const shortcut = useAppStore((s) => s.orbitShortcut);
  const openInSim = useAppStore((s) => s.openOrbitInSimulator);
  const sig = useAppStore((s) => s.settings.sigFigs);
  const g = useAppStore((s) => s.settings.g);
  const v = res.values;
  const q = (x: number | undefined, unit: string) =>
    x === undefined ? es.common.dash : formatQuantity(x, unit, sig, g);
  const src = inputs.source;
  const ok = res.ok && v.R !== undefined && v.omega !== undefined;

  return (
    <div className={styles.appGrid}>
      <section className={`card ${styles.panel}`} aria-label={A.inputs}>
        <h3>{A.inputs}</h3>
        <label className={styles.selectField}>
          <span>{A.body}</span>
          <select value={inputs.body} onChange={(e) => setBody(e.target.value as OrbitBody)}>
            {BODIES.map((b) => (
              <option key={b} value={b}>
                {A.bodies[b]}
              </option>
            ))}
          </select>
        </label>
        {inputs.body === 'custom' && (
          <>
            <AppInput
              target={{ app: 'orbit', field: 'M' }}
              quantity={inputs.M}
              units={UNIT_LISTS.mass}
              errors={res.errors}
              infoSymbol="M"
            />
            <AppInput
              target={{ app: 'orbit', field: 'Rbody' }}
              quantity={inputs.Rbody}
              units={UNIT_LISTS.length}
              errors={res.errors}
            />
          </>
        )}
        <p className="soft">{A.sourceNote}</p>
        <AppInput
          target={{ app: 'orbit', field: 'R' }}
          quantity={inputs.R}
          units={UNIT_LISTS.length}
          errors={res.errors}
          computed={src !== 'R'}
          computedSI={v.R}
          infoSymbol="R"
        />
        <AppInput
          target={{ app: 'orbit', field: 'h' }}
          quantity={inputs.h}
          units={UNIT_LISTS.length}
          errors={res.errors}
          computed={src !== 'h'}
          computedSI={v.h}
          infoSymbol="h"
        />
        <AppInput
          target={{ app: 'orbit', field: 'T' }}
          quantity={inputs.T}
          units={UNIT_LISTS.time}
          errors={res.errors}
          computed={src !== 'T'}
          computedSI={v.T}
          infoSymbol="T"
        />
        <AppInput
          target={{ app: 'orbit', field: 'm' }}
          quantity={inputs.m}
          units={UNIT_LISTS.mass}
          errors={res.errors}
          optional
          infoSymbol="m"
        />
        <div className={styles.quick} role="group" aria-label={A.shortcuts}>
          <span className={styles.quickLabel}>{A.shortcuts}:</span>
          <button type="button" className="btn btn-small" onClick={() => shortcut('iss')}>
            {A.shortcutIss}
          </button>
          <button type="button" className="btn btn-small" onClick={() => shortcut('gps')}>
            {A.shortcutGps}
          </button>
          <button type="button" className="btn btn-small" onClick={() => shortcut('geo')}>
            {A.shortcutGeo}
          </button>
          <button type="button" className="btn btn-small" onClick={() => shortcut('moon')}>
            {A.shortcutMoon}
          </button>
        </div>
      </section>
      <section className={`card ${styles.panel}`} aria-label={A.outputs}>
        <h3>{A.outputs}</h3>
        <dl className={styles.outList}>
          <div className={styles.outRow}>
            <dt>{A.out.R}</dt>
            <dd className="num">{q(v.R, 'km')}</dd>
          </div>
          <div className={styles.outRow}>
            <dt>{A.out.h}</dt>
            <dd className="num">{q(v.h, 'km')}</dd>
          </div>
          <div className={styles.outRow}>
            <dt>{A.out.v}</dt>
            <dd className="num">
              {q(v.v, 'm/s')} = {q(v.v, 'km/s')}
            </dd>
          </div>
          <div className={styles.outRow}>
            <dt>{A.out.T}</dt>
            <dd className="num">
              {q(v.T, 's')} = {q(v.T, 'min')}
            </dd>
          </div>
          <div className={styles.outRow}>
            <dt>
              <Rich text={A.out.omega} />
            </dt>
            <dd className="num">{q(v.omega, 'rad/s')}</dd>
          </div>
          <div className={styles.outRow}>
            <dt>
              <Rich text={A.out.ac} />
            </dt>
            <dd className="num">{q(v.ac, 'm/s2')}</dd>
          </div>
          {v.F !== undefined && (
            <div className={styles.outRow}>
              <dt>{A.out.F}</dt>
              <dd className="num">{q(v.F, 'N')}</dd>
            </div>
          )}
          <div className={styles.outRow}>
            <dt>{A.out.turnsPerDay}</dt>
            <dd className="num">{q(v.turnsPerDay, 'turns')}</dd>
          </div>
        </dl>
        <button type="button" className="btn btn-primary" onClick={openInSim} disabled={!ok}>
          {A.openInSimulator}
        </button>
        {ok && <OrbitCanvas R={v.R as number} omega={v.omega as number} m={v.m ?? null} />}
      </section>
      <section className={`card ${styles.stepsCard}`}>
        <StepsPanel steps={res.steps} errors={res.errors} />
      </section>
    </div>
  );
}
