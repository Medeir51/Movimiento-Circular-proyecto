import { es, fill } from '../../i18n/es';
import { formatNumber, formatQuantity } from '../../core/numberFormat';
import { UNIT_LISTS } from '../../core/units';
import { selectBanked, selectFlat } from '../../store/selectors';
import { useAppStore } from '../../store/useAppStore';
import { Rich } from '../layout/Sym';
import { StepsPanel } from '../steps/StepsPanel';
import { AppInput } from './AppInput';
import { BankedCurveDiagram, FlatCurveDiagram } from './Diagrams';
import styles from './applications.module.css';

const A = es.applications;

function Out({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.outRow}>
      <dt>
        <Rich text={label} />
      </dt>
      <dd className="num">{value}</dd>
    </div>
  );
}

const MU_PRESETS: Array<[string, string]> = [
  [A.muPresets.dry, '0,7'],
  [A.muPresets.wet, '0,4'],
  [A.muPresets.gravel, '0,35'],
  [A.muPresets.ice, '0,1'],
];

/** 17.1 Curva plana con fricción. */
export function FlatCurveApp() {
  const inputs = useAppStore((s) => s.apps.flat);
  const res = useAppStore(selectFlat);
  const editApp = useAppStore((s) => s.editApp);
  const sig = useAppStore((s) => s.settings.sigFigs);
  const g = useAppStore((s) => s.settings.g);
  const v = res.values;
  const q = (x: number | undefined, unit: string) =>
    x === undefined ? es.common.dash : formatQuantity(x, unit, sig, g);

  let verdict: { ok: boolean; text: string } | null = null;
  if (v.Fc !== undefined && v.fmax !== undefined && v.vmax !== undefined) {
    verdict =
      v.skids === 1
        ? {
            ok: false,
            text: fill(A.verdictSkid, {
              need: q(v.Fc, 'N'),
              have: q(v.fmax, 'N'),
              vmax: q(v.vmax, 'km/h'),
            }),
          }
        : {
            ok: true,
            text: fill(A.verdictOk, { pct: `${formatNumber((v.usage ?? 0) * 100, 3)} %` }),
          };
  }

  return (
    <div className={styles.appGrid}>
      <section className={`card ${styles.panel}`} aria-label={A.inputs}>
        <h3>{A.inputs}</h3>
        <AppInput
          target={{ app: 'flat', field: 'R' }}
          quantity={inputs.R}
          units={UNIT_LISTS.length}
          errors={res.errors}
          infoSymbol="R"
        />
        <AppInput
          target={{ app: 'flat', field: 'v' }}
          quantity={inputs.v}
          units={UNIT_LISTS.velocity}
          errors={res.errors}
          optional
          infoSymbol="v"
        />
        <AppInput
          target={{ app: 'flat', field: 'mu' }}
          quantity={inputs.mu}
          units={['one']}
          errors={res.errors}
          infoSymbol="mu"
        />
        <div className={styles.quick} role="group" aria-label={A.muPresets.label}>
          {MU_PRESETS.map(([label, value]) => (
            <button
              key={label}
              type="button"
              className="btn btn-small"
              aria-pressed={inputs.mu.text === value}
              onClick={() => editApp({ app: 'flat', field: 'mu' }, value)}
            >
              {label}
            </button>
          ))}
        </div>
        <AppInput
          target={{ app: 'flat', field: 'm' }}
          quantity={inputs.m}
          units={UNIT_LISTS.mass}
          errors={res.errors}
          infoSymbol="m"
        />
      </section>
      <section className={`card ${styles.panel}`} aria-label={A.outputs}>
        <h3>{A.outputs}</h3>
        <dl className={styles.outList}>
          <Out label={A.out.vmax} value={`${q(v.vmax, 'm/s')} = ${q(v.vmax, 'km/h')}`} />
          {v.Fc !== undefined && <Out label={A.out.FcNeeded} value={q(v.Fc, 'N')} />}
          {v.fmax !== undefined && <Out label={A.out.fmax} value={q(v.fmax, 'N')} />}
        </dl>
        {verdict ? (
          <p className={verdict.ok ? 'msg-success' : 'msg-error'} role="status">
            <Rich text={verdict.text} />
          </p>
        ) : (
          <p className="soft">{A.vOptional}</p>
        )}
        <p className="msg-info">{A.massNote}</p>
        <FlatCurveDiagram radiusText={q(v.R, inputs.R.unit)} />
      </section>
      <section className={`card ${styles.stepsCard}`}>
        <StepsPanel steps={res.steps} errors={res.errors} />
      </section>
    </div>
  );
}

/** 17.2 Curva peraltada. */
export function BankedCurveApp() {
  const inputs = useAppStore((s) => s.apps.banked);
  const res = useAppStore(selectBanked);
  const sig = useAppStore((s) => s.settings.sigFigs);
  const g = useAppStore((s) => s.settings.g);
  const v = res.values;
  const q = (x: number | undefined, unit: string) =>
    x === undefined ? es.common.dash : formatQuantity(x, unit, sig, g);
  const speed = (x: number | undefined) =>
    x === undefined
      ? es.common.dash
      : Number.isFinite(x)
        ? `${q(x, 'm/s')} = ${q(x, 'km/h')}`
        : es.common.unlimited;

  let frictionDir = '';
  let frictionSign = 0;
  if (v.f !== undefined) {
    if (Math.abs(v.f) < 1e-9 * Math.max(1, v.Nf ?? 1)) frictionDir = A.out.frictionNone;
    else {
      frictionSign = v.f > 0 ? 1 : -1;
      frictionDir = v.f > 0 ? A.out.frictionDown : A.out.frictionUp;
    }
  }
  const muText = v.muMin !== undefined ? formatNumber(v.muMin, sig) : '';

  return (
    <div className={styles.appGrid}>
      <section className={`card ${styles.panel}`} aria-label={A.inputs}>
        <h3>{A.inputs}</h3>
        <AppInput
          target={{ app: 'banked', field: 'R' }}
          quantity={inputs.R}
          units={UNIT_LISTS.length}
          errors={res.errors}
          infoSymbol="R"
        />
        <AppInput
          target={{ app: 'banked', field: 'beta' }}
          quantity={inputs.beta}
          units={['deg', 'rad']}
          errors={res.errors}
          infoSymbol="beta"
        />
        <AppInput
          target={{ app: 'banked', field: 'mu' }}
          quantity={inputs.mu}
          units={['one']}
          errors={res.errors}
          infoSymbol="mu"
        />
        <AppInput
          target={{ app: 'banked', field: 'v' }}
          quantity={inputs.v}
          units={UNIT_LISTS.velocity}
          errors={res.errors}
          optional
          infoSymbol="v"
        />
        <AppInput
          target={{ app: 'banked', field: 'm' }}
          quantity={inputs.m}
          units={UNIT_LISTS.mass}
          errors={res.errors}
          infoSymbol="m"
        />
      </section>
      <section className={`card ${styles.panel}`} aria-label={A.outputs}>
        <h3>{A.outputs}</h3>
        <dl className={styles.outList}>
          <Out label={A.out.vIdeal} value={speed(v.vIdeal)} />
          <Out label={A.out.vMax} value={speed(v.vMax)} />
          <Out label={A.out.vMin} value={v.vMin === 0 ? `0 (${A.noVmin})` : speed(v.vMin)} />
          {v.Nf !== undefined && <Out label={A.out.normal} value={q(v.Nf, 'N')} />}
          {v.f !== undefined && (
            <Out label={A.out.friction} value={`${q(Math.abs(v.f), 'N')} · ${frictionDir}`} />
          )}
          {v.muMin !== undefined && <Out label={A.out.muMin} value={muText} />}
          {v.betaIdeal !== undefined && (
            <Out label={A.out.betaIdeal} value={q(v.betaIdeal, 'deg')} />
          )}
        </dl>
        {v.holds !== undefined ? (
          <p className={v.holds === 1 ? 'msg-success' : 'msg-error'} role="status">
            <Rich
              text={fill(v.holds === 1 ? A.verdictBankedOk : A.verdictBankedSkid, {
                mu: muText,
                have: formatNumber(v.mu ?? 0, sig),
              })}
            />
          </p>
        ) : (
          <p className="soft">{A.vOptional}</p>
        )}
        <BankedCurveDiagram betaDeg={((v.beta ?? 0) * 180) / Math.PI} frictionSign={frictionSign} />
      </section>
      <section className={`card ${styles.stepsCard}`}>
        <StepsPanel steps={res.steps} errors={res.errors} />
      </section>
    </div>
  );
}
