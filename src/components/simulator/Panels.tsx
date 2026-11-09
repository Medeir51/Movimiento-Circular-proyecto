import { es, fill } from '../../i18n/es';
import { messageText } from '../../core/messages';
import { UNIT_LISTS } from '../../core/units';
import { KIN_VARS, WHEEL_STYLES } from '../../core/types';
import type { KinVar, McuvField, RateField, TimeField, WheelStyle } from '../../core/types';
import { selectView } from '../../store/selectors';
import { useAppStore } from '../../store/useAppStore';
import { DirectionToggle } from '../inputs/DirectionToggle';
import { PointSelector } from '../inputs/PointSelector';
import { Segmented } from '../inputs/Segmented';
import { Accordion } from '../layout/Accordion';
import { Rich } from '../layout/Sym';
import { McuvTable } from './McuvTable';
import { MCUV_UNITS, RATE_UNITS, TIME_UNITS } from './fieldMeta';
import { SimField } from './SimField';
import styles from './simulator.module.css';

const S = es.simulator;

/** A. Rueda: radio ⇄ diámetro, punto, θ0, sentido, estilo y política. */
export function PanelGeometry() {
  const geometry = useAppStore((s) => s.geometry);
  const mode = useAppStore((s) => s.mode);
  const policy = useAppStore((s) => s.mcu.radiusPolicy);
  const editRadius = useAppStore((s) => s.editRadius);
  const setUnit = useAppStore((s) => s.setUnit);
  const setPointKind = useAppStore((s) => s.setPointKind);
  const editPointCustom = useAppStore((s) => s.editPointCustom);
  const editTheta0 = useAppStore((s) => s.editTheta0);
  const setDirection = useAppStore((s) => s.setDirection);
  const setStyle = useAppStore((s) => s.setStyle);
  const setPolicy = useAppStore((s) => s.setRadiusPolicy);
  const radiusUnit = (u: string) => setUnit({ kind: 'radius' }, u);

  return (
    <Accordion title={S.panelA} defaultOpen id="panel-a">
      <SimField
        field="r"
        quantity={geometry.radius}
        units={UNIT_LISTS.length}
        onCommit={(t) => editRadius('r', t)}
        onUnit={radiusUnit}
      />
      <SimField
        field="d"
        quantity={geometry.radius}
        units={[geometry.radius.unit]}
        onCommit={(t) => editRadius('d', t)}
      />
      <PointSelector value={geometry.point.kind} onChange={setPointKind} />
      {geometry.point.kind === 'custom' && (
        <SimField
          field="rp"
          quantity={geometry.point.custom}
          units={UNIT_LISTS.point}
          onCommit={editPointCustom}
          onUnit={(u) => setUnit({ kind: 'point' }, u)}
        />
      )}
      <SimField
        field="theta0"
        quantity={geometry.theta0}
        units={UNIT_LISTS.angle}
        onCommit={editTheta0}
        onUnit={(u) => setUnit({ kind: 'theta0' }, u)}
      />
      <DirectionToggle value={geometry.direction} onChange={setDirection} />
      <label className={styles.selectField}>
        <span>{S.style}</span>
        <select value={geometry.style} onChange={(e) => setStyle(e.target.value as WheelStyle)}>
          {WHEEL_STYLES.map((st) => (
            <option key={st} value={st}>
              {S.styles[st]}
            </option>
          ))}
        </select>
      </label>
      {mode === 'MCU' && (
        <div>
          <Segmented
            label={S.policy}
            value={policy}
            onChange={setPolicy}
            options={[
              { value: 'keepOmega', label: S.policyOmega },
              { value: 'keepV', label: S.policyV },
            ]}
          />
          <p className={styles.note} aria-live="polite">
            <Rich text={policy === 'keepOmega' ? S.policyNoteOmega : S.policyNoteV} />
          </p>
        </div>
      )}
    </Accordion>
  );
}

const RATE_ORDER: RateField[] = ['rpm', 'f', 'T', 'omega', 'v', 'ac'];

/** B. Rapidez de giro (MCU): cualquiera de los campos define el giro. */
export function PanelRate() {
  const rate = useAppStore((s) => s.mcu.rate);
  const editRate = useAppStore((s) => s.editRate);
  const setUnit = useAppStore((s) => s.setUnit);
  return (
    <Accordion title={S.panelB} defaultOpen id="panel-b">
      {RATE_ORDER.map((f) => (
        <SimField
          key={f}
          field={f}
          quantity={rate[f]}
          units={RATE_UNITS[f]}
          onCommit={(t) => editRate(f, t)}
          onUnit={(u) => setUnit({ kind: 'rate', field: f }, u)}
        />
      ))}
    </Accordion>
  );
}

/** C. Masa y fuerza (en MCUV solo la masa). */
export function PanelMass() {
  const mass = useAppStore((s) => s.mass);
  const fc = useAppStore((s) => s.mcu.rate.Fc);
  const mode = useAppStore((s) => s.mode);
  const editMass = useAppStore((s) => s.editMass);
  const editRate = useAppStore((s) => s.editRate);
  const setUnit = useAppStore((s) => s.setUnit);
  return (
    <Accordion
      title={mode === 'MCU' ? S.panelC : S.panelCMcuv}
      id="panel-c"
      defaultOpen={mode === 'MCUV'}
    >
      <SimField
        field="m"
        quantity={mass}
        units={UNIT_LISTS.mass}
        onCommit={editMass}
        onUnit={(u) => setUnit({ kind: 'mass' }, u)}
      />
      {mode === 'MCU' && (
        <SimField
          field="Fc"
          quantity={fc}
          units={RATE_UNITS.Fc}
          onCommit={(t) => editRate('Fc', t)}
          onUnit={(u) => setUnit({ kind: 'rate', field: 'Fc' }, u)}
        />
      )}
    </Accordion>
  );
}

const TIME_ORDER: TimeField[] = ['t', 'dtheta', 's'];

/** D. Tiempo y ángulo (MCU). */
export function PanelTime() {
  const time = useAppStore((s) => s.mcu.time);
  const editTime = useAppStore((s) => s.editTime);
  const setUnit = useAppStore((s) => s.setUnit);
  return (
    <Accordion title={S.panelD} id="panel-d">
      {TIME_ORDER.map((f) => (
        <SimField
          key={f}
          field={f}
          quantity={time[f]}
          units={TIME_UNITS[f]}
          onCommit={(t) => editTime(f, t)}
          onUnit={(u) => setUnit({ kind: 'time', field: f }, u)}
          optional
        />
      ))}
    </Accordion>
  );
}

const kinSym = (k: KinVar) => es.fields[k].sym;

/** D. Datos del MCUV: regla de 3 datos de 5 con alfileres (10.2). */
export function PanelKinematics() {
  const mv = useAppStore((s) => s.mcuv);
  const view = useAppStore(selectView);
  const sig = useAppStore((s) => s.settings.sigFigs);
  const g = useAppStore((s) => s.settings.g);
  const editMcuv = useAppStore((s) => s.editMcuv);
  const togglePin = useAppStore((s) => s.togglePin);
  const setUnit = useAppStore((s) => s.setUnit);

  const knowns = mv.knowns;
  const unknowns = KIN_VARS.filter((k) => !knowns.includes(k));
  const missing = 3 - knowns.length;
  const status =
    missing > 0
      ? missing === 1
        ? S.kinMissingOne
        : fill(S.kinMissing, { n: missing })
      : fill(S.kinStatus, {
          knowns: knowns.map(kinSym).join(', '),
          unknowns: unknowns.map(kinSym).join(', '),
        });

  const pinFor = (v: KinVar) => {
    const pinned = mv.pinned.includes(v);
    const hasValue = knowns.includes(v) || view.result.si[v] !== undefined;
    return {
      pinned,
      disabled: !pinned && (mv.pinned.length >= 3 || !hasValue),
      onToggle: () => togglePin(v),
    };
  };

  const field = (f: McuvField, pin?: KinVar) => (
    <SimField
      key={f}
      field={f}
      quantity={mv.fields[f]}
      units={MCUV_UNITS[f]}
      onCommit={(t) => editMcuv(f, t)}
      onUnit={(u) => setUnit({ kind: 'mcuv', field: f }, u)}
      pin={pin ? pinFor(pin) : undefined}
    />
  );

  const generalErrors = view.result.errors.filter((e) => !e.field);

  return (
    <Accordion title={S.panelKin} defaultOpen id="panel-kin">
      <p className={styles.kinStatus} aria-live="polite">
        <Rich text={status} />
      </p>
      {missing > 0 && (
        <p className="msg-info">
          <Rich text={S.kinPrompt} />
        </p>
      )}
      {field('omega0', 'omega0')}
      {field('omegaF', 'omegaF')}
      {field('alpha', 'alpha')}
      <div className={styles.alt}>
        <span className={styles.altLabel}>
          <Rich text={S.alphaOr} />
        </span>
        {field('at')}
      </div>
      {field('t', 't')}
      {field('dtheta', 'dtheta')}
      <div className={styles.alt}>
        <span className={styles.altLabel}>
          <Rich text={S.dthetaOr} />
        </span>
        {field('s')}
      </div>
      {generalErrors.map((e, i) => (
        <p key={i} className="msg-error" role="alert">
          <Rich text={messageText(e, sig, g)} />
        </p>
      ))}
    </Accordion>
  );
}

/** Columna de entradas: paneles A–D (MCU) o A, D, B y C (MCUV). */
export function InputsColumn() {
  const mode = useAppStore((s) => s.mode);
  return (
    <div className={styles.inputs}>
      <PanelGeometry />
      {mode === 'MCU' ? (
        <>
          <PanelRate />
          <PanelMass />
          <PanelTime />
        </>
      ) : (
        <>
          <PanelKinematics />
          <Accordion title={S.panelBMcuv} defaultOpen id="panel-b">
            <McuvTable />
          </Accordion>
          <PanelMass />
        </>
      )}
    </div>
  );
}
