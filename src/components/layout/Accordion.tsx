import { useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';
import styles from './layout.module.css';

interface AccordionProps {
  title: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  id?: string;
}

/** Panel plegable (paneles A–D del simulador). */
export function Accordion({ title, defaultOpen = false, children, id }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      id={id}
      className={`card ${styles.accordion}`}
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className={styles.accordionSummary}>
        <span>{title}</span>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={18} />
      </summary>
      <div className={styles.accordionBody}>{children}</div>
    </details>
  );
}
