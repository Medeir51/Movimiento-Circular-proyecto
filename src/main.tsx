import 'katex/dist/katex.min.css';
import './styles/global.css';
import './styles/print.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { importSharedFromHash, setupPersistence, setupTheme } from './store/bootstrap';

setupTheme();
importSharedFromHash();
setupPersistence();

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
}
