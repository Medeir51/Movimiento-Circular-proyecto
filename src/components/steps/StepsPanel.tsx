import { useState } from 'react';
import { es, fill } from '../../i18n/es';
import { messageText } from '../../core/messages';
import type { Message } from '../../core/messages';
import { stepsToText } from '../../core/steps';
import type { Step } from '../../core/types';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '../layout/Icon';
import { Rich } from '../layout/Sym';
import { Tex } from './Tex';
import styles from './steps.module.css';

interface StepsPanelProps {
  steps: Step[];
  errors?: Message[];
  /** Resaltar el campo de la calculadora al pasar el cursor (solo en el simulador). */
  highlight?: boolean;
  heading?: boolean;
  compact?: boolean;
}

/** Paso a paso plegable con copiar procedimiento y «Mostrar solo resultados» (sección 11). */
export function StepsPanel({
  steps,
  errors = [],
  highlight,
  heading = true,
  compact,
}: StepsPanelProps) {
  const [onlyResults, setOnlyResults] = useState(false);
  const sig = useAppStore((s) => s.settings.sigFigs);
  const g = useAppStore((s) => s.settings.g);
  const setHighlight = useAppStore((s) => s.setHighlightField);
  const openFormula = useAppStore((s) => s.openFormula);
  const pushToast = useAppStore((s) => s.pushToast);
  const S = es.steps;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(stepsToText(steps));
      pushToast(S.copied);
    } catch {
      pushToast(S.copyFailed, 'error');
    }
  };

  return (
    <section className={`${styles.panel} ${compact ? styles.compact : ''}`} aria-label={S.heading}>
      {heading && (
        <div className={styles.header}>
          <h2 className={styles.title}>{S.heading}</h2>
          <div className={styles.tools}>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={onlyResults}
                onChange={(e) => setOnlyResults(e.target.checked)}
              />
              {S.onlyResults}
            </label>
            <button
              type="button"
              className="btn btn-small"
              onClick={() => void copy()}
              disabled={steps.length === 0}
            >
              <Icon name="copy" size={16} />
              {S.copy}
            </button>
          </div>
        </div>
      )}
      {steps.length === 0 && errors.length === 0 && <p className="muted">{S.empty}</p>}
      <ol className={styles.list}>
        {steps.map((step, i) => {
          const tex = onlyResults
            ? `${step.formulaTex} = ${step.resultTex}`
            : step.substitutionTex
              ? `${step.formulaTex} = ${step.substitutionTex} = ${step.resultTex}`
              : `${step.formulaTex} = ${step.resultTex}`;
          return (
            <li
              key={`${step.id}-${i}`}
              className={styles.step}
              onMouseEnter={
                highlight && step.field ? () => setHighlight(step.field ?? null) : undefined
              }
              onMouseLeave={highlight ? () => setHighlight(null) : undefined}
              onFocus={highlight && step.field ? () => setHighlight(step.field ?? null) : undefined}
              onBlur={highlight ? () => setHighlight(null) : undefined}
            >
              <details open>
                <summary className={styles.summary}>
                  <span className={styles.num}>{i + 1}.</span>
                  <span className={styles.stepTitle}>
                    <Rich text={step.title} />
                  </span>
                  {step.formulaId && (
                    <button
                      type="button"
                      className={styles.formulaLink}
                      onClick={(e) => {
                        e.preventDefault();
                        openFormula(step.formulaId as string);
                      }}
                      title={fill(S.openFormula, { id: step.formulaId })}
                      aria-label={fill(S.openFormula, { id: step.formulaId })}
                    >
                      {step.formulaId}
                    </button>
                  )}
                </summary>
                <div className={styles.body}>
                  <Tex tex={tex} display />
                  {step.altText && <p className={styles.alt}>= {step.altText}</p>}
                  {step.note && (
                    <p className={styles.note}>
                      <Rich text={step.note} />
                    </p>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ol>
      {errors.length > 0 && (
        <div className="msg-error" role="alert">
          <strong>{S.errorTitle}</strong>
          <ul className={styles.errors}>
            {errors.map((m, i) => (
              <li key={i}>
                <Rich text={messageText(m, sig, g)} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {steps.length > 0 && <p className={styles.footnote}>{S.decimalsNote}</p>}
    </section>
  );
}
