import React from 'react';
import { ListVideo, Pause, Play, SkipBack, SkipForward, Tv, Volume2, VolumeX } from 'lucide-react';
import { Modal } from '../../ui/Modal/Modal';
import { useHA } from '../../context/HAContext';
import { cn } from '../../utils';
import { useOptimistic, type SheetProps } from './useOptimistic';
import { PillToggle, Section, StatusBadge, statusLine } from './SheetKit';

// Bits de supported_features côté HA (MediaPlayerEntityFeature)
const F = {
  PAUSE: 1,
  VOLUME_SET: 4,
  VOLUME_MUTE: 8,
  PREVIOUS: 16,
  NEXT: 32,
  TURN_ON: 128,
  TURN_OFF: 256,
  VOLUME_STEP: 1024, // TV HDMI-CEC : pas de volume absolu, juste +/−
  SELECT_SOURCE: 2048,
  PLAY: 16384,
} as const;

const STATE_FR: Record<string, string> = {
  playing: 'Lecture',
  paused: 'En pause',
  idle: 'Inactif',
  off: 'Éteint',
  on: 'Allumé',
  standby: 'Veille',
  buffering: 'Chargement…',
};

interface Optimistic {
  on?: boolean;
  playing?: boolean;
  volumePct?: number;
  muted?: boolean;
  source?: string;
}

export function MediaSheet({ entityId, entity, onClose }: SheetProps) {
  const { connection } = useHA();
  const { opt, status, call, debouncedCall } = useOptimistic<Optimistic>(entityId, connection);

  const attrs = entity.attributes as Record<string, unknown>;
  const name = (attrs.friendly_name as string) ?? entityId;
  const features = (attrs.supported_features as number) ?? 0;
  const has = (f: number) => (features & f) !== 0;

  const isOff = ['off', 'standby', 'unavailable', 'unknown'].includes(entity.state);
  const isOn = opt.on ?? !isOff;
  const playing = opt.playing ?? entity.state === 'playing';
  const volumePct = opt.volumePct ?? (typeof attrs.volume_level === 'number' ? Math.round(attrs.volume_level * 100) : 0);
  const muted = opt.muted ?? Boolean(attrs.is_volume_muted);
  const source = opt.source ?? ((attrs.source as string) || '');
  const sourceList = (attrs.source_list as string[]) ?? [];
  const title = (attrs.media_title as string) || null;
  const artist = (attrs.media_artist as string) || (attrs.app_name as string) || null;

  const svc = (service: string, data: Record<string, unknown> | undefined, patch: Optimistic) =>
    call('media_player', service, entityId, data, patch);

  return (
    <Modal isOpen={true} onClose={onClose} title={name} className="max-w-md">
      <div className="flex flex-col gap-7">
        {/* En-tête : témoin + état + interrupteur si dispo */}
        <div className="flex items-center gap-4 px-2">
          <div className="relative shrink-0">
            <div className={cn('w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-300',
              isOn ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-500')}>
              <Tv className="w-7 h-7" />
            </div>
            <StatusBadge status={status} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-lg text-white">{STATE_FR[entity.state] ?? entity.state}</p>
            <p className="text-sm text-zinc-500 truncate">
              {statusLine(status) ?? (title ? `${title}${artist ? ` — ${artist}` : ''}` : artist ?? 'Aucun média en cours')}
            </p>
          </div>
          {(has(F.TURN_ON) || has(F.TURN_OFF)) && (
            <PillToggle on={isOn} onToggle={() => svc(isOn ? 'turn_off' : 'turn_on', undefined, { on: !isOn })} />
          )}
        </div>

        {/* Transport : précédent / lecture-pause / suivant */}
        {(has(F.PLAY) || has(F.PAUSE)) && (
          <div className="flex items-center justify-center gap-6">
            {has(F.PREVIOUS) && (
              <button onClick={() => svc('media_previous_track', undefined, {})} aria-label="Piste précédente"
                className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 active:scale-95 transition-transform">
                <SkipBack className="w-5 h-5" />
              </button>
            )}
            <button onClick={() => svc('media_play_pause', undefined, { playing: !playing })} aria-label={playing ? 'Pause' : 'Lecture'}
              className="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-[0_0_25px_rgba(59,130,246,0.35)] active:scale-95 transition-transform">
              {playing ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
            </button>
            {has(F.NEXT) && (
              <button onClick={() => svc('media_next_track', undefined, {})} aria-label="Piste suivante"
                className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 active:scale-95 transition-transform">
                <SkipForward className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Volume : slider si niveau absolu, sinon +/− (TV HDMI-CEC), sourdine à part */}
        {(has(F.VOLUME_SET) || has(F.VOLUME_STEP) || has(F.VOLUME_MUTE)) && (
          <Section icon={<Volume2 className="w-4 h-4" />} label={`Volume${muted ? ' — sourdine' : has(F.VOLUME_SET) ? ` — ${volumePct}%` : ''}`}>
            <div className="flex items-center gap-3">
              {has(F.VOLUME_MUTE) && (
                <button onClick={() => svc('volume_mute', { is_volume_muted: !muted }, { muted: !muted })} aria-label={muted ? 'Rétablir le son' : 'Couper le son'}
                  className={cn('w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors',
                    muted ? 'bg-red-500/15 border-red-500/40 text-red-400' : 'bg-white/5 border-white/10 text-zinc-300')}>
                  {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              )}
              {has(F.VOLUME_SET) ? (
                <input type="range" min={0} max={100} value={volumePct}
                  onChange={(e) => debouncedCall('vol', 'media_player', 'volume_set', entityId, { volume_level: Number(e.target.value) / 100 }, { volumePct: Number(e.target.value), muted: false })}
                  className="w-full h-3 rounded-full appearance-none cursor-pointer accent-blue-400"
                  style={{ background: 'linear-gradient(to right, #3f3f46, #3b82f6)' }} />
              ) : has(F.VOLUME_STEP) ? (
                <div className="flex gap-3 flex-1">
                  <button onClick={() => svc('volume_down', undefined, {})} aria-label="Baisser le volume"
                    className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-200 font-bold text-lg active:scale-95 transition-transform">−</button>
                  <button onClick={() => svc('volume_up', undefined, {})} aria-label="Monter le volume"
                    className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-200 font-bold text-lg active:scale-95 transition-transform">+</button>
                </div>
              ) : null}
            </div>
          </Section>
        )}

        {/* Source (HDMI, appli…) */}
        {has(F.SELECT_SOURCE) && sourceList.length > 0 && (
          <Section icon={<ListVideo className="w-4 h-4" />} label="Source">
            <select value={source} onChange={(e) => e.target.value && svc('select_source', { source: e.target.value }, { source: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-white/30 cursor-pointer">
              <option value="" disabled>Choisir une source…</option>
              {sourceList.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Section>
        )}

        {!has(F.PLAY) && !has(F.PAUSE) && !has(F.VOLUME_SET) && (
          <p className="text-sm text-zinc-500 text-center">Cet appareil n'expose aucune commande de lecture.</p>
        )}
      </div>
    </Modal>
  );
}
