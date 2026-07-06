import React from 'react';
import { Blinds, ChevronsDown, ChevronsUp, Square } from 'lucide-react';
import { Modal } from '../../ui/Modal/Modal';
import { useHA } from '../../context/HAContext';
import { cn } from '../../utils';
import { useOptimistic, type SheetProps } from './useOptimistic';
import { Section, StatusBadge, statusLine } from './SheetKit';

// Bits de supported_features côté HA (CoverEntityFeature)
const F = { OPEN: 1, CLOSE: 2, SET_POSITION: 4, STOP: 8 } as const;

const STATE_FR: Record<string, string> = {
  open: 'Ouvert',
  closed: 'Fermé',
  opening: 'Ouverture…',
  closing: 'Fermeture…',
};

interface Optimistic {
  position?: number;
}

export function CoverSheet({ entityId, entity, onClose }: SheetProps) {
  const { connection } = useHA();
  const { opt, status, call, debouncedCall } = useOptimistic<Optimistic>(entityId, connection);

  const attrs = entity.attributes as Record<string, unknown>;
  const name = (attrs.friendly_name as string) ?? entityId;
  const features = (attrs.supported_features as number) ?? 0;
  const has = (f: number) => (features & f) !== 0;

  const position = opt.position ?? (typeof attrs.current_position === 'number' ? attrs.current_position : null);
  const moving = entity.state === 'opening' || entity.state === 'closing';
  const isOpen = entity.state === 'open' || (position !== null && position > 0);

  const svc = (service: string, data?: Record<string, unknown>, patch: Optimistic = {}) =>
    call('cover', service, entityId, data, patch);

  const BigBtn = ({ onClick, icon, label, accent }: { onClick: () => void; icon: React.ReactNode; label: string; accent?: boolean }) => (
    <button onClick={onClick} aria-label={label}
      className={cn('flex-1 flex flex-col items-center gap-1.5 py-4 rounded-2xl border transition-all active:scale-95',
        accent ? 'bg-blue-500/15 border-blue-500/40 text-blue-400' : 'bg-white/5 border-white/10 text-zinc-300')}>
      {icon}
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );

  return (
    <Modal isOpen={true} onClose={onClose} title={name} className="max-w-md">
      <div className="flex flex-col gap-7">
        {/* En-tête : témoin + état */}
        <div className="flex items-center gap-4 px-2">
          <div className="relative shrink-0">
            <div className={cn('w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-300',
              isOpen ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-500')}>
              <Blinds className="w-7 h-7" />
            </div>
            <StatusBadge status={status} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-lg text-white">{STATE_FR[entity.state] ?? entity.state}</p>
            <p className="text-sm text-zinc-500">
              {statusLine(status) ?? (position !== null ? `Position : ${position}%` : moving ? 'En mouvement' : ' ')}
            </p>
          </div>
        </div>

        {/* Ouvrir / Stop / Fermer selon les capacités */}
        <div className="flex gap-3">
          {has(F.OPEN) && <BigBtn onClick={() => svc('open_cover')} icon={<ChevronsUp className="w-6 h-6" />} label="Ouvrir" accent />}
          {has(F.STOP) && <BigBtn onClick={() => svc('stop_cover')} icon={<Square className="w-5 h-5" />} label="Stop" />}
          {has(F.CLOSE) && <BigBtn onClick={() => svc('close_cover')} icon={<ChevronsDown className="w-6 h-6" />} label="Fermer" />}
        </div>

        {/* Position précise */}
        {has(F.SET_POSITION) && (
          <Section icon={<Blinds className="w-4 h-4" />} label={`Position — ${position ?? '--'}%`}>
            <input type="range" min={0} max={100} value={position ?? 0}
              onChange={(e) => debouncedCall('pos', 'cover', 'set_cover_position', entityId, { position: Number(e.target.value) }, { position: Number(e.target.value) }, 350)}
              className="w-full h-3 rounded-full appearance-none cursor-pointer accent-blue-400"
              style={{ background: 'linear-gradient(to right, #3f3f46, #3b82f6)' }} />
            <div className="flex justify-between text-[11px] text-zinc-500 mt-1"><span>Fermé</span><span>Ouvert</span></div>
          </Section>
        )}

        {!has(F.OPEN) && !has(F.CLOSE) && !has(F.SET_POSITION) && (
          <p className="text-sm text-zinc-500 text-center">Ce volet n'expose aucune commande.</p>
        )}
      </div>
    </Modal>
  );
}
