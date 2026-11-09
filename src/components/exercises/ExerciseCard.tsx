import { useId, useState } from 'react';
import { es, fill } from '../../i18n/es';
import { checkAnswer } from '../../core/exercises/checker';
import type { CheckResult } from '../../core/exercises/checker';
import type { Exercise, Question } from '../../core/exercises/templates';
import { parseNumber } from '../../core/numberFormat';
import { toSI } from '../../core/units';
import type { UnitId } from '../../core/types';
import { formulaById } from '../../data/formulas';
import { useAppStore } from '../../store/useAppStore';
import { UnitSelect } from '../inputs/UnitSelect';
import { Icon } from '../layout/Icon';
import { Rich } from '../layout/Sym';
import { StepsPanel } from '../steps/StepsPanel';
import { Tex } from '../steps/Tex';
import styles from './exercises.module.css';

interface QState {
  text: string;
  unit: UnitId;
  attempts: number;
  result: CheckResult | null;
  parseError: string | null;
  showHint: boolean;
}

function QuestionRow({
  q,
  state,
  onChange,
  onShowSolution,
}: {
  q: Question;
  state: QState;
  onChange: (patch: Partial<QState>) => void;
  onShowSolution: () => void;
}) {
  const g = useAppStore((s) => s.settings.g);
  const id = useId();
  const X = es.exercises;
  const failed = state.result !== null && !state.result.correct ? state.attempts : 0;
  const correct = state.result?.correct === true;

  const check = () => {
    const p = parseNumber(state.text);
    if (p.status === 'empty') {
      onChange({ parseError: X.emptyAnswer });
      return;
    }
    if (p.status === 'error') {
      onChange({ parseError: es.messages[p.code] });
      return;
    }
    const result = checkAnswer(toSI(p.value, state.unit, g), q.answer, g);
    onChange({
      result,
      parseError: null,
      attempts: result.correct ? state.attempts : state.attempts + 1,
    });
  };

  const formula = formulaById(q.formulaId);
  const feedbackId = `${id}-fb`;
  return (
    <li className={styles.question}>
      <label htmlFor={`${id}-in`} className={styles.qLabel}>
        <Rich text={q.label} />
      </label>
      <div className={styles.answerRow}>
        <input
          id={`${id}-in`}
          className={`${styles.answer} ${correct ? styles.answerOk : state.result ? styles.answerBad : ''}`}
          inputMode="decimal"
          autoComplete="off"
          value={state.text}
          placeholder={X.answer}
          aria-describedby={feedbackId}
          onChange={(e) => onChange({ text: e.target.value, parseError: null })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') check();
          }}
        />
        <UnitSelect
          value={state.unit}
          units={q.units}
          name={q.label}
          onChange={(u) => onChange({ unit: u })}
        />
        <button type="button" className="btn btn-primary btn-small" onClick={check}>
          {X.check}
        </button>
      </div>
      <div id={feedbackId} aria-live="polite">
        {state.parseError && <p className="msg-error">{state.parseError}</p>}
        {state.result &&
          (state.result.correct ? (
            <p className="msg-success">
              <Icon name="check" size={16} /> {X.correct}
            </p>
          ) : (
            <p className="msg-error">
              <Rich text={X.hints[state.result.hint]} />
            </p>
          ))}
      </div>
      {!correct && state.attempts > 0 && (
        <p className="soft">{fill(X.attempts, { n: state.attempts })}</p>
      )}
      <div className={styles.helpRow}>
        {failed >= 2 && formula && (
          <button
            type="button"
            className="btn btn-small"
            onClick={() => onChange({ showHint: !state.showHint })}
          >
            {state.showHint ? X.hideHint : X.hint}
          </button>
        )}
        {failed >= 3 && (
          <button type="button" className="btn btn-small" onClick={onShowSolution}>
            {X.solution}
          </button>
        )}
      </div>
      {state.showHint && formula && (
        <div className={styles.hint}>
          <strong>
            {formula.id} · <Rich text={formula.name} />
          </strong>
          <Tex tex={formula.tex} display />
          <p>
            <Rich text={formula.says} />
          </p>
        </div>
      )}
    </li>
  );
}

/** Un ejercicio del modo práctica con verificación, pistas y solución (18.3). */
export function ExerciseCard({ ex }: { ex: Exercise }) {
  const [states, setStates] = useState<QState[]>(() =>
    ex.questions.map((q) => ({
      text: '',
      unit: q.unit,
      attempts: 0,
      result: null,
      parseError: null,
      showHint: false,
    })),
  );
  const [showSolution, setShowSolution] = useState(false);
  const loadExercise = useAppStore((s) => s.loadExercise);
  const X = es.exercises;
  const allChecked = states.every((s) => s.result !== null);
  const okCount = states.filter((s) => s.result?.correct).length;

  return (
    <article className={`card ${styles.card}`} aria-labelledby={`ex-${ex.templateId}`}>
      <header className={styles.cardHeader}>
        <span className={styles.code}>{ex.templateId}</span>
        <h3 id={`ex-${ex.templateId}`}>
          {fill(X.exercise, { id: ex.templateId })} · {ex.title}
        </h3>
      </header>
      <p className={styles.statement}>
        <Rich text={ex.statement} />
      </p>
      <ol className={styles.questions}>
        {ex.questions.map((q, i) => (
          <QuestionRow
            key={q.id}
            q={q}
            state={states[i]}
            onChange={(patch) =>
              setStates((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)))
            }
            onShowSolution={() => setShowSolution(true)}
          />
        ))}
      </ol>
      {allChecked && (
        <p className={styles.score} role="status">
          {fill(X.score, { ok: okCount, n: ex.questions.length })}
        </p>
      )}
      <div className={styles.cardActions}>
        <button type="button" className="btn btn-small" onClick={() => loadExercise(ex.load)}>
          {X.openInSimulator}
        </button>
        {showSolution && (
          <button
            type="button"
            className="btn btn-small btn-ghost"
            onClick={() => setShowSolution(false)}
          >
            {X.hideSolution}
          </button>
        )}
      </div>
      {showSolution && <StepsPanel steps={ex.steps} compact />}
    </article>
  );
}
