import React, { useRef, useState } from 'react';
import { Lightbulb, Palette, Sun, Sparkles, Check, Loader2, AlertTriangle } from 'lucide-react';
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

type Status = 'idle' | 'pending' | 'ok' | 'error';

interface Optimistic {
  on?: boolean;
  brightnessPct?: number;
  kelvin?: number;
  hs?: [number, number];
  effect?: string;
}

const EMPTY: Optimistic = {};

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

export function DeviceControlSheet() {
  const { openId, close } = useDeviceControls();
  const { connection, entities } = useHA();
  const entity = openId ? entities[openId] : undefined;

  const [opt, setOpt] = useState<Optimistic>({});
  const [status, setStatus] = useState<Status>('idle');
  const optTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const brightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kelvTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hueTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKey = useRef<string | null>(null);

  // Réinitialise l'optimiste quand on change d'appareil
  if (openId !== lastKey.current) {
    lastKey.current = openId;
    if (opt !== EMPTY) setOpt(EMPTY);
    if (status !== 'idle') setStatus('idle');
  }

  if (!entity || !openId) return <Modal isOpen={false} onClose={close} title=""><div /></Modal>;

  const attrs = entity.attributes as Record<string, unknown>;
  const name = (attrs.friendly_name as string) ?? openId;
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

  // ── Optimiste + feedback ─────────────────────────────────────
  const applyOptimistic = (patch: Optimistic) => {
    setOpt((o) => ({ ...o, ...patch }));
    if (optTimer.current) clearTimeout(optTimer.current);
    optTimer.current = setTimeout(() => setOpt(EMPTY), 4000); // HA a rattrapé
  };
  const flash = (s: Status, ms: number) => {
    setStatus(s);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setStatus('idle'), ms);
  };

  const send = async (serviceData: Record<string, unknown>, patch: Optimistic) => {
    applyOptimistic(patch);
    setStatus('pending');
    try {
      await connection?.sendMessagePromise({
        type: 'call_service', domain: 'light', service: 'turn_on',
        target: { entity_id: openId }, service_data: serviceData,
      });
      flash('ok', 900);
    } catch {
      setOpt(EMPTY); // échec : on revient à la vérité HA
      flash('error', 2500);
    }
  };

  const doToggle = async () => {
    const next = !isOn;
    applyOptimistic({ on: next });
    setStatus('pending');
    try {
      await connection?.sendMessagePromise({
        type: 'call_service', domain: 'light', service: next ? 'turn_on' : 'turn_off',
        target: { entity_id: openId },
      });
      flash('ok', 900);
    } catch {
      setOpt(EMPTY);
      flash('error', 2500);
    }
  };

  // Sliders/roue : retour visuel immédiat (optimiste) + commit débouncé
  const debounced = (ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>, patch: Optimistic, data: Record<string, unknown>) => {
    applyOptimistic(patch);
    if (ref.current) clearTimeout(ref.current);
    ref.current = setTimeout(() => send(data, patch), 180);
  };

  const Section = ({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) => (
    <div>
      <span className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">{icon} {label}</span>
      {children}
    </div>
  );

  return (
    <Modal isOpen={true} onClose={close} title={name} className="max-w-md">
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
            {/* Pastille de statut */}
            {status !== 'idle' && (
              <div className={cn('absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-zinc-900',
                status === 'pending' ? 'bg-zinc-700' : status === 'ok' ? 'bg-emerald-500' : 'bg-red-500')}>
                {status === 'pending' ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                  : status === 'ok' ? <Check className="w-3.5 h-3.5 text-white" />
                  : <AlertTriangle className="w-3.5 h-3.5 text-white" />}
              </div>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-lg text-white">{isOn ? 'Allumée' : 'Éteinte'}</p>
            <p className="text-sm text-zinc-500">
              {status === 'error' ? 'Échec — réessayez'
                : status === 'pending' ? 'Envoi…'
                : isOn ? (usingTemp && hasColorTemp ? `Blanc ${Math.round(kelvin)} K` : colorable ? `${brightnessPct}% · teinte ${Math.round(hs[0])}°` : `${brightnessPct}%`)
                : 'Touchez pour allumer'}
            </p>
          </div>
          <button onClick={doToggle} className={cn('w-14 h-8 rounded-full relative transition-colors shrink-0', isOn ? 'bg-amber-500' : 'bg-zinc-700')} aria-label="Interrupteur">
            <div className={cn('absolute top-1 w-6 h-6 rounded-full bg-white transition-all', isOn ? 'left-7' : 'left-1')} />
          </button>
        </div>

        {dimmable && (
          <Section icon={<Sun className="w-4 h-4" />} label={`Luminosité — ${brightnessPct}%`}>
            <input type="range" min={1} max={100} value={brightnessPct}
              onChange={(e) => debounced(brightTimer, { brightnessPct: Number(e.target.value), on: true }, { brightness_pct: Number(e.target.value) })}
              className="w-full h-3 rounded-full appearance-none cursor-pointer accent-amber-400"
              style={{ background: 'linear-gradient(to right, #3f3f46, #fbbf24)' }} />
          </Section>
        )}

        {hasColorTemp && (
          <Section icon={<Sun className="w-4 h-4" />} label="Blanc — chaud ↔ froid">
            <input type="range" min={minK} max={maxK} step={50} value={kelvin}
              onChange={(e) => debounced(kelvTimer, { kelvin: Number(e.target.value), hs: undefined, on: true }, { color_temp_kelvin: Number(e.target.value) })}
              className="w-full h-3 rounded-full appearance-none cursor-pointer"
              style={{ background: 'linear-gradient(to right, #ff9d3c, #fff6e6, #cfe4ff)' }} />
            <div className="flex justify-between text-[11px] text-zinc-500 mt-1"><span>{minK} K</span><span>{Math.round(kelvin)} K</span><span>{maxK} K</span></div>
          </Section>
        )}

        {colorable && (
          <Section icon={<Palette className="w-4 h-4" />} label="Couleur">
            <ColorWheel hue={hs[0]} saturation={hs[1]} onPick={(v) => debounced(hueTimer, { hs: v, kelvin: undefined, on: true }, { hs_color: v })} />
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
