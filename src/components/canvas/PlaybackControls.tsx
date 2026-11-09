import { es, fill } from '../../i18n/es';
import { formatQuantity } from '../../core/numberFormat';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '../layout/Icon';
import { buildAnimModel } from './animModel';
import styles from './canvas.module.css';

/** ▶/⏸ · ⟲ · ⏮ · ⏭ · deslizador de tiempo · «Repetir» (solo MCUV). */
export function PlaybackControls() {
  const playing = useAppStore((s) => s.playback.playing);
  const tau = useAppStore((s) => s.playback.tau);
  const loop = useAppStore((s) => s.playback.loop);
  const sig = useAppStore((s) => s.settings.sigFigs);
  const model = useAppStore(buildAnimModel);
  const togglePlay = useAppStore((s) => s.togglePlay);
  const seek = useAppStore((s) => s.seek);
  const stepFrame = useAppStore((s) => s.stepFrame);
  const setLoop = useAppStore((s) => s.setLoop);
  const C = es.canvas;
  const hasMotion = model.motion !== null;
  const max = model.sliderMax;
  const sliderValue = model.mode === 'MCU' && tau > max ? tau % max : Math.min(tau, max);
  const tauText = formatQuantity(tau, 's', Math.min(sig, 4));

  return (
    <div className={styles.controls}>
      <div className={styles.buttons}>
        <button
          type="button"
          className="btn btn-primary btn-icon"
          onClick={togglePlay}
          disabled={!hasMotion}
          aria-label={playing ? C.pause : C.play}
          title={playing ? C.pause : C.play}
        >
          <Icon name={playing && hasMotion ? 'pause' : 'play'} />
        </button>
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => seek(0)}
          aria-label={C.reset}
          title={C.reset}
        >
          <Icon name="reset" />
        </button>
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => stepFrame(-1)}
          disabled={!hasMotion}
          aria-label={C.back}
          title={C.back}
        >
          <Icon name="back" />
        </button>
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => stepFrame(1)}
          disabled={!hasMotion}
          aria-label={C.forward}
          title={C.forward}
        >
          <Icon name="forward" />
        </button>
      </div>
      <input
        type="range"
        className={styles.slider}
        min={0}
        max={max}
        step={max / 1000}
        value={sliderValue}
        disabled={!hasMotion}
        aria-label={C.slider}
        aria-valuetext={fill(C.tau, { value: tauText })}
        onChange={(e) => seek(Number(e.target.value))}
      />
      <output className={`${styles.tau} num`}>{fill(C.tau, { value: tauText })}</output>
      {model.mode === 'MCUV' && (
        <label className={styles.check}>
          <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
          {C.loop}
        </label>
      )}
    </div>
  );
}
