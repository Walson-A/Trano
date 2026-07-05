import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { HAProvider } from './context/HAContext.tsx';

/**
 * Vieux WebKit (iPad mural sous iOS 12) :
 * - ResizeObserver manque (requis par les graphiques Recharts) → polyfill.
 * - `gap` est ignoré en flexbox → classe `no-flexgap` sur <html>, des
 *   retombées en marges existent dans index.css.
 * Sur un navigateur récent, tout ceci ne fait rien.
 */
async function ensureLegacySupport() {
  if (!('ResizeObserver' in window)) {
    const { default: RO } = await import('resize-observer-polyfill');
    (window as unknown as { ResizeObserver: unknown }).ResizeObserver = RO;
  }

  // Safari < 14 : MediaQueryList n'a que addListener/removeListener —
  // motion (prefers-reduced-motion) appelle addEventListener('change').
  const mql = window.matchMedia?.('(min-width: 1px)');
  if (mql && !('addEventListener' in mql)) {
    type LegacyMQL = { addListener(cb: unknown): void; removeListener(cb: unknown): void };
    const proto = Object.getPrototypeOf(mql) as LegacyMQL & Record<string, unknown>;
    proto.addEventListener = function (this: LegacyMQL, type: string, cb: unknown) {
      if (type === 'change') this.addListener(cb);
    };
    proto.removeEventListener = function (this: LegacyMQL, type: string, cb: unknown) {
      if (type === 'change') this.removeListener(cb);
    };
  }

  const probe = document.createElement('div');
  probe.style.cssText = 'display:flex;gap:1px;position:absolute;visibility:hidden';
  probe.appendChild(document.createElement('i'));
  probe.appendChild(document.createElement('i'));
  document.body.appendChild(probe);
  if (probe.scrollWidth < 1) document.documentElement.classList.add('no-flexgap');
  probe.remove();
}

// Mode borne murale (`?kiosk`) : recharge silencieusement chaque nuit à 4h
// pour purger la mémoire des vieux Safari qui fuient sur les longues sessions.
if (new URLSearchParams(location.search).has('kiosk')) {
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 4 && now.getMinutes() === 0) location.reload();
  }, 60_000);
}

ensureLegacySupport().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <HAProvider>
        <App />
      </HAProvider>
    </StrictMode>,
  );
});
