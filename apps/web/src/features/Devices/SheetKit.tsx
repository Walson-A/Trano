import React from 'react';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import { cn } from '../../utils';
import type { Status } from './useOptimistic';

/** Pastille collée au coin du gros témoin : envoi… / ok / échec. */
export const StatusBadge: React.FC<{ status: Status }> = ({ status }) => {
  if (status === 'idle') return null;
  return (
    <div
      className={cn(
        'absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-zinc-900',
        status === 'pending' ? 'bg-zinc-700' : status === 'ok' ? 'bg-emerald-500' : 'bg-red-500'
      )}
    >
      {status === 'pending' ? (
        <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
      ) : status === 'ok' ? (
        <Check className="w-3.5 h-3.5 text-white" />
      ) : (
        <AlertTriangle className="w-3.5 h-3.5 text-white" />
      )}
    </div>
  );
};

export const Section: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
  <div>
    <span className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
      {icon} {label}
    </span>
    {children}
  </div>
);

/** Interrupteur « pilule » du header des fiches. */
export const PillToggle: React.FC<{ on: boolean; onToggle: () => void; activeClass?: string; label?: string }> = ({
  on,
  onToggle,
  activeClass = 'bg-blue-500',
  label = 'Interrupteur',
}) => (
  <button
    onClick={onToggle}
    className={cn('w-14 h-8 rounded-full relative transition-colors shrink-0', on ? activeClass : 'bg-zinc-700')}
    aria-label={label}
  >
    <div className={cn('absolute top-1 w-6 h-6 rounded-full bg-white transition-all', on ? 'left-7' : 'left-1')} />
  </button>
);

/** Ligne de sous-titre commune quand une commande est en cours / a échoué. */
export function statusLine(status: Status): string | null {
  if (status === 'error') return 'Échec — réessayez';
  if (status === 'pending') return 'Envoi…';
  return null;
}
