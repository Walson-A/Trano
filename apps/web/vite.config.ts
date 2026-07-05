import cascadeLayers from '@csstools/postcss-cascade-layers';
import oklabFunction from '@csstools/postcss-oklab-function';
import tailwindcss from '@tailwindcss/postcss';
import legacy from '@vitejs/plugin-legacy';
import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';
import path from 'path';
import { defineConfig } from 'vite';

// L'app doit tourner sur le vieil iPad mural (iOS 12, Safari 12) :
// - plugin-legacy : bundle transpilé + polyfills chargé uniquement par les
//   vieux navigateurs (les récents gardent le bundle moderne).
// - cascadeLayers : Safari < 15.4 ignore les blocs @layer — et Tailwind v4
//   met TOUT dedans. On aplatit les couches en spécificité équivalente.
// - cssTarget safari12 : abaisse les couleurs modernes (oklch…) en rgb.
const OLD_BROWSERS = ['defaults', 'iOS >= 12', 'Safari >= 12'];

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: OLD_BROWSERS,
      // Safari 12 passe le détecteur « moderne » de Vite (modules ES ok) :
      // il charge donc le bundle moderne, transpilé pour lui (modernTargets
      // inclut safari>=12) mais sans API récentes — d'où les polyfills.
      modernTargets: 'edge>=79, firefox>=67, chrome>=64, safari>=12',
      modernPolyfills: true,
    }),
  ],
  css: {
    postcss: {
      plugins: [
        tailwindcss(),
        // Les variables --color-* de Tailwind sont en oklch, illisible pour
        // Safari 12 : le plugin émet une valeur rgb + la version oklch dans
        // un @supports (les navigateurs récents gardent l'oklch).
        oklabFunction({ preserve: true }),
        cascadeLayers(),
        autoprefixer({ overrideBrowserslist: OLD_BROWSERS }),
      ],
    },
  },
  build: {
    cssTarget: 'safari12',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
