import React, { useEffect, useRef } from 'react';
import { Lightbulb, Palette, Sparkles, Sun } from 'lucide-react';
import { Modal } from '../../ui/Modal/Modal';
import { useHA } from '../../context/HAContext';
import { cn } from '../../utils';
import { useOptimistic, type SheetProps } from './useOptimistic';
import { PillToggle, Section, StatusBadge, statusLine } from './SheetKit';

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

interface Optimistic {
  on?: boolean;
  brightnessPct?: number;
  kelvin?: number;
  hs?: [number, number];
  effect?: string;
}

/** Interpolation chaud→froid pour représenter une température de blanc. */
function kelvinCss(k: number, minK: number, maxK: number): string {
  const t = Math.max(0, Math.min(1, (k - minK) / (maxK - minK)));
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
  return `rgb(${lerp(255, 201)}, ${lerp(157, 226)}, ${lerp(60, 255)})`;
}

/** Roue chromatique HSV : angle = teinte, distance au centre = saturation. */
function ColorWheel({ hue, saturation, onPick }: { hue: number; saturation: number; onPick: (hs: [number, number]) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const handle = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const hueDeg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    const sat = Math.min(100, Math.round((Math.hypot(dx, dy) / (rect.width / 2)) * 100));
    onPick([Math.round(hueDeg), sat]);
  };

  // iOS 12 (iPad mural) n'a pas les Pointer Events : on retombe sur les
  // événements touch natifs (non-passifs, pour bloquer le scroll pendant
  // qu'on choisit une couleur). handleRef évite les fermetures périmées.
  const handleRef = useRef(handle);
  handleRef.current = handle;
  useEffect(() => {
    const el = ref.current;
    if (!el || 'PointerEvent' in window) return;
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      e.preventDefault();
      handleRef.current(t.clientX, t.clientY);
    };
    el.addEventListener('touchstart', onTouch, { passive: false });
    el.addEventListener('touchmove', onTouch, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onTouch);
      el.removeEventListener('touchmove', onTouch);
    };
  }, []);

  const rad = (hue * Math.PI) / 180;
  const dist = (saturation / 100) * 50;
  return (
    <div
      ref={ref}
      onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); handle(e.clientX, e.clientY); }}
      onPointerMove={(e) => { if (e.buttons === 1 || e.pressure > 0) handle(e.clientX, e.clientY); }}
      className="relative mx-auto rounded-full cursor-pointer touch-none select-none"
      style={{
        width: 220, height: 220,
        background: 'radial-gradient(circle at center, #fff 0%, transparent 70%), conic-gradient(from 90deg, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))',
      }}
    >
      <div
        className="absolute w-7 h-7 rounded-full border-[3px] border-white shadow-lg -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{ left: `${50 + dist * Math.cos(rad)}%`, top: `${50 + dist * Math.sin(rad)}%`, backgroundColor: `hsl(${hue}, ${saturation}%, 50%)` }}
      />
    </div>
  );
}

export function LightSheet({ entityId, entity, onClose }: SheetProps) {
  const { connection } = useHA();
  const { opt, status, call, debouncedCall } = useOptimistic<Optimistic>(entityId, connection);

  const attrs = entity.attributes as Record<string, unknown>;
  const name = (attrs.friendly_name as string) ?? entityId;
  const colorModes = (attrs.supported_color_modes as string[]) ?? [];
  const dimmable = colorModes.some((m) => DIMMABLE_MODES.includes(m));
  const colorable = colorModes.some((m) => COLOR_MODES.includes(m));
  const hasColorTemp = colorModes.includes('color_temp');
  const effectList = (attrs.effect_list as string[]) ?? [];
  const minK = (attrs.min_color_temp_kelvin as number) ?? 2200;
  const maxK = (attrs.max_color_temp_kelvin as number) ?? 6500;

  // ── Valeurs affichées : optimiste sinon état réel HA ─────────
  const isOn = opt.on ?? entity.state === 'on';
  const brightnessPct = opt.brightnessPct ?? (typeof attrs.brightness === 'number' ? Math.round((attrs.brightness / 255) * 100) : isOn ? 100 : 0);
  const kelvin = opt.kelvin ?? (typeof attrs.color_temp_kelvin === 'number' ? attrs.color_temp_kelvin : Math.round((minK + maxK) / 2));
  const hs = opt.hs ?? (attrs.hs_color as [number, number]) ?? [0, 0];
  const currentEffect = opt.effect ?? (attrs.effect as string) ?? null;
  const usingTemp = opt.kelvin != null || (opt.hs == null && attrs.color_mode === 'color_temp');

  // Couleur actuelle (pour le gros témoin en haut)
  const currentColor = !isOn
    ? '#3f3f46'
    : usingTemp && hasColorTemp
      ? kelvinCss(kelvin, minK, maxK)
      : colorable
        ? `hsl(${hs[0]}, ${Math.max(25, hs[1])}%, 55%)`
        : '#fbbf24';

  const send = (data: Record<string, unknown>, patch: Optimistic) => call('light', 'turn_on', entityId, data, patch);
  const doToggle = () => call('light', isOn ? 'turn_off' : 'turn_on', entityId, undefined, { on: !isOn });

  return (
    <Modal isOpen={true} onClose={onClose} title={name} className="max-w-md">
      <div className="flex flex-col gap-7">
        {/* En-tête : gros témoin de couleur + interrupteur + statut */}
        <div className="flex items-center gap-4 px-2">
          <button onClick={doToggle} className="relative shrink-0" aria-label={isOn ? 'Éteindre' : 'Allumer'}>
            <div
              className={cn('w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300',
                isOn ? 'shadow-[0_0_25px_var(--glow)]' : '')}
              style={{ backgroundColor: currentColor, ['--glow' as string]: `${currentColor}99` }}
            >
              <Lightbulb className={cn('w-7 h-7', isOn ? 'text-white/90' : 'text-zinc-500')} />
            </div>
            <StatusBadge status={status} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-lg text-white">{isOn ? 'Allumée' : 'Éteinte'}</p>
            <p className="text-sm text-zinc-500">
              {statusLine(status)
                ?? (isOn
                  ? (usingTemp && hasColorTemp ? `Blanc ${Math.round(kelvin)} K` : colorable ? `${brightnessPct}% · teinte ${Math.round(hs[0])}°` : `${brightnessPct}%`)
                  : 'Touchez pour allumer')}
            </p>
          </div>
          <PillToggle on={isOn} onToggle={doToggle} activeClass="bg-amber-500" />
        </div>

        {dimmable && (
          <Section icon={<Sun className="w-4 h-4" />} label={`Luminosité — ${brightnessPct}%`}>
            <input type="range" min={1} max={100} value={brightnessPct}
              onChange={(e) => debouncedCall('bright', 'light', 'turn_on', entityId, { brightness_pct: Number(e.target.value) }, { brightnessPct: Number(e.target.value), on: true })}
              className="w-full h-3 rounded-full appearance-none cursor-pointer accent-amber-400"
              style={{ background: 'linear-gradient(to right, #3f3f46, #fbbf24)' }} />
          </Section>
        )}

        {hasColorTemp && (
          <Section icon={<Sun className="w-4 h-4" />} label="Blanc — chaud ↔ froid">
            <input type="range" min={minK} max={maxK} step={50} value={kelvin}
              onChange={(e) => debouncedCall('kelvin', 'light', 'turn_on', entityId, { color_temp_kelvin: Number(e.target.value) }, { kelvin: Number(e.target.value), hs: undefined, on: true })}
              className="w-full h-3 rounded-full appearance-none cursor-pointer"
              style={{ background: 'linear-gradient(to right, #ff9d3c, #fff6e6, #cfe4ff)' }} />
            <div className="flex justify-between text-[11px] text-zinc-500 mt-1"><span>{minK} K</span><span>{Math.round(kelvin)} K</span><span>{maxK} K</span></div>
          </Section>
        )}

        {colorable && (
          <Section icon={<Palette className="w-4 h-4" />} label="Couleur">
            <ColorWheel hue={hs[0]} saturation={hs[1]} onPick={(v) => debouncedCall('hue', 'light', 'turn_on', entityId, { hs_color: v }, { hs: v, kelvin: undefined, on: true })} />
            <div className="grid grid-cols-8 gap-2.5 mt-5">
              {QUICK_COLORS.map((c) => (
                <button key={c.name} onClick={() => send({ hs_color: c.hs }, { hs: c.hs, kelvin: undefined, on: true })} title={c.name}
                  className="aspect-square rounded-xl transition-all hover:scale-110" style={{ backgroundColor: c.hex }} />
              ))}
            </div>
          </Section>
        )}

        {effectList.length > 0 && (
          <Section icon={<Sparkles className="w-4 h-4" />} label={`Effets (${effectList.length})`}>
            <select value={currentEffect ?? ''} onChange={(e) => e.target.value && send({ effect: e.target.value }, { effect: e.target.value, on: true })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-white/30 cursor-pointer">
              <option value="" disabled>Choisir un effet…</option>
              {effectList.map((eff) => <option key={eff} value={eff}>{eff}</option>)}
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
