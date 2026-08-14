/**
 * Le web est sur Tailwind 4, l'app native sur Tailwind 3 — NativeWind 4 n'a pas
 * encore rattrapé la v4. Sans conséquence sur l'apparence : les classes qu'on
 * recopie (`rounded-2xl`, `bg-zinc-900/60`, `border-zinc-200`…) n'ont pas changé
 * de nom entre les deux versions.
 *
 * Ce qui n'existe pas sur natif, en revanche : `hover:`, `group-hover:` et
 * `backdrop-blur`. Les vues reprises du web doivent s'en passer.
 */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
  },
  plugins: [],
};
