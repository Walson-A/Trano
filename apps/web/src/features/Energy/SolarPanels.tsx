import React, { useState } from 'react';
import { Sun, ChevronDown, WifiOff } from 'lucide-react';
import { useHA } from '../../context/HAContext';
import { cn } from '../../utils';

interface PanelReading {
  id: string;
  label: string;
  watts: number | null; // null = hors ligne / inconnu
}

/**
 * Détail de production par panneau/onduleur.
 * - Toit : micro-onduleurs Enphase (sensor.inverter_*), 1 par panneau.
 * - Façade : les 2 entrées PV du Zendure Hyper 2000.
 * - Jardin : système Thony (si présent).
 */
export function SolarPanels() {
  const { entities } = useHA();
  const [open, setOpen] = useState(false);

  const readW = (id: string): number | null => {
    const e = entities[id];
    if (!e || e.state === 'unavailable' || e.state === 'unknown') return null;
    const v = parseFloat(e.state);
    return Number.isNaN(v) ? null : v;
  };

  // Toit : tous les micro-onduleurs Enphase
  const roof: PanelReading[] = Object.keys(entities)
    .filter((id) => /^sensor\.inverter_\d+$/.test(id))
    .sort()
    .map((id, i) => ({ id, label: `Panneau ${i + 1}`, watts: readW(id) }));

  const facade: PanelReading[] = [
    { id: 'sensor.hyper_2000_solar_power1', label: 'Façade PV1', watts: readW('sensor.hyper_2000_solar_power1') },
    { id: 'sensor.hyper_2000_solar_power2', label: 'Façade PV2', watts: readW('sensor.hyper_2000_solar_power2') },
  ].filter((p) => entities[p.id]);

  const garden: PanelReading[] = [
    { id: 'sensor.thony_pv_power', label: 'Jardin', watts: readW('sensor.thony_pv_power') },
  ].filter((p) => entities[p.id] && readW(p.id) !== null);

  const groups = [
    { title: 'Toit (Enphase)', panels: roof },
    { title: 'Façade (Zendure)', panels: facade },
    { title: 'Jardin', panels: garden },
  ].filter((g) => g.panels.length > 0);

  const allPanels = groups.flatMap((g) => g.panels);
  const online = allPanels.filter((p) => p.watts !== null);
  const offline = allPanels.filter((p) => p.watts === null);
  const total = online.reduce((s, p) => s + (p.watts ?? 0), 0);
  const maxW = Math.max(1, ...online.map((p) => p.watts ?? 0));

  if (allPanels.length === 0) return null;

  return (
    <div className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 mb-6">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 text-left">
        <div className="w-10 h-10 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 flex items-center justify-center shrink-0">
          <Sun className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Panneaux solaires</h2>
          <p className="text-xs text-zinc-500">
            {online.length} panneau{online.length > 1 ? 'x' : ''} en production · {Math.round(total)} W
            {offline.length > 0 && ` · ${offline.length} hors ligne`}
          </p>
        </div>
        <ChevronDown className={cn('w-5 h-5 text-zinc-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="mt-5 flex flex-col gap-5">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="text-xs uppercase tracking-wider text-zinc-500 font-medium mb-2">{group.title}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {group.panels.map((p) => (
                  <div
                    key={p.id}
                    className={cn(
                      'rounded-2xl px-3 py-2.5 border',
                      p.watts === null
                        ? 'bg-zinc-100/50 dark:bg-white/[0.02] border-zinc-200 dark:border-white/5 opacity-60'
                        : 'bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/5'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300 truncate">{p.label}</span>
                      {p.watts === null ? (
                        <WifiOff className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      ) : (
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 shrink-0">{Math.round(p.watts)} W</span>
                      )}
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-yellow-400 transition-all"
                        style={{ width: p.watts === null ? '0%' : `${Math.round(((p.watts ?? 0) / maxW) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {offline.length > 0 && (
            <p className="text-xs text-zinc-500">
              ⚠️ {offline.length} panneau{offline.length > 1 ? 'x' : ''} hors ligne — normal la nuit, à surveiller en journée.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
