import React, { useRef, useState } from 'react';
import { Lightbulb, Palette, Sun, Sparkles } from 'lucide-react';
import { Modal } from '../../ui/Modal/Modal';
import { useHA } from '../../context/HAContext';
import { useDeviceControls } from '../../core/store/useDeviceControls';
import { cn } from '../../utils';

// Raccourcis couleur (une ligne, sous la roue) — pratique pour tout le monde
const QUICK_COLORS: Array<{ name: string; hs: [number, number]; hex: string }> = [
  { name: 'Rouge', hs: [0, 100], hex: '#ef4444' },
  { name: 'Orange', hs: [30, 100], hex: '#f97316' },
  { name: 'Jaune', hs: [50, 100], hex: '#eab308' },
  { name: 'Vert', hs: [140, 100], hex: '#22c55e' },
  { name: 'Cyan', hs: [190, 100], hex: '#06b6d4' },
  { name: 'Bleu', hs: [217, 100], hex: '#3b82f6' },
  { name: 'Violet', hs: [270, 100], hex: '#a855f7' },
  { name: 'Rose', hs: [330, 90], hex: '#ec4899' },
];

const DIMMABLE_MODES = ['brightness', 'color_temp', 'hs', 'rgb', 'rgbw', 'rgbww', 'xy', 'white'];
const COLOR_MODES = ['hs', 'rgb', 'rgbw', 'rgbww', 'xy'];

/** Commit HA débouncé (robuste au doigt comme à la souris). */
function useDebouncedCommit() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (fn: () => void) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(fn, 200);
  };
}

/**
 * Roue chromatique HSV : angle = teinte (0-360), distance au centre = saturation.
 * Renvoie [hue, saturation] à chaque déplacement (débouncé par le parent).
 */
function ColorWheel({ hue, saturation, onPick }: { hue: number; saturation: number; onPick: (hs: [number, number]) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  const handle = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const r = rect.width / 2;
    const h = (Math.atan2(dy, dx) * 180) / Math.PI; // 0 = est, sens horaire
    const hueDeg = (h + 360) % 360;
    const sat = Math.min(100, Math.round((Math.hypot(dx, dy) / r) * 100));
    onPick([Math.round(hueDeg), sat]);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handle(e.clientX, e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.buttons === 1 || e.pressure > 0) handle(e.clientX, e.clientY);
  };

  // Position du marqueur (est = teinte 0, sens horaire, y vers le bas)
  const rad = (hue * Math.PI) / 180;
  const dist = (saturation / 100) * 50; // % du rayon
  const markerX = 50 + dist * Math.cos(rad);
  const markerY = 50 + dist * Math.sin(rad);

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      className="relative mx-auto rounded-full cursor-pointer touch-none select-none"
      style={{
        width: 220,
        height: 220,
        background:
          'radial-gradient(circle at center, #fff 0%, transparent 70%), conic-gradient(from 90deg, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))',
      }}
    >
      <div
        className="absolute w-6 h-6 rounded-full border-[3px] border-white shadow-lg -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{ left: `${markerX}%`, top: `${markerY}%`, backgroundColor: `hsl(${hue}, ${saturation}%, 50%)` }}
      />
    </div>
  );
}

export function DeviceControlSheet() {
  const { openId, close } = useDeviceControls();
  const { connection, entities } = useHA();
  const entity = openId ? entities[openId] : undefined;

  const [dragBrightness, setDragBrightness] = useState<number | null>(null);
  const [dragKelvin, setDragKelvin] = useState<number | null>(null);
  const [dragHs, setDragHs] = useState<[number, number] | null>(null);
  // Un timer indépendant par contrôle (sinon ils s'annulent entre eux)
  const commitBright = useDebouncedCommit();
  const commitKelv = useDebouncedCommit();
  const commitHue = useDebouncedCommit();

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
  const inColorMode = attrs.color_mode !== 'color_temp';
  const currentHs = dragHs ?? (attrs.hs_color as [number, number]) ?? [0, 0];
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
    commitBright(() => { callLight({ brightness_pct: pct }); setDragBrightness(null); });
  };
  const onKelvin = (k: number) => {
    setDragKelvin(k);
    commitKelv(() => { callLight({ color_temp_kelvin: k }); setDragKelvin(null); });
  };
  // Glissement continu sur la roue → débouncé
  const onHsDrag = (hs: [number, number]) => {
    setDragHs(hs);
    commitHue(() => { callLight({ hs_color: hs }); setDragHs(null); });
  };
  // Tap discret (raccourci couleur) → immédiat
  const onHsPick = (hs: [number, number]) => callLight({ hs_color: hs });

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

        {/* Couleur — roue chromatique + raccourcis */}
        {colorable && (
          <Section icon={<Palette className="w-4 h-4" />} label="Couleur">
            <ColorWheel hue={currentHs[0]} saturation={currentHs[1]} onPick={onHsDrag} />
            <div className="grid grid-cols-8 gap-2.5 mt-5">
              {QUICK_COLORS.map((c) => (
                <button
                  key={c.name} onClick={() => onHsPick(c.hs)} title={c.name}
                  className="aspect-square rounded-xl transition-all hover:scale-110"
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
