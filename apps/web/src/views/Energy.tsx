import React, { useState } from 'react';
import { Sun, Battery, Zap, Home, ArrowDown, ArrowUp, Plug, AlertTriangle, Leaf } from 'lucide-react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '../utils';
import { useHA } from '../context/HAContext';
import { ENERGY_LIVE, readPowerW } from '../config/energy';
import { useEnergyStats, EnergyRange } from '../hooks/useEnergyStats';
import { SolarPanels } from '../features/Energy/SolarPanels';
import { EnergyFlow } from '../features/Energy/EnergyFlow';

const RANGE_LABELS: Record<EnergyRange, string> = {
  day: 'Jour',
  week: 'Semaine',
  month: 'Mois',
  year: 'Année',
};

export function Energy() {
  const { entities, status } = useHA();
  const [timeRange, setTimeRange] = useState<EnergyRange>('day');
  const stats = useEnergyStats(timeRange);

  // ─── Temps réel ───────────────────────────────────────────
  const solarW = ENERGY_LIVE.solar.reduce((sum, s) => sum + readPowerW(entities, s), 0);
  const gridW = readPowerW(entities, ENERGY_LIVE.grid); // + import, - export
  const batteryW = ENERGY_LIVE.battery.reduce((sum, s) => sum + readPowerW(entities, s), 0); // + décharge

  const homeW = Math.max(0, solarW + gridW + batteryW);

  const isBatteryCharging = batteryW < -50;
  const isGridExporting = gridW < -50;
  const isGridImporting = gridW > 50;

  const socMain = parseFloat(entities[ENERGY_LIVE.batterySoc[0].id]?.state ?? '');
  const soc = Number.isNaN(socMain) ? null : Math.round(socMain);
  const batteries = ENERGY_LIVE.batterySoc
    .map((b) => {
      const value = parseFloat(entities[b.id]?.state ?? '');
      return Number.isNaN(value) ? null : { label: b.label, value: Math.round(value) };
    })
    .filter((b): b is { label: string; value: number } => b !== null);

  const liveSelfSufficiency =
    homeW > 0 ? Math.round(((homeW - Math.max(0, gridW)) / homeW) * 100) : null;

  const deviceMeters = ENERGY_LIVE.deviceMeters
    .map((d) => {
      const value = parseFloat(entities[d.id]?.state ?? '');
      return Number.isNaN(value) ? null : { label: d.label, watts: Math.round(value) };
    })
    .filter((d): d is { label: string; watts: number } => d !== null)
    .sort((a, b) => b.watts - a.watts);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-6 lg:p-12 pb-28 md:pb-12 bg-zinc-50 dark:bg-[#0a0a0a] transition-colors duration-300">
      <header className="mb-6 md:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Énergie
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2">
          Production, consommation et autonomie de la maison.
        </p>
      </header>

      {/* Bandeau proactif : objectif 0 € EDF */}
      {isGridImporting && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 px-5 py-4 rounded-2xl mb-6">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">
            La maison consomme actuellement <strong>{Math.round(gridW)} W depuis EDF</strong>.
            {soc !== null && soc > 15 && ' La batterie est disponible — un gros appareil vient peut-être de démarrer.'}
          </p>
        </div>
      )}
      {isGridExporting && (
        <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 px-5 py-4 rounded-2xl mb-6">
          <Leaf className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">
            Surplus de <strong>{Math.round(Math.abs(gridW))} W exporté</strong> — c'est le
            moment idéal pour lancer lave-linge, lave-vaisselle ou recharges.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* 1. Flux d'énergie */}
        <EnergyFlow
          solarW={solarW}
          gridW={gridW}
          batteryW={batteryW}
          homeW={homeW}
          soc={soc}
          connected={status === 'connected'}
        />

        {/* 2. Batteries */}
        <div className="bg-white dark:bg-zinc-800/50 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Batteries</h2>
              <span className={cn(
                "px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1",
                isBatteryCharging
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                  : batteryW > 50
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
              )}>
                {isBatteryCharging ? <ArrowDown className="w-3 h-3" /> : batteryW > 50 ? <ArrowUp className="w-3 h-3" /> : null}
                {isBatteryCharging ? 'En charge' : batteryW > 50 ? 'Décharge' : 'En attente'}
              </span>
            </div>

            {soc !== null ? (
              <div className="flex items-end gap-2 mb-6">
                <span className="text-5xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{soc}</span>
                <span className="text-2xl font-semibold text-zinc-500 mb-1">%</span>
              </div>
            ) : (
              <p className="text-zinc-500 mb-6">Niveau indisponible</p>
            )}

            {/* Jauge principale */}
            <div className="w-full h-24 bg-zinc-100 dark:bg-zinc-900 rounded-2xl p-2 relative overflow-hidden border border-zinc-200 dark:border-zinc-800 mb-4">
              <div
                className={cn(
                  "absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-in-out",
                  (soc ?? 0) > 20 ? "bg-emerald-500" : "bg-red-500"
                )}
                style={{ height: `${soc ?? 0}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                <div className="absolute top-0 left-0 right-0 h-1 bg-white/30"></div>
              </div>
            </div>

            {/* Détail par batterie */}
            <div className="flex flex-col gap-2">
              {batteries.map((b) => (
                <div key={b.label} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">{b.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", b.value > 20 ? "bg-emerald-500" : "bg-red-500")}
                        style={{ width: `${b.value}%` }}
                      />
                    </div>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 w-10 text-right">{b.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-6 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            {isBatteryCharging ? 'Charge en cours…' : batteryW > 50 ? 'Alimente la maison' : 'Prête'}
          </p>
        </div>
      </div>

      {/* 3. KPIs de la période */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-zinc-800/50 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-1">Autosuffisance ({RANGE_LABELS[timeRange].toLowerCase()})</p>
          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
            {stats.totals.selfSufficiency !== null ? `${Math.round(stats.totals.selfSufficiency * 100)}%` : liveSelfSufficiency !== null ? `${liveSelfSufficiency}%` : '--'}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-800/50 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-1">Production</p>
          <p className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">
            {stats.totals.solar.toFixed(1)} <span className="text-sm text-zinc-500">kWh</span>
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-800/50 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-1">Consommation</p>
          <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
            {stats.totals.consumption.toFixed(1)} <span className="text-sm text-zinc-500">kWh</span>
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-800/50 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-1">Import EDF</p>
          <p className={cn(
            "text-2xl font-semibold",
            stats.totals.gridImport > 0.05 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
          )}>
            {stats.totals.gridImport.toFixed(1)} <span className="text-sm text-zinc-500">kWh</span>
          </p>
        </div>
      </div>

      {/* 4. Détail par panneau solaire */}
      <SolarPanels />

      {/* 5. Graphique & 6. Mesures par appareil */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-zinc-800/50 p-4 sm:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Bilan énergétique</h2>

            <div className="flex bg-zinc-100 dark:bg-zinc-900/50 p-1 rounded-full self-start sm:self-auto border border-zinc-200 dark:border-zinc-800">
              {(Object.keys(RANGE_LABELS) as EnergyRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={cn(
                    "px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300",
                    timeRange === range
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                >
                  {RANGE_LABELS[range]}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[250px] sm:h-[300px] w-full min-w-0">
            {stats.loading && (
              <div className="h-full flex items-center justify-center text-zinc-500 animate-pulse">
                Chargement de l'historique…
              </div>
            )}
            {!stats.loading && stats.error && (
              <div className="h-full flex items-center justify-center text-zinc-500 text-sm text-center px-6">
                Historique indisponible : {stats.error}
              </div>
            )}
            {!stats.loading && !stats.error && stats.points.length === 0 && (
              <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                Pas encore de données pour cette période.
              </div>
            )}
            {!stats.loading && !stats.error && stats.points.length > 0 && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <ComposedChart data={stats.points} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EAB308" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#EAB308" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCons" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.2} />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} dy={10} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} unit="" />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} domain={[0, 100]} hide />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: number, name: string) =>
                      name === 'Batterie (%)' ? [`${value} %`, name] : [`${value} kWh`, name]
                    }
                  />
                  <Area yAxisId="left" type="monotone" dataKey="solar" name="Solaire" stroke="#EAB308" strokeWidth={2} fillOpacity={1} fill="url(#colorSolar)" />
                  <Area yAxisId="left" type="monotone" dataKey="consumption" name="Conso" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorCons)" />
                  <Line yAxisId="right" type="monotone" dataKey="soc" name="Batterie (%)" stroke="#22C55E" strokeWidth={2} dot={false} strokeDasharray="5 5" connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800/50 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Mesures par appareil</h2>
          <p className="text-xs text-zinc-500 mb-4">Prises connectées avec mesure de puissance.</p>
          <div className="flex flex-col gap-4">
            {deviceMeters.length === 0 && (
              <p className="text-sm text-zinc-500">
                Aucune prise mesurée détectée. Ajoutez des prises connectées (Shelly Plug…)
                dans <code>config/energy.ts</code> pour suivre vos appareils.
              </p>
            )}
            {deviceMeters.map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    item.watts > 5 ? "bg-blue-100 dark:bg-blue-900/30 text-blue-500" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                  )}>
                    <Zap className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{item.label}</span>
                </div>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{item.watts} W</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
