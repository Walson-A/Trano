import React, { useState } from 'react';
import { Sun, Battery, Zap, Home, Activity, ArrowDown, ArrowUp, Plug } from 'lucide-react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '../utils';
import { useHA } from '../context/HAContext';

const energyData = {
  // ... (keeping energyData as is for the chart)
  day: {
    label: "Aujourd'hui",
    unit: "kWh",
    kpis: { selfSufficiency: 98, production: 14.2, consumption: 10.5, grid: 0.2 },
    chart: [
      { time: '00:00', solar: 0, consumption: 0.5, battery: 45 },
      { time: '04:00', solar: 0, consumption: 0.4, battery: 30 },
      { time: '08:00', solar: 1.2, consumption: 0.8, battery: 25 },
      { time: '12:00', solar: 4.5, consumption: 1.2, battery: 60 },
      { time: '16:00', solar: 3.0, consumption: 1.5, battery: 100 },
      { time: '20:00', solar: 0, consumption: 2.5, battery: 85 },
      { time: '24:00', solar: 0, consumption: 0.6, battery: 65 },
    ]
  },
  week: {
    label: "Cette semaine",
    unit: "kWh",
    kpis: { selfSufficiency: 85, production: 95.5, consumption: 110.2, grid: 15.4 },
    chart: [
      { time: 'Lun', solar: 12, consumption: 15, battery: 60 },
      { time: 'Mar', solar: 15, consumption: 14, battery: 80 },
      { time: 'Mer', solar: 18, consumption: 16, battery: 100 },
      { time: 'Jeu', solar: 10, consumption: 15, battery: 40 },
      { time: 'Ven', solar: 14, consumption: 18, battery: 70 },
      { time: 'Sam', solar: 20, consumption: 22, battery: 100 },
      { time: 'Dim', solar: 19, consumption: 20, battery: 90 },
    ]
  },
  month: {
    label: "Ce mois",
    unit: "kWh",
    kpis: { selfSufficiency: 72, production: 420.5, consumption: 580.0, grid: 165.2 },
    chart: [
      { time: 'Sem 1', solar: 90, consumption: 140, battery: 50 },
      { time: 'Sem 2', solar: 110, consumption: 150, battery: 70 },
      { time: 'Sem 3', solar: 105, consumption: 145, battery: 65 },
      { time: 'Sem 4', solar: 115, consumption: 145, battery: 80 },
    ]
  },
  year: {
    label: "Cette année",
    unit: "MWh",
    kpis: { selfSufficiency: 65, production: 4.85, consumption: 7.20, grid: 2.40 },
    chart: [
      { time: 'Jan', solar: 150, consumption: 800, battery: 20 },
      { time: 'Mar', solar: 350, consumption: 600, battery: 50 },
      { time: 'Mai', solar: 600, consumption: 450, battery: 90 },
      { time: 'Jui', solar: 750, consumption: 450, battery: 100 },
      { time: 'Sep', solar: 550, consumption: 500, battery: 80 },
      { time: 'Nov', solar: 200, consumption: 750, battery: 30 },
    ]
  }
};

const topConsumers = [
  { name: 'Pompe à chaleur', power: 1200, icon: Activity, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  { name: 'Réfrigérateur', power: 150, icon: Zap, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  { name: 'Télévision', power: 100, icon: Zap, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  { name: 'Lumières', power: 50, icon: Sun, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
];

export function Energy() {
  const { entities } = useHA();
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const currentData = energyData[timeRange];

  // Real-time Power Data
  const solarPower = 0; // Missing sensor
  const gridPowerRaw = parseFloat(entities['sensor.shellypro3em_ac15187b3e18_puissance']?.state || '0');
  const batPower1 = parseFloat(entities['sensor.bat_power']?.state || '0');
  const batPower2 = parseFloat(entities['sensor.bat_power_2']?.state || '0');
  const batPowerTotal = batPower1 + batPower2;
  const soc = Math.round(parseFloat(entities['sensor.soc']?.state || '0'));
  
  // Calculations
  const gridPower = gridPowerRaw / 1000; // kW
  const batPower = batPowerTotal / 1000; // kW
  const homePower = solarPower + gridPower + batPower;

  const isBatteryCharging = batPower < 0;
  const isGridExporting = gridPower < 0;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-6 lg:p-12 pb-28 md:pb-12 bg-zinc-50 dark:bg-[#0a0a0a] transition-colors duration-300">
      <header className="mb-8 md:mb-10">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Énergie
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2">
          Aperçu en temps réel de votre production et consommation.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* 1. Flux d'énergie */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-800/50 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center min-h-[350px]">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 self-start mb-4">Flux en direct</h2>
          
          <div className="relative w-full max-w-sm aspect-square my-auto">
            {/* SVG Lines */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              {/* Solar to Center */}
              <line x1="50" y1="20" x2="50" y2="50" stroke="#EAB308" strokeWidth="2" strokeDasharray="4 4" className={cn("animate-flow", solarPower <= 0 && "opacity-20")} />
              {/* Center to Home */}
              <line x1="50" y1="50" x2="80" y2="50" stroke="#3B82F6" strokeWidth="2" strokeDasharray="4 4" className="animate-flow" />
              {/* Center to Battery */}
              <line 
                x1="50" y1="50" x2="50" y2="80" 
                stroke="#22C55E" strokeWidth="2" strokeDasharray="4 4" 
                className={cn("animate-flow", isBatteryCharging ? "animate-flow-reverse" : "")} 
              />
              {/* Grid to Center */}
              <line 
                x1="20" y1="50" x2="50" y2="50" 
                stroke="#6B7280" strokeWidth="2" strokeDasharray="4 4" 
                className={cn("animate-flow", isGridExporting ? "animate-flow-reverse" : "", Math.abs(gridPower) < 0.01 && "opacity-20")} 
              />
            </svg>
            
            {/* Center Node */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-600 z-0"></div>

            {/* Solar (Top) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center bg-white dark:bg-zinc-800 p-2 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-700">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center z-10 border-2 shadow-[0_0_15px_rgba(234,179,8,0.3)]",
                solarPower > 0 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-500 border-yellow-500" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-300 dark:border-zinc-700"
              )}>
                <Sun className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold mt-2 text-yellow-600 dark:text-yellow-400">{solarPower.toFixed(1)} kW</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Solaire</span>
            </div>

            {/* Battery (Bottom) */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center bg-white dark:bg-zinc-800 p-2 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-700">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Batterie</span>
              <span className="text-sm font-bold mb-2 text-emerald-600 dark:text-emerald-400">{Math.abs(batPower).toFixed(1)} kW</span>
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center z-10 border-2 shadow-[0_0_15px_rgba(34,197,94,0.3)]",
                Math.abs(batPower) > 0.05 ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 border-emerald-500" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-300 dark:border-zinc-700"
              )}>
                <Battery className="w-6 h-6" />
              </div>
            </div>

            {/* Grid (Left) */}
            <div className={cn(
              "absolute top-1/2 left-0 -translate-y-1/2 flex flex-col items-center bg-white dark:bg-zinc-800 p-2 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-700",
              Math.abs(gridPower) < 0.01 && "opacity-60"
            )}>
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center z-10 border-2",
                Math.abs(gridPower) > 0.05 ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-200 border-zinc-500 shadow-[0_0_10px_rgba(0,0,0,0.1)]" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-300 dark:border-zinc-700"
              )}>
                <Plug className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold mt-2 text-zinc-600 dark:text-zinc-400">{Math.abs(gridPower).toFixed(1)} kW</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{isGridExporting ? 'Export' : 'Réseau'}</span>
            </div>

            {/* Home (Right) */}
            <div className="absolute top-1/2 right-0 -translate-y-1/2 flex flex-col items-center bg-white dark:bg-zinc-800 p-2 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-700">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center z-10 border-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                <Home className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold mt-2 text-blue-600 dark:text-blue-400">{homePower.toFixed(1)} kW</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Maison</span>
            </div>
          </div>
        </div>

        {/* 2. Statut Batterie */}
        <div className="bg-white dark:bg-zinc-800/50 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Powerwall</h2>
              <span className={cn(
                "px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1",
                isBatteryCharging 
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" 
                  : batPower > 0.05 
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
              )}>
                {isBatteryCharging ? <ArrowDown className="w-3 h-3" /> : batPower > 0.05 ? <ArrowUp className="w-3 h-3" /> : null}
                {isBatteryCharging ? 'En charge' : batPower > 0.05 ? 'Déchargement' : 'En attente'}
              </span>
            </div>
            
            <div className="flex items-end gap-2 mb-6">
              <span className="text-5xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{soc}</span>
              <span className="text-2xl font-semibold text-zinc-500 mb-1">%</span>
            </div>

            {/* Battery Visual */}
            <div className="w-full h-32 bg-zinc-100 dark:bg-zinc-900 rounded-2xl p-2 relative overflow-hidden border border-zinc-200 dark:border-zinc-800">
              <div 
                className={cn(
                  "absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-in-out",
                  soc > 20 ? "bg-emerald-500" : "bg-red-500"
                )} 
                style={{ height: `${soc}%` }}
              >
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                <div className="absolute top-0 left-0 right-0 h-1 bg-white/30"></div>
              </div>
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between py-2 opacity-20">
                <div className="w-full border-t border-zinc-900 dark:border-white"></div>
                <div className="w-full border-t border-zinc-900 dark:border-white"></div>
                <div className="w-full border-t border-zinc-900 dark:border-white"></div>
                <div className="w-full border-t border-zinc-900 dark:border-white"></div>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-6 flex items-center gap-2">
            <Zap className="w-4 h-4" /> {isBatteryCharging ? 'Charge en cours...' : batPower > 0.05 ? 'Alimente la maison' : 'Prête'}
          </p>
        </div>
      </div>

      {/* 3. KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-zinc-800/50 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 transition-all duration-300">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-1">Autosuffisance</p>
          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{homePower > 0 ? Math.round(((homePower - Math.max(0, gridPower)) / homePower) * 100) : 100}%</p>
        </div>
        <div className="bg-white dark:bg-zinc-800/50 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 transition-all duration-300">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-1">Production (Live)</p>
          <p className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">{solarPower.toFixed(1)} <span className="text-sm text-zinc-500">kW</span></p>
        </div>
        <div className="bg-white dark:bg-zinc-800/50 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 transition-all duration-300">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-1">Consommation</p>
          <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{homePower.toFixed(1)} <span className="text-sm text-zinc-500">kW</span></p>
        </div>
        <div className="bg-white dark:bg-zinc-800/50 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 transition-all duration-300">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-1">Réseau (Import)</p>
          <p className="text-2xl font-semibold text-zinc-600 dark:text-zinc-400">{Math.max(0, gridPower).toFixed(1)} <span className="text-sm text-zinc-500">kW</span></p>
        </div>
      </div>

      {/* 4. Graphique & 5. Gros Consommateurs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-zinc-800/50 p-4 sm:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Bilan énergétique</h2>
            
            {/* Time Filter Toggle */}
            <div className="flex bg-zinc-100 dark:bg-zinc-900/50 p-1 rounded-full self-start sm:self-auto border border-zinc-200 dark:border-zinc-800">
              {(['day', 'week', 'month', 'year'] as const).map(range => (
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
                  {range === 'day' ? 'Jour' : range === 'week' ? 'Semaine' : range === 'month' ? 'Mois' : 'Année'}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-[250px] sm:h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <ComposedChart data={currentData.chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} domain={[0, 100]} hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area yAxisId="left" type="monotone" dataKey="solar" name="Solaire" stroke="#EAB308" strokeWidth={2} fillOpacity={1} fill="url(#colorSolar)" />
                <Area yAxisId="left" type="monotone" dataKey="consumption" name="Conso" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorCons)" />
                <Line yAxisId="right" type="monotone" dataKey="battery" name="Batterie (%)" stroke="#22C55E" strokeWidth={2} dot={false} strokeDasharray="5 5" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800/50 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-6">En cours d'utilisation</h2>
          <div className="flex flex-col gap-4">
            {topConsumers.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", item.bg, item.color)}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{item.name}</span>
                </div>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{item.power} W</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
