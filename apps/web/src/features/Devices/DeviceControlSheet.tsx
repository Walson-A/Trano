import React, { useRef, useState } from 'react';
import { Lightbulb, Palette, Sun, Sparkles } from 'lucide-react';
import { Modal } from '../../ui/Modal/Modal';
import { useHA } from '../../context/HAContext';
import { useDeviceControls } from '../../core/store/useDeviceControls';
import { cn } from '../../utils';

// Couleurs pures proposées (envoyées en rgb — marche pour hs/rgb/xy)
const COLOR_PRESETS: Array<{ name: string; rgb: [number, number, number]; hex: string }> = [
  { name: 'Rouge', rgb: [239, 68, 68], hex: '#ef4444' },
  { name: 'Orange', rgb: [249, 115, 22], hex: '#f97316' },
  { name: 'Jaune', rgb: [234, 179, 8], hex: '#eab308' },
  { name: 'Vert', rgb: [34, 197, 94], hex: '#22c55e' },
  { name: 'Cyan', rgb: [6, 182, 212], hex: '#06b6d4' },
  { name: 'Bleu', rgb: [59, 130, 246], hex: '#3b82f6' },
  { name: 'Violet', rgb: [168, 85, 247], hex: '#a855f7' },
  { name: 'Rose', rgb: [236, 72, 153], hex: '#ec4899' },
];

const DIMMABLE_MODES = ['brightness', 'color_temp', 'hs', 'rgb', 'rgbw', 'rgbww', 'xy', 'white'];
const COLOR_MODES = ['hs', 'rgb', 'rgbw', 'rgbww', 'xy'];

/** Petit slider avec commit HA débouncé (robuste au doigt comme à la souris). */
function useDebouncedCommit() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (fn: () => void) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(fn, 300);
  };
}

export function DeviceControlSheet() {
  const { openId, close } = useDeviceControls();
  const { connection, entities } = useHA();
  const entity = openId ? entities[openId] : undefined;

  const [dragBrightness, setDragBrightness] = useState<number | null>(null);
  const [dragKelvin, setDragKelvin] = useState<number | null>(null);
  const commit = useDebouncedCommit();

  if (!entity || !openId) return <Modal isOpen={false} onClose={close} title=""><div /></Modal>;

  const attrs = entity.attributes as Record<string, unknown>;
  const isOn = entity.state === 'on';
  const name = (attrs.friendly_name as string) ?? openId;

  // ── Capacités déclarées par HA ────────────────────────────
  const colorModes = (attrs.supported_color_modes as string[]) ?? [];
  const dimmable = colorModes.some((m) => DIMMABLE_MODES.includes(m));
  const colorable = colorModes.some((m) => COLOR_MODES.includes(m));
  const hasColorTemp = colorModes.includes('color_temp');
  const effectList = (attrs.effect_list as string[]) ?? [];
  const minK = (attrs.min_color_temp_kelvin as number) ?? 2200;
  const maxK = (attrs.max_color_temp_kelvin as number) ?? 6500;

  // ── État courant ──────────────────────────────────────────
  const brightnessPct =
    dragBrightness ?? (typeof attrs.brightness === 'number' ? Math.round((attrs.brightness / 255) * 100) : isOn ? 100 : 0);
  const kelvin = dragKelvin ?? (typeof attrs.color_temp_kelvin === 'number' ? attrs.color_temp_kelvin : Math.round((minK + maxK) / 2));
  const currentRgb = (attrs.rgb_color as [number, number, number]) ?? null;
  const inColorMode = attrs.color_mode !== 'color_temp';
  const currentEffect = (attrs.effect as string) ?? null;

  // ── Actions ───────────────────────────────────────────────
  const callLight = (data: Record<string, unknown>) =>
    connection?.sendMessagePromise({
      type: 'call_service', domain: 'light', service: 'turn_on',
      target: { entity_id: openId }, service_data: data,
    });
  const togglePower = () =>
    connection?.sendMessagePromise({
      type: 'call_service', domain: 'light', service: isOn ? 'turn_off' : 'turn_on',
      target: { entity_id: openId },
    });

  const onBrightness = (pct: number) => {
    setDragBrightness(pct);
    commit(() => { callLight({ brightness_pct: pct }); setDragBrightness(null); });
  };
  const onKelvin = (k: number) => {
    setDragKelvin(k);
    commit(() => { callLight({ color_temp_kelvin: k }); setDragKelvin(null); });
  };

  const isSameColor = (rgb: [number, number, number]) =>
    inColorMode && currentRgb && Math.abs(currentRgb[0] - rgb[0]) < 25 && Math.abs(currentRgb[1] - rgb[1]) < 25 && Math.abs(currentRgb[2] - rgb[2]) < 25;

  const Section = ({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) => (
    <div>
      <span className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
        {icon} {label}
      </span>
      {children}
    </div>
  );

  return (
    <Modal isOpen={true} onClose={close} title={name} className="max-w-md">
      <div className="flex flex-col gap-7">
        {/* Interrupteur */}
        <button
          onClick={togglePower}
          className={cn('flex items-center justify-between px-6 py-5 rounded-3xl transition-all',
            isOn ? 'bg-amber-500/15 text-amber-300' : 'bg-white/5 text-zinc-400')}
        >
          <span className="flex items-center gap-3 font-semibold text-lg">
            <Lightbulb className={cn('w-6 h-6', isOn && 'fill-current')} />
            {isOn ? 'Allumée' : 'Éteinte'}
          </span>
          <div className={cn('w-14 h-8 rounded-full relative transition-colors', isOn ? 'bg-amber-500' : 'bg-zinc-700')}>
            <div className={cn('absolute top-1 w-6 h-6 rounded-full bg-white transition-all', isOn ? 'left-7' : 'left-1')} />
          </div>
        </button>

        {/* Luminosité */}
        {dimmable && (
          <Section icon={<Sun className="w-4 h-4" />} label={`Luminosité — ${brightnessPct}%`}>
            <input
              type="range" min={1} max={100} value={brightnessPct}
              onChange={(e) => onBrightness(Number(e.target.value))}
              className="w-full h-3 rounded-full appearance-none cursor-pointer accent-amber-400"
              style={{ background: 'linear-gradient(to right, #3f3f46, #fbbf24)' }}
            />
          </Section>
        )}

        {/* Température de blanc (chaud ↔ froid) */}
        {hasColorTemp && (
          <Section icon={<Sun className="w-4 h-4" />} label="Blanc — chaud ↔ froid">
            <input
              type="range" min={minK} max={maxK} step={50} value={kelvin}
              onChange={(e) => onKelvin(Number(e.target.value))}
              className="w-full h-3 rounded-full appearance-none cursor-pointer"
              style={{ background: 'linear-gradient(to right, #ff9d3c, #fff6e6, #cfe4ff)' }}
            />
            <div className="flex justify-between text-[11px] text-zinc-500 mt-1">
              <span>{minK} K</span><span>{Math.round(kelvin)} K</span><span>{maxK} K</span>
            </div>
          </Section>
        )}

        {/* Couleurs */}
        {colorable && (
          <Section icon={<Palette className="w-4 h-4" />} label="Couleur">
            <div className="grid grid-cols-8 gap-2.5">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.name} onClick={() => callLight({ rgb_color: c.rgb })} title={c.name}
                  className={cn('aspect-square rounded-xl transition-all hover:scale-110',
                    isSameColor(c.rgb) ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110' : '')}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </Section>
        )}

        {/* Effets (uniquement si la lampe en propose) */}
        {effectList.length > 0 && (
          <Section icon={<Sparkles className="w-4 h-4" />} label={`Effets (${effectList.length})`}>
            <select
              value={currentEffect ?? ''}
              onChange={(e) => e.target.value && callLight({ effect: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-white/30 cursor-pointer"
            >
              <option value="" disabled>Choisir un effet…</option>
              {effectList.map((eff) => (
                <option key={eff} value={eff}>{eff}</option>
              ))}
            </select>
          </Section>
        )}

        {!dimmable && !colorable && !hasColorTemp && (
          <p className="text-sm text-zinc-500 text-center">Cette lumière ne gère que l'allumage.</p>
        )}
      </div>
    </Modal>
  );
}
