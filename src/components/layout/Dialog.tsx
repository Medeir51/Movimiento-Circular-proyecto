import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { es } from '../../i18n/es';
import { Icon } from './Icon';
import styles from './layout.module.css';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  wide?: boolean;
}

/** Ventana modal accesible basada en <dialog> (atrapa el foco y se cierra con Esc). */
export function Dialog({ open, onClose, title, children, wide }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      try {
        d.showModal();
      } catch {
        d.setAttribute('open', '');
      }
    } else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${wide ? styles.dialogWide : ''}`}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open && (
        <div className={styles.dialogInner}>
          <div className={styles.dialogHeader}>
            <h2 id={titleId}>{title}</h2>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              aria-label={es.common.close}
              onClick={onClose}
            >
              <Icon name="close" />
            </button>
          </div>
          <div className={styles.dialogBody}>{children}</div>
        </div>
      )}
    </dialog>
  );
}
