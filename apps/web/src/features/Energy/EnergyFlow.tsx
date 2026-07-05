import React from 'react';
import { Sun, Battery, Home, Plug, Leaf, AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '../../utils';

interface EnergyFlowProps {
  solarW: number;
  gridW: number; // + import, - export
  batteryW: number; // + décharge (vers maison), - charge
  homeW: number;
  soc: number | null;
  connected: boolean;
}

interface FlowItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  watts: number;
  detail?: string; // ex. le % de la batterie
  color: string;
}

const kw = (w: number) => `${(Math.abs(w) / 1000).toFixed(1)} kW`;

/** Flèche portant la valeur du flux qui la traverse (chevrons animés). */
function Arrow({ color, watts }: { color: string; watts: number }) {
  return (
    <div className="flex flex-col items-center justify-center shrink-0 gap-1">
      <span className="text-xs font-bold" style={{ color }}>{kw(watts)}</span>
      <div className="flex items-center">
        {[0, 1, 2].map((i) => (
          <ChevronRight key={i} className="w-4 h-4 -ml-1.5 animate-pulse"
            style={{ color, animationDelay: `${i * 0.2}s`, opacity: 0.4 + i * 0.25 }} />
        ))}
      </div>
    </div>
  );
}

const Chip: React.FC<{ item: FlowItem }> = ({ item }) => {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${item.color}22`, color: item.color }}>
        {item.icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight text-zinc-800 dark:text-zinc-100">{item.label}</p>
        {item.detail && <p className="text-[11px] text-zinc-500 leading-tight">{item.detail}</p>}
      </div>
    </div>
  );
};

export function EnergyFlow({ solarW, gridW, batteryW, homeW, soc, connected }: EnergyFlowProps) {
  const importing = gridW > 50;
  const exporting = gridW < -50;
  const charging = batteryW < -50;
  const discharging = batteryW > 50;

  const banner = importing
    ? { icon: <AlertTriangle className="w-5 h-5" />, text: `La maison puise ${Math.round(gridW)} W sur EDF`, cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50' }
    : exporting
      ? { icon: <Leaf className="w-5 h-5" />, text: `100% autonome — ${Math.round(Math.abs(gridW))} W renvoyés au réseau`, cls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50' }
      : { icon: <Leaf className="w-5 h-5" />, text: 'La maison tourne sur le solaire et la batterie', cls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50' };

  const socTxt = soc !== null ? `${soc}%` : undefined;

  // Ce qui ALIMENTE la maison (gauche)
  const sources: FlowItem[] = [];
  if (solarW > 50) sources.push({ key: 'sol', icon: <Sun className="w-5 h-5" />, label: 'Solaire', watts: solarW, color: '#eab308' });
  if (discharging) sources.push({ key: 'batd', icon: <Battery className="w-5 h-5" />, label: 'Batterie', watts: batteryW, detail: socTxt, color: '#22c55e' });
  if (importing) sources.push({ key: 'edf', icon: <Plug className="w-5 h-5" />, label: 'Réseau EDF', watts: gridW, color: '#f59e0b' });

  // Où va le SURPLUS (droite)
  const sinks: FlowItem[] = [];
  if (exporting) sinks.push({ key: 'exp', icon: <Plug className="w-5 h-5" />, label: 'Export réseau', watts: gridW, color: '#10b981' });
  if (charging) sinks.push({ key: 'batc', icon: <Battery className="w-5 h-5" />, label: 'Charge batterie', watts: batteryW, detail: socTxt, color: '#22c55e' });

  const sourcesW = sources.reduce((s, x) => s + Math.abs(x.watts), 0);
  const sinksW = sinks.reduce((s, x) => s + Math.abs(x.watts), 0);

  return (
    <div className="lg:col-span-2 bg-white dark:bg-zinc-800/50 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 flex flex-col">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Flux en direct</h2>

      <div className={cn('flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border text-sm font-medium mb-6', banner.cls)}>
        {banner.icon}
        <span>{banner.text}</span>
      </div>

      {/* Flux : sources → maison → surplus (se lit de gauche à droite) */}
      <div className="flex items-stretch justify-center gap-3 sm:gap-4 flex-1 my-auto flex-wrap">
        {sources.length > 0 && (
          <>
            <div className="flex flex-col justify-center gap-2">
              {sources.map((s) => <Chip key={s.key} item={s} />)}
            </div>
            <Arrow color="#eab308" watts={sourcesW} />
          </>
        )}

        {/* Maison */}
        <div className="flex flex-col items-center justify-center px-2">
          <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border-2 border-blue-500 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-[0_0_25px_rgba(59,130,246,0.2)]">
            <Home className="w-9 h-9" />
          </div>
          <p className="text-lg font-bold mt-2 text-blue-600 dark:text-blue-400">{kw(homeW)}</p>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Consomme</p>
        </div>

        {sinks.length > 0 && (
          <>
            <Arrow color="#10b981" watts={sinksW} />
            <div className="flex flex-col justify-center gap-2">
              {sinks.map((s) => <Chip key={s.key} item={s} />)}
            </div>
          </>
        )}
      </div>

      {/* Batterie au repos : rappel discret (sinon elle est déjà en chip) */}
      {!charging && !discharging && (
        <div className="flex items-center justify-center gap-2 mt-5 text-sm text-zinc-500">
          <Battery className="w-4 h-4" />
          <span>Batterie {soc !== null ? `${soc}%` : '--'} · au repos</span>
        </div>
      )}

      {!connected && <p className="text-sm text-zinc-500 mt-3 text-center">Home Assistant déconnecté — valeurs indisponibles.</p>}
    </div>
  );
}
