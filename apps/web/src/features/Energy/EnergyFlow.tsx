import React from 'react';
import { Sun, Battery, Home, Plug, Leaf, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils';

interface EnergyFlowProps {
  solarW: number;
  gridW: number; // + import, - export
  batteryW: number; // + décharge (vers maison), - charge
  homeW: number;
  soc: number | null;
  connected: boolean;
}

/** Un lien avec des points qui circulent dans le bon sens, épaisseur ∝ puissance. */
function Link({
  a, b, color, watts, direction,
}: {
  a: [number, number]; // côté source
  b: [number, number]; // côté maison
  color: string;
  watts: number;
  direction: 'toHouse' | 'fromHouse' | 'off';
}) {
  const active = direction !== 'off';
  const kw = Math.abs(watts) / 1000;
  const width = active ? Math.min(5, 1.6 + kw * 1.3) : 1;
  // Sens de circulation des points
  const [sx, sy] = direction === 'fromHouse' ? b : a;
  const [ex, ey] = direction === 'fromHouse' ? a : b;
  const path = `M ${sx} ${sy} L ${ex} ${ey}`;
  const dur = Math.max(1, 2.6 - kw * 0.25); // plus de puissance = plus rapide

  return (
    <g opacity={active ? 1 : 0.18}>
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={width} strokeLinecap="round" opacity={0.35} />
      {active &&
        [0, 1, 2].map((i) => (
          <circle key={i} r={width * 0.7 + 0.3} fill={color}>
            <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`-${(dur / 3) * i}s`} path={path} />
          </circle>
        ))}
    </g>
  );
}

export function EnergyFlow({ solarW, gridW, batteryW, homeW, soc, connected }: EnergyFlowProps) {
  const importing = gridW > 50;
  const exporting = gridW < -50;
  const charging = batteryW < -50;
  const discharging = batteryW > 50;

  // Statut en une phrase (le plus important, en un coup d'œil)
  const banner = importing
    ? { icon: <AlertTriangle className="w-5 h-5" />, text: `La maison puise ${Math.round(gridW)} W sur EDF`, cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50' }
    : exporting
      ? { icon: <Leaf className="w-5 h-5" />, text: `100% autonome — ${Math.round(Math.abs(gridW))} W renvoyés au réseau`, cls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50' }
      : { icon: <Leaf className="w-5 h-5" />, text: 'La maison tourne sur le solaire et la batterie', cls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50' };

  // Positions (viewBox 0..100). Maison au centre.
  const S = { color: '#eab308' }; // solaire
  const G = { color: importing ? '#f59e0b' : '#10b981' }; // réseau (amber import / vert export)
  const B = { color: '#22c55e' }; // batterie

  const Node = ({ pos, icon, label, value, sub, color, dim }: {
    pos: string; icon: React.ReactNode; label: string; value: string; sub?: string; color: string; dim?: boolean;
  }) => (
    <div className={cn('absolute flex flex-col items-center', pos, dim && 'opacity-45')}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center border-2 bg-white dark:bg-zinc-900"
        style={{ borderColor: color, color, boxShadow: dim ? 'none' : `0 0 16px ${color}44` }}>
        {icon}
      </div>
      <span className="text-sm font-bold mt-1.5" style={{ color }}>{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
      {sub && <span className="text-[10px] text-zinc-400">{sub}</span>}
    </div>
  );

  return (
    <div className="lg:col-span-2 bg-white dark:bg-zinc-800/50 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 flex flex-col">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Flux en direct</h2>

      {/* Bandeau statut */}
      <div className={cn('flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border text-sm font-medium mb-2', banner.cls)}>
        {banner.icon}
        <span>{banner.text}</span>
      </div>

      <div className="relative w-full max-w-md mx-auto aspect-square my-auto">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          {/* Solaire (haut) → maison */}
          <Link a={[50, 26]} b={[50, 38]} color={S.color} watts={solarW} direction={solarW > 50 ? 'toHouse' : 'off'} />
          {/* Réseau (gauche) ↔ maison */}
          <Link a={[26, 50]} b={[38, 50]} color={G.color} watts={gridW} direction={importing ? 'toHouse' : exporting ? 'fromHouse' : 'off'} />
          {/* Batterie (droite) ↔ maison */}
          <Link a={[74, 50]} b={[62, 50]} color={B.color} watts={batteryW} direction={discharging ? 'toHouse' : charging ? 'fromHouse' : 'off'} />
        </svg>

        {/* Maison au centre */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border-2 border-blue-500 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-[0_0_25px_rgba(59,130,246,0.25)]">
            <Home className="w-9 h-9" />
          </div>
          <span className="text-base font-bold mt-1.5 text-blue-600 dark:text-blue-400">{(homeW / 1000).toFixed(1)} kW</span>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Maison</span>
        </div>

        <Node pos="top-0 left-1/2 -translate-x-1/2" icon={<Sun className="w-6 h-6" />} label="Solaire" value={`${(solarW / 1000).toFixed(1)} kW`} color={S.color} dim={solarW <= 50} />
        <Node pos="left-0 top-1/2 -translate-y-1/2" icon={<Plug className="w-6 h-6" />} label={exporting ? 'Export' : 'EDF'} value={`${(Math.abs(gridW) / 1000).toFixed(1)} kW`} color={G.color} dim={!importing && !exporting} />
        <Node pos="right-0 top-1/2 -translate-y-1/2" icon={<Battery className="w-6 h-6" />} label="Batterie" value={`${(Math.abs(batteryW) / 1000).toFixed(1)} kW`} sub={soc !== null ? `${soc}%` : undefined} color={B.color} dim={Math.abs(batteryW) <= 50} />
      </div>

      {!connected && <p className="text-sm text-zinc-500 mt-3 text-center">Home Assistant déconnecté — valeurs indisponibles.</p>}
    </div>
  );
}
