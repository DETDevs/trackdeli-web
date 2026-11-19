import React, { useEffect, useLayoutEffect } from 'react';
import { CAPITULOS } from './capitulos';
import './manual.css';

export interface ManualPageProps {
  onNavigate: (path: string) => void;
}

const MANUAL_TITLE = 'Manual de NEXOL POS';
const MANUAL_DESCRIPTION =
  'Guía paso a paso de NEXOL POS con capturas reales: cómo vender, caja y turnos, historial de ventas, catálogo por rubro, importación desde Excel y usuarios.';
const MANUAL_CANONICAL = 'https://pos.nexolsoft.com/manual';

export const ManualPage: React.FC<ManualPageProps> = ({ onNavigate }) => {
  useLayoutEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-manual-page', 'true');
    return () => {
      html.removeAttribute('data-manual-page');
    };
  }, []);

  useEffect(() => {
    const prevTitle = document.title;
    const descMeta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prevDesc = descMeta?.getAttribute('content') ?? null;
    const canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const prevCanonical = canonicalLink?.getAttribute('href') ?? null;
    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    const prevOgTitle = ogTitle?.getAttribute('content') ?? null;
    const ogDesc = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    const prevOgDesc = ogDesc?.getAttribute('content') ?? null;
    const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    const prevOgUrl = ogUrl?.getAttribute('content') ?? null;

    document.title = MANUAL_TITLE;
    descMeta?.setAttribute('content', MANUAL_DESCRIPTION);
    canonicalLink?.setAttribute('href', MANUAL_CANONICAL);
    ogTitle?.setAttribute('content', MANUAL_TITLE);
    ogDesc?.setAttribute('content', MANUAL_DESCRIPTION);
    ogUrl?.setAttribute('content', MANUAL_CANONICAL);

    return () => {
      document.title = prevTitle;
      if (descMeta && prevDesc !== null) descMeta.setAttribute('content', prevDesc);
      if (canonicalLink && prevCanonical !== null) canonicalLink.setAttribute('href', prevCanonical);
      if (ogTitle && prevOgTitle !== null) ogTitle.setAttribute('content', prevOgTitle);
      if (ogDesc && prevOgDesc !== null) ogDesc.setAttribute('content', prevOgDesc);
      if (ogUrl && prevOgUrl !== null) ogUrl.setAttribute('content', prevOgUrl);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let userInteracted = false;

    const markInteracted = () => {
      userInteracted = true;
    };

    window.addEventListener('wheel', markInteracted, { passive: true, once: true });
    window.addEventListener('touchstart', markInteracted, { passive: true, once: true });

    const resolveTarget = (hash: string): HTMLElement | null => {
      const id = hash.startsWith('#') ? hash.slice(1) : hash;
      if (!id) return null;
      if (id.startsWith('rubro-')) {
        return document.getElementById('catalogo-rubro');
      }
      return document.getElementById(id);
    };

    const scrollToHash = () => {
      const rawHash = window.location.hash;
      if (!rawHash) return;
      const target = resolveTarget(rawHash);
      if (target) {
        target.scrollIntoView({ behavior: 'auto' });
      }
    };

    if (window.location.hash) {
      requestAnimationFrame(() => {
        if (!cancelled) scrollToHash();
      });
      if (document.fonts?.ready) {
        document.fonts.ready.then(() => {
          if (!cancelled && !userInteracted && window.location.hash) {
            scrollToHash();
          }
        });
      }
    } else {
      window.scrollTo(0, 0);
    }

    const handleHashChange = () => {
      scrollToHash();
    };
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      cancelled = true;
      window.removeEventListener('wheel', markInteracted);
      window.removeEventListener('touchstart', markInteracted);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const handleBackClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    e.preventDefault();
    onNavigate('/');
  };

  return (
    <div className="manual-root">
      <div className="wrap">
        <nav className="toc" aria-label="Contenido del manual">
          <div className="brand">
            NEX<span>OL</span> POS<small>Manual de uso</small>
          </div>
          <a href="/" className="toc-back" onClick={handleBackClick}>
            ← Volver al inicio
          </a>
          <div>
            <h2>Contenido</h2>
            <ol>
              {CAPITULOS.map((cap) => (
                <React.Fragment key={cap.id}>
                  <li>
                    <a href={`#${cap.id}`}>
                      <span className="n">{cap.numero}</span>
                      {cap.titulo}
                    </a>
                  </li>
                  {cap.secciones.map((sec) => (
                    <li className="sub" key={sec.id}>
                      <a href={`#${sec.id}`}>{sec.titulo}</a>
                    </li>
                  ))}
                </React.Fragment>
              ))}
            </ol>
          </div>
        </nav>

        <main>
          <header className="manual-head">
            <div className="eyebrow">
              <span className="chip">Manual de uso</span>NEXOL POS
            </div>
            <h1>
              Manual de <em>NEXOL POS</em>
            </h1>
            <p className="lede">
              Guía paso a paso del punto de venta, con capturas reales del sistema. Usá el índice
              para ir directo a lo que necesitás.
            </p>
          </header>

          {CAPITULOS.map((cap) => (
            <cap.Component key={cap.id} />
          ))}

          <footer className="doc">
            <span>NEXOL POS · Manual de uso</span>
            <span>Actualizado el 18 de noviembre de 2026</span>
          </footer>
        </main>
      </div>
    </div>
  );
};
