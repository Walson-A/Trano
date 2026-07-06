import React from 'react';
import { Droplets, Fan, Flame, Minus, Plus, Power, RotateCw, Snowflake, SunSnow, Thermometer } from 'lucide-react';
import { Modal } from '../../ui/Modal/Modal';
import { useHA } from '../../context/HAContext';
import { cn } from '../../utils';
import { useOptimistic, type SheetProps } from './useOptimistic';
import { Section, StatusBadge, statusLine } from './SheetKit';

const MODES: Record<string, { label: string; icon: React.ReactNode; activeCls: string }> = {
  off: { label: 'Éteint', icon: <Power className="w-4 h-4" />, activeCls: 'bg-zinc-600/30 border-zinc-500 text-zinc-200' },
  heat: { label: 'Chauffage', icon: <Flame className="w-4 h-4" />, activeCls: 'bg-amber-500/15 border-amber-500/50 text-amber-400' },
  cool: { label: 'Climatisation', icon: <Snowflake className="w-4 h-4" />, activeCls: 'bg-sky-500/15 border-sky-500/50 text-sky-400' },
  heat_cool: { label: 'Chaud/Froid', icon: <SunSnow className="w-4 h-4" />, activeCls: 'bg-violet-500/15 border-violet-500/50 text-violet-400' },
  auto: { label: 'Auto', icon: <RotateCw className="w-4 h-4" />, activeCls: 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400' },
  dry: { label: 'Déshumidif.', icon: <Droplets className="w-4 h-4" />, activeCls: 'bg-teal-500/15 border-teal-500/50 text-teal-400' },
  fan_only: { label: 'Ventilation', icon: <Fan className="w-4 h-4" />, activeCls: 'bg-cyan-500/15 border-cyan-500/50 text-cyan-400' },
};

interface Optimistic {
  targetTemp?: number;
  mode?: string;
}

export function ClimateSheet({ entityId, entity, onClose }: SheetProps) {
  const { connection } = useHA();
  const { opt, status, call, debouncedCall } = useOptimistic<Optimistic>(entityId, connection);

  const attrs = entity.attributes as Record<string, unknown>;
  const name = (attrs.friendly_name as string) ?? entityId;
  const hvacModes = (attrs.hvac_modes as string[]) ?? [];
  const minT = (attrs.min_temp as number) ?? 7;
  const maxT = (attrs.max_temp as number) ?? 35;
  const step = (attrs.target_temp_step as number) ?? 0.5;

  const mode = opt.mode ?? entity.state;
  const isOff = mode === 'off';
  const current = typeof attrs.current_temperature === 'number' ? attrs.current_temperature : null;
  const target = opt.targetTemp ?? (typeof attrs.temperature === 'number' ? attrs.temperature : null);

  const adjust = (delta: number) => {
    if (target === null) return;
    const t = Math.round(Math.min(maxT, Math.max(minT, target + delta)) * 10) / 10;
    // Débounce long : on peut tapoter +/+/+ et n'envoyer que la valeur finale
    debouncedCall('temp', 'climate', 'set_temperature', entityId, { temperature: t }, { targetTemp: t }, 700);
  };
  const setMode = (m: string) => call('climate', 'set_hvac_mode', entityId, { hvac_mode: m }, { mode: m });

  const accent = mode === 'heat' ? 'text-amber-400' : mode === 'cool' ? 'text-sky-400' : 'text-zinc-100';

  return (
    <Modal isOpen={true} onClose={onClose} title={name} className="max-w-md">
      <div className="flex flex-col gap-7">
        {/* En-tête : témoin + état */}
        <div className="flex items-center gap-4 px-2">
          <div className="relative shrink-0">
            <div className={cn('w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-300',
              !isOff ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-800 text-zinc-500')}>
              <Thermometer className="w-7 h-7" />
            </div>
            <StatusBadge status={status} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-lg text-white">{MODES[mode]?.label ?? mode}</p>
            <p className="text-sm text-zinc-500">
              {statusLine(status) ?? (current !== null ? `Actuellement ${current.toFixed(1)}°C` : ' ')}
            </p>
          </div>
        </div>

        {/* Température cible : − / valeur / + */}
        {target !== null && (
          <div className="flex items-center justify-center gap-6">
            <button onClick={() => adjust(-step)} aria-label="Baisser la température"
              className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 active:scale-90 transition-transform">
              <Minus className="w-6 h-6" />
            </button>
            <div className="text-center w-32">
              <p className={cn('text-5xl font-bold tabular-nums tracking-tight', accent)}>
                {target.toFixed(1).replace(/\.0$/, '')}°
              </p>
              <p className="text-[11px] uppercase tracking-wider text-zinc-500 mt-1">Consigne</p>
            </div>
            <button onClick={() => adjust(step)} aria-label="Monter la température"
              className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 active:scale-90 transition-transform">
              <Plus className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Modes HVAC disponibles */}
        {hvacModes.length > 0 && (
          <Section icon={<Fan className="w-4 h-4" />} label="Mode">
            <div className="grid grid-cols-2 gap-2">
              {hvacModes.map((m) => {
                const def = MODES[m] ?? { label: m, icon: <Fan className="w-4 h-4" />, activeCls: 'bg-white/10 border-white/30 text-white' };
                return (
                  <button key={m} onClick={() => setMode(m)}
                    className={cn('flex items-center gap-2 px-4 py-3 rounded-2xl border text-sm font-medium transition-all active:scale-95',
                      mode === m ? def.activeCls : 'bg-white/5 border-white/10 text-zinc-400')}>
                    {def.icon} {def.label}
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {target === null && hvacModes.length === 0 && (
          <p className="text-sm text-zinc-500 text-center">Cet appareil n'expose aucune commande.</p>
        )}
      </div>
    </Modal>
  );
}
