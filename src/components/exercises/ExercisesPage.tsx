import { useMemo, useState } from 'react';
import { es, fill } from '../../i18n/es';
import { TEMPLATE_IDS, generateExercise } from '../../core/exercises/templates';
import type { TemplateId } from '../../core/exercises/templates';
import { formatNumber, formatQuantity } from '../../core/numberFormat';
import { useAppStore } from '../../store/useAppStore';
import { Segmented } from '../inputs/Segmented';
import { Icon } from '../layout/Icon';
import { Rich } from '../layout/Sym';
import { ExerciseCard } from './ExerciseCard';
import styles from './exercises.module.css';

const X = es.exercises;

function TemplatePicker({
  selected,
  onChange,
}: {
  selected: TemplateId[];
  onChange: (ids: TemplateId[]) => void;
}) {
  return (
    <fieldset className={styles.templates}>
      <legend>{X.templates}</legend>
      <div className={styles.templateButtons}>
        <button type="button" className="btn btn-small" onClick={() => onChange([...TEMPLATE_IDS])}>
          {X.selectAll}
        </button>
        <button type="button" className="btn btn-small" onClick={() => onChange([])}>
          {X.selectNone}
        </button>
      </div>
      <div className={styles.templateList}>
        {TEMPLATE_IDS.map((id) => (
          <label key={id} className={styles.templateItem}>
            <input
              type="checkbox"
              checked={selected.includes(id)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? TEMPLATE_IDS.filter((t) => t === id || selected.includes(t))
                    : selected.filter((t) => t !== id),
                )
              }
            />
            <span>
              <strong>{id}</strong> · {X.templatesText[id].title}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function clampStudent(text: string): number | null {
  const n = Number(text);
  return Number.isInteger(n) && n >= 1 && n <= 60 ? n : null;
}

/** Modo estudiante (18.3). */
function PracticeMode() {
  const settings = useAppStore((s) => s.settings);
  const [code, setCode] = useState('');
  const [student, setStudent] = useState('1');
  const [templates, setTemplates] = useState<TemplateId[]>([...TEMPLATE_IDS]);
  const [session, setSession] = useState<{ code: string; student: number; free: boolean } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const start = () => {
    const n = clampStudent(student);
    if (!code.trim()) return setError(X.invalidCode);
    if (n === null) return setError(X.invalidStudent);
    setError(null);
    setSession({ code: code.trim(), student: n, free: false });
  };

  const free = () => {
    const seed = Math.floor(Math.random() * 1e9)
      .toString(36)
      .toUpperCase();
    setError(null);
    setSession({ code: `${X.freeCode}-${seed}`, student: 1, free: true });
  };

  const exercises = useMemo(
    () =>
      session
        ? templates.map((id) => generateExercise(session.code, session.student, id, settings))
        : [],
    [session, templates, settings],
  );

  return (
    <div className={styles.mode}>
      <div className={`card ${styles.form}`}>
        <div className={styles.formRow}>
          <label className={styles.field}>
            <span>{X.code}</span>
            <input
              value={code}
              placeholder={X.codePlaceholder}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>{X.student}</span>
            <input
              inputMode="numeric"
              value={student}
              onChange={(e) => setStudent(e.target.value)}
              className={styles.small}
            />
          </label>
          <button type="button" className="btn btn-primary" onClick={start}>
            {X.start}
          </button>
          <button type="button" className="btn" onClick={free}>
            {X.free}
          </button>
        </div>
        {error && (
          <p className="msg-error" role="alert">
            {error}
          </p>
        )}
        <TemplatePicker selected={templates} onChange={setTemplates} />
      </div>
      {session && (
        <h3 className={styles.sessionTitle}>
          {session.free
            ? fill(X.freeTitle, { seed: session.code })
            : fill(X.sheetTitle, { code: session.code, n: session.student })}
        </h3>
      )}
      {session && templates.length === 0 && <p className="muted">{X.noTemplates}</p>}
      <div className={styles.cards}>
        {exercises.map((ex) => (
          <ExerciseCard key={`${session?.code}-${session?.student}-${ex.templateId}`} ex={ex} />
        ))}
      </div>
    </div>
  );
}

/** Modo docente: talleres imprimibles con clave (18.4). */
function TeacherMode() {
  const settings = useAppStore((s) => s.settings);
  const [code, setCode] = useState('');
  const [countText, setCountText] = useState('3');
  const [templates, setTemplates] = useState<TemplateId[]>(['E1', 'E5', 'E7']);
  const [includeKey, setIncludeKey] = useState(true);
  const count = clampStudent(countText);
  const valid = code.trim() !== '' && count !== null && templates.length > 0;

  const sheets = useMemo(() => {
    if (!valid || count === null) return [];
    return Array.from({ length: count }, (_, i) => ({
      n: i + 1,
      exercises: templates.map((id) => generateExercise(code.trim(), i + 1, id, settings)),
    }));
  }, [valid, count, templates, code, settings]);

  return (
    <div className={styles.mode}>
      <div className={`card ${styles.form} no-print`}>
        <p className="muted">{X.teacherIntro}</p>
        <div className={styles.formRow}>
          <label className={styles.field}>
            <span>{X.code}</span>
            <input
              value={code}
              placeholder={X.codePlaceholder}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>{X.students}</span>
            <input
              inputMode="numeric"
              value={countText}
              onChange={(e) => setCountText(e.target.value)}
              className={styles.small}
            />
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={includeKey}
              onChange={(e) => setIncludeKey(e.target.checked)}
            />
            {X.includeKey}
          </label>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.print()}
            disabled={!valid}
          >
            <Icon name="print" size={18} />
            {X.print}
          </button>
        </div>
        {!code.trim() && <p className="msg-error">{X.invalidCode}</p>}
        {count === null && <p className="msg-error">{X.invalidStudents}</p>}
        {templates.length === 0 && <p className="msg-error">{X.noTemplates}</p>}
        <TemplatePicker selected={templates} onChange={setTemplates} />
      </div>
      <h3 className={`${styles.sessionTitle} no-print`}>{X.preview}</h3>
      <div className={styles.preview} data-testid="print-preview">
        {sheets.map((sheet) => (
          <section
            key={sheet.n}
            className={`card ${styles.sheet} print-sheet`}
            data-sheet={sheet.n}
          >
            <h3>{fill(X.sheetTitle, { code: code.trim(), n: sheet.n })}</h3>
            <ol className={styles.sheetList}>
              {sheet.exercises.map((ex) => (
                <li key={ex.templateId} className="print-avoid-break">
                  <p>
                    <strong>{ex.title}.</strong> <Rich text={ex.statement} />
                  </p>
                  <ol type="a" className={styles.sheetQuestions}>
                    {ex.questions.map((q) => (
                      <li key={q.id}>
                        <Rich text={q.label} />
                        <span className={styles.blank}>{X.answerLine}</span>
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          </section>
        ))}
        {includeKey && sheets.length > 0 && (
          <section
            className={`card ${styles.sheet} ${styles.key} print-sheet`}
            data-testid="answer-key"
          >
            <h3>{X.keyTitle}</h3>
            {sheets.map((sheet) => (
              <div key={sheet.n} className="print-avoid-break">
                <h4>{fill(X.keyStudent, { n: sheet.n })}</h4>
                <table className={styles.keyTable}>
                  <thead>
                    <tr>
                      <th scope="col">{X.question}</th>
                      <th scope="col">{X.result}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.exercises.flatMap((ex) =>
                      ex.questions.map((q) => (
                        <tr key={`${ex.templateId}-${q.id}`}>
                          <td>
                            {ex.templateId} · <Rich text={q.label} />
                          </td>
                          <td className="num">
                            {q.unit === 'one'
                              ? formatNumber(q.answer, 4)
                              : formatQuantity(q.answer, q.unit, 4, settings.g)}
                          </td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

export function ExercisesPage() {
  const [mode, setMode] = useState<'practice' | 'teacher'>('practice');
  return (
    <div className={styles.page}>
      <h2 className={`${styles.heading} no-print`}>{X.heading}</h2>
      <div className="no-print">
        <Segmented
          label={X.modeLabel}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'practice', label: X.practice },
            { value: 'teacher', label: X.teacher },
          ]}
        />
      </div>
      {mode === 'practice' ? <PracticeMode /> : <TeacherMode />}
    </div>
  );
}
