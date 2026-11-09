import { es } from '../../i18n/es';
import { useAppStore } from '../../store/useAppStore';
import { Rich } from '../layout/Sym';
import styles from './help.module.css';

/** Ayuda (19.5). */
export function HelpPage() {
  const openGlossary = useAppStore((s) => s.openGlossary);
  const H = es.help;
  const S = H.sections;
  return (
    <div className={styles.page}>
      <h2 className={styles.heading}>{H.heading}</h2>
      {(['what', 'data', 'rule', 'timescale'] as const).map((k) => (
        <section key={k} className={`card ${styles.section}`}>
          <h3>{S[k].title}</h3>
          <p>
            <Rich text={S[k].body} />
          </p>
        </section>
      ))}
      <section className={`card ${styles.section}`}>
        <h3>{S.keys.title}</h3>
        <ul>
          {S.keys.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className={`card ${styles.section}`}>
        <h3>{S.glossary.title}</h3>
        <p>{S.glossary.body}</p>
        <button type="button" className="btn" onClick={openGlossary}>
          {S.glossary.link}
        </button>
      </section>
      <section className={`card ${styles.section}`}>
        <h3>{S.offline.title}</h3>
        <p>{S.offline.body}</p>
      </section>
    </div>
  );
}
