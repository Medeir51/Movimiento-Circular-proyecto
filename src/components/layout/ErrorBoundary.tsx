import { Component } from 'react';
import type { ReactNode } from 'react';
import { es } from '../../i18n/es';
import { useAppStore } from '../../store/useAppStore';
import styles from './layout.module.css';

interface State {
  failed: boolean;
}

/** Si algo falla al dibujar, muestra «Algo salió mal. Reiniciar» y vuelve al caso por defecto. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: unknown): void {
    console.error(error);
  }

  restart = (): void => {
    useAppStore.getState().resetAll();
    this.setState({ failed: false });
  };

  override render(): ReactNode {
    if (this.state.failed) {
      return (
        <div className={styles.crash} role="alert">
          <p>{es.errors.boundary}</p>
          <button type="button" className="btn btn-primary" onClick={this.restart}>
            {es.errors.restart}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
