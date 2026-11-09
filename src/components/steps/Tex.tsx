import { memo, useEffect, useMemo, useState } from 'react';
import { es } from '../../i18n/es';

interface TexProps {
  tex: string;
  display?: boolean;
  className?: string;
}

type Katex = typeof import('katex').default;

/** KaTeX se carga aparte (va en la precarga de la PWA) para aligerar el arranque. */
let katexLib: Katex | null = null;
let katexLoading: Promise<Katex> | null = null;

function loadKatex(): Promise<Katex> {
  katexLoading ??= import('katex').then((m) => {
    katexLib = m.default;
    return m.default;
  });
  return katexLoading;
}

/** Fórmula renderizada con KaTeX (empaquetado localmente, sin CDN). */
export const Tex = memo(function Tex({ tex, display = false, className }: TexProps) {
  const [ready, setReady] = useState(katexLib !== null);

  useEffect(() => {
    if (ready) return;
    let alive = true;
    void loadKatex().then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [ready]);

  const html = useMemo(() => {
    if (!ready || !katexLib) return null;
    try {
      return katexLib.renderToString(tex, {
        throwOnError: false,
        displayMode: display,
        strict: 'ignore',
        output: 'htmlAndMathml',
      });
    } catch {
      return tex;
    }
  }, [ready, tex, display]);

  if (html === null) {
    return display ? (
      <div className={`tex-block tex-loading ${className ?? ''}`} aria-busy="true">
        {es.common.loading}
      </div>
    ) : (
      <span className={className} aria-busy="true">
        {es.common.loading}
      </span>
    );
  }
  if (display) {
    return (
      <div className={`tex-block ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: html }} />
    );
  }
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
});
