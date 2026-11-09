import { useState } from 'react';
import { es } from '../../i18n/es';
import { parseNumber } from '../../core/numberFormat';
import type { Settings } from '../../core/types';
import { useAppStore } from '../../store/useAppStore';
import { Dialog } from './Dialog';
import styles from './layout.module.css';

const G_PRESETS: Array<{ id: Settings['gPreset']; value: number; label: string }> = [
  { id: '9.8', value: 9.8, label: '9,8 m/s²' },
  { id: '9.81', value: 9.81, label: '9,81 m/s²' },
  { id: '9.80665', value: 9.80665, label: '9,80665 m/s²' },
];

function SettingsForm() {
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const resetAll = useAppStore((s) => s.resetAll);
  const close = useAppStore((s) => s.setSettingsOpen);
  const [customText, setCustomText] = useState(
    settings.gPreset === 'custom' ? String(settings.g).replace('.', ',') : '',
  );
  const [customError, setCustomError] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const S = es.settings;

  const applyCustom = (text: string) => {
    setCustomText(text);
    const p = parseNumber(text);
    if (p.status === 'ok' && p.value > 0 && p.value <= 1000) {
      setCustomError(false);
      setSettings({ g: p.value, gPreset: 'custom' });
    } else setCustomError(text.trim() !== '');
  };

  return (
    <div className={styles.settingsForm}>
      <fieldset className={styles.fieldset}>
        <legend>{S.g}</legend>
        {G_PRESETS.map((p) => (
          <label key={p.id} className={styles.radio}>
            <input
              type="radio"
              name="g"
              checked={settings.gPreset === p.id}
              onChange={() => setSettings({ g: p.value, gPreset: p.id })}
            />
            {p.label}
          </label>
        ))}
        <label className={styles.radio}>
          <input
            type="radio"
            name="g"
            checked={settings.gPreset === 'custom'}
            onChange={() => applyCustom(customText || String(settings.g).replace('.', ','))}
          />
          {S.gCustom}
        </label>
        {settings.gPreset === 'custom' && (
          <div className={styles.inlineField}>
            <label htmlFor="g-custom">{S.gCustomLabel}</label>
            <input
              id="g-custom"
              inputMode="decimal"
              value={customText}
              aria-invalid={customError}
              aria-describedby={customError ? 'g-custom-err' : undefined}
              onChange={(e) => applyCustom(e.target.value)}
            />
            {customError && (
              <p id="g-custom-err" className="msg-error">
                {S.invalidG}
              </p>
            )}
          </div>
        )}
      </fieldset>

      <div className={styles.inlineField}>
        <label htmlFor="sigfigs">{S.sigFigs}</label>
        <select
          id="sigfigs"
          value={settings.sigFigs}
          onChange={(e) => setSettings({ sigFigs: Number(e.target.value) })}
        >
          {[3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <fieldset className={styles.fieldset}>
        <legend>{S.theme}</legend>
        {(
          [
            ['light', S.themeLight],
            ['dark', S.themeDark],
            ['system', S.themeSystem],
          ] as const
        ).map(([id, label]) => (
          <label key={id} className={styles.radio}>
            <input
              type="radio"
              name="theme"
              checked={settings.theme === id}
              onChange={() => setSettings({ theme: id })}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>{S.textSize}</legend>
        {(
          [
            ['normal', S.textNormal],
            ['large', S.textLarge],
          ] as const
        ).map(([id, label]) => (
          <label key={id} className={styles.radio}>
            <input
              type="radio"
              name="textSize"
              checked={settings.textSize === id}
              onChange={() => setSettings({ textSize: id })}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>{S.startUnits}</legend>
        {(
          [
            ['practical', S.unitsPractical],
            ['si', S.unitsSI],
          ] as const
        ).map(([id, label]) => (
          <label key={id} className={styles.radio}>
            <input
              type="radio"
              name="startUnits"
              checked={settings.startUnits === id}
              onChange={() => setSettings({ startUnits: id })}
            />
            {label}
          </label>
        ))}
        <p className="soft">{S.startUnitsNote}</p>
      </fieldset>

      <div className={styles.resetBox}>
        {!confirming ? (
          <button type="button" className="btn" onClick={() => setConfirming(true)}>
            {S.resetAll}
          </button>
        ) : (
          <div className="msg-warning" role="alert">
            <p>{S.resetConfirm}</p>
            <div className={styles.buttonRow}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  resetAll();
                  close(false);
                }}
              >
                {S.resetYes}
              </button>
              <button type="button" className="btn" onClick={() => setConfirming(false)}>
                {es.common.cancel}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function SettingsDialog() {
  const open = useAppStore((s) => s.ui.settingsOpen);
  const setOpen = useAppStore((s) => s.setSettingsOpen);
  return (
    <Dialog open={open} onClose={() => setOpen(false)} title={es.settings.heading}>
      {open && <SettingsForm />}
    </Dialog>
  );
}
