import React, { useState } from 'react';
import { Megaphone, Send, Smartphone, MonitorSmartphone, Check } from 'lucide-react';
import { Modal } from '../../ui/Modal/Modal';
import { useHA } from '../../context/HAContext';
import { useActiveProfile } from '../../core/store/useProfileStore';
import { PHONES } from '../../config/network';
import { cn } from '../../utils';

const PRESET_MESSAGES = [
  'Descends !',
  'On va manger 🍽️',
  'Viens voir 👀',
  'On part dans 5 minutes 🚗',
  'Téléphone pour toi 📞',
  'Bonne nuit 🌙',
];

interface Target {
  id: string;
  label: string;
  kind: 'phone' | 'screens';
}

const TARGETS: Target[] = [
  ...PHONES.map((p) => ({ id: p.service, label: p.label, kind: 'phone' as const })),
  { id: '__screens__', label: 'Tous les écrans Trano', kind: 'screens' },
];

interface IntercomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IntercomModal({ isOpen, onClose }: IntercomModalProps) {
  const { connection } = useHA();
  const profile = useActiveProfile();
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTarget = (id: string) =>
    setTargetIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));

  const send = async () => {
    const text = message.trim();
    if (!text || targetIds.length === 0 || !profile || sending) return;
    setSending(true);
    setError(null);
    try {
      const jobs: Promise<unknown>[] = [];

      // Téléphones via l'app compagnon HA (notification critique : sonne
      // même en silencieux)
      for (const t of TARGETS.filter((t) => t.kind === 'phone' && targetIds.includes(t.id))) {
        if (!connection) throw new Error('Home Assistant déconnecté — impossible de sonner les téléphones');
        jobs.push(
          connection.sendMessagePromise({
            type: 'call_service',
            domain: 'notify',
            service: t.id,
            service_data: {
              title: `📢 ${profile.name}`,
              message: text,
              data: { push: { sound: { name: 'default', critical: 1, volume: 1.0 } } },
            },
          })
        );
      }

      // Écrans Trano ouverts (tablette murale, PC, PWA…)
      if (targetIds.includes('__screens__')) {
        jobs.push(
          fetch('/api/intercom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: { name: profile.name, avatar: profile.avatar, color: profile.color },
              toProfileId: null,
              message: text,
            }),
          })
        );
      }

      await Promise.all(jobs);
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setMessage('');
        onClose();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Interphone">
      <div className="flex flex-col gap-6">
        {/* Destinataires */}
        <div>
          <p className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">À qui ?</p>
          <div className="flex flex-wrap gap-2">
            {TARGETS.map((t) => (
              <button
                key={t.id}
                onClick={() => toggleTarget(t.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 rounded-2xl font-medium transition-all',
                  targetIds.includes(t.id)
                    ? 'bg-white text-zinc-900'
                    : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                )}
              >
                {t.kind === 'phone' ? <Smartphone className="w-4 h-4" /> : <MonitorSmartphone className="w-4 h-4" />}
                {t.label}
                {targetIds.includes(t.id) && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>

        {/* Messages prédéfinis */}
        <div>
          <p className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Message</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESET_MESSAGES.map((m) => (
              <button
                key={m}
                onClick={() => setMessage(m)}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                  message === m
                    ? 'bg-white text-zinc-900'
                    : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="…ou écrivez le vôtre"
            maxLength={200}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-zinc-500 outline-none focus:border-white/30 transition-colors"
          />
        </div>

        {/* Aperçu */}
        {profile && message.trim() && (
          <p className="text-sm text-zinc-500 text-center">
            {profile.avatar} <strong className="text-zinc-300">{profile.name}</strong> dit : « {message.trim()} »
          </p>
        )}

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}

        <button
          onClick={send}
          disabled={!message.trim() || targetIds.length === 0 || sending}
          className={cn(
            'w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2',
            sent ? 'bg-emerald-500 text-white' : 'bg-white text-zinc-900 hover:bg-zinc-200 disabled:opacity-30'
          )}
        >
          {sent ? (
            <>
              <Check className="w-5 h-5" /> Envoyé !
            </>
          ) : (
            <>
              <Send className="w-5 h-5" /> {sending ? 'Envoi…' : 'Envoyer'}
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}

export { Megaphone as IntercomIcon };
