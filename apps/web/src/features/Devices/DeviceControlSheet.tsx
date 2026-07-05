import React, { useRef, useState } from 'react';
import { Power, Lightbulb } from 'lucide-react';
import { Modal } from '../../ui/Modal/Modal';
import { useHA } from '../../context/HAContext';
import { useDeviceControls } from '../../core/store/useDeviceControls';
import { cn } from '../../utils';

// Palette proposée (envoyée en rgb pour marcher quel que soit le mode couleur)
const COLOR_PRESETS: Array<{ name: string; rgb: [number, number, number]; hex: string }> = [
  { name: 'Blanc chaud', rgb: [255, 214, 170], hex: '#ffd6aa' },
  { name: 'Blanc', rgb: [255, 255, 255], hex: '#ffffff' },
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

export function DeviceControlSheet() {
  const { openId, close } = useDeviceControls();
  const { connection, entities } = useHA();
  const entity = openId ? entities[openId] : undefined;

  // Position locale du curseur pendant le glissement (avant commit HA)
  const [dragBrightness, setDragBrightness] = useState<number | null>(null);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!entity || !openId) return <Modal isOpen={false} onClose={close} title=""><div /></Modal>;

  const attrs = entity.attributes as Record<string, unknown>;
  const isOn = entity.state === 'on';
  const name = (attrs.friendly_name as string) ?? openId;
  const colorModes = (attrs.supported_color_modes as string[]) ?? [];
  const dimmable = colorModes.some((m) => DIMMABLE_MODES.includes(m));
  const colorable = colorModes.some((m) => COLOR_MODES.includes(m));
  const brightnessPct =
    dragBrightness ?? (typeof attrs.brightness === 'number' ? Math.round((attrs.brightness / 255) * 100) : isOn ? 100 : 0);
  const currentRgb = (attrs.rgb_color as [number, number, number]) ?? null;

  const callLight = (data: Record<string, unknown>) =>
    connection?.sendMessagePromise({
      type: 'call_service',
      domain: 'light',
      service: 'turn_on',
      target: { entity_id: openId },
      service_data: data,
    });

  const togglePower = () =>
    connection?.sendMessagePromise({
      type: 'call_service',
      domain: 'light',
      service: isOn ? 'turn_off' : 'turn_on',
      target: { entity_id: openId },
    });

  // Retour visuel immédiat + commit HA débouncé (robuste au doigt comme à la souris)
  const onBrightnessChange = (pct: number) => {
    setDragBrightness(pct);
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => {
      callLight({ brightness_pct: pct });
      setDragBrightness(null);
    }, 300);
  };

  const isSameColor = (rgb: [number, number, number]) =>
    currentRgb && currentRgb[0] === rgb[0] && currentRgb[1] === rgb[1] && currentRgb[2] === rgb[2];

  return (
    <Modal isOpen={true} onClose={close} title={name} className="max-w-md">
      <div className="flex flex-col gap-8">
        {/* Interrupteur principal */}
        <button
          onClick={togglePower}
          className={cn(
            'flex items-center justify-between px-6 py-5 rounded-3xl transition-all',
            isOn ? 'bg-amber-500/15 text-amber-300' : 'bg-white/5 text-zinc-400'
          )}
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
          <div>
            <div className="flex justify-between mb-3">
              <span className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Power className="w-4 h-4" /> Luminosité
              </span>
              <span className="text-sm font-bold text-zinc-200">{brightnessPct}%</span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              value={brightnessPct}
              onChange={(e) => onBrightnessChange(Number(e.target.value))}
              className="w-full h-3 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-zinc-700 to-amber-400 accent-amber-400"
            />
          </div>
        )}

        {/* Couleurs */}
        {colorable && (
          <div>
            <span className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 block">Couleur</span>
            <div className="grid grid-cols-5 gap-3">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => callLight({ rgb_color: c.rgb })}
                  title={c.name}
                  className={cn(
                    'aspect-square rounded-2xl transition-all hover:scale-105',
                    isSameColor(c.rgb) ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-105' : ''
                  )}
                  style={{ backgroundColor: c.hex, border: c.hex === '#ffffff' ? '1px solid #52525b' : 'none' }}
                />
              ))}
            </div>
          </div>
        )}

        {!dimmable && !colorable && (
          <p className="text-sm text-zinc-500 text-center">
            Cette lumière ne gère que l'allumage.
          </p>
        )}
      </div>
    </Modal>
  );
}
