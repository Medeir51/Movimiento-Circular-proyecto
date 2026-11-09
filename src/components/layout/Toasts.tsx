import { es } from '../../i18n/es';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from './Icon';
import { Rich } from './Sym';
import styles from './layout.module.css';

/** Avisos breves (4 s) para cambios automáticos. */
export function Toasts() {
  const toasts = useAppStore((s) => s.ui.toasts);
  const dismiss = useAppStore((s) => s.dismissToast);
  return (
    <div className={`${styles.toasts} no-print`} role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${styles.toast} ${t.tone === 'error' ? styles.toastError : ''}`}
        >
          <span>
            <Rich text={t.text} />
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-small"
            aria-label={es.common.close}
            onClick={() => dismiss(t.id)}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
