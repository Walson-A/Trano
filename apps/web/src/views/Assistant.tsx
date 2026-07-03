import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Send, KeyRound } from 'lucide-react';
import { useActiveProfile } from '../core/store/useProfileStore';
import { cn } from '../utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AssistantStatus {
  configured: boolean;
  haReady: boolean;
  model: string;
}

const SUGGESTIONS = [
  'Quel est l\'état de la maison ?',
  'On produit combien de solaire là ?',
  'Éteins toutes les lumières',
  'Qui est à la maison ?',
];

export function Assistant() {
  const profile = useActiveProfile();
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/assistant/status')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ configured: false, haReady: false, model: '' }));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    setError(null);
    setInput('');
    const next = [...messages, { role: 'user' as const, content }];
    setMessages(next);
    setBusy(true);
    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `Erreur ${res.status}`);
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setBusy(false);
    }
  };

  // ─── Écran "non configuré" ─────────────────────────────────
  if (status && !status.configured) {
    return (
      <div className="max-w-xl mx-auto flex flex-col items-center justify-center text-center py-20">
        <div className="w-16 h-16 rounded-3xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center mb-6">
          <KeyRound className="w-8 h-8 text-zinc-400" />
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Assistant non configuré
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Il manque la clé OpenRouter côté serveur.
          <br />
          En développement : <code className="text-sm bg-zinc-100 dark:bg-white/10 px-2 py-0.5 rounded">TRANO_OPENROUTER_KEY</code> dans <code className="text-sm bg-zinc-100 dark:bg-white/10 px-2 py-0.5 rounded">apps/server/.env</code>.
          <br />
          En production : option <strong>openrouter_key</strong> de l'add-on.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-full pb-20 md:pb-0">
      <header className="mb-6 shrink-0">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-3">
          <Sparkles className="w-7 h-7 text-amber-500" />
          Assistant
        </h1>
        {status && (
          <p className="text-xs text-zinc-500 mt-1">
            {status.model}
            {!status.haReady && ' · ⚠️ Home Assistant injoignable depuis le serveur — les questions maison échoueront'}
          </p>
        )}
      </header>

      {/* Fil de discussion */}
      <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-3 min-h-[300px]">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-10">
            <p className="text-zinc-500">
              Bonjour{profile ? ` ${profile.name}` : ''} ! Posez-moi une question sur la maison.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-white/5 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'max-w-[85%] px-4 py-3 rounded-2xl whitespace-pre-wrap leading-relaxed',
              msg.role === 'user'
                ? 'self-end text-zinc-900 dark:text-zinc-900 font-medium'
                : 'self-start bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-zinc-100'
            )}
            style={msg.role === 'user' ? { backgroundColor: profile?.color ?? '#f59e0b' } : undefined}
          >
            {msg.content}
          </motion.div>
        ))}

        {busy && (
          <div className="self-start px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/5">
            <span className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
          </div>
        )}

        {error && (
          <p className="self-center text-sm text-red-400 text-center px-4">{error}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Saisie */}
      <div className="shrink-0 flex gap-3 pt-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          placeholder="Demandez quelque chose à la maison…"
          disabled={busy || !status}
          className="flex-1 min-w-0 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/5 rounded-2xl px-5 py-4 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 outline-none focus:border-zinc-400 dark:focus:border-white/20 transition-colors disabled:opacity-50"
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || busy}
          className="w-14 h-14 shrink-0 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 flex items-center justify-center hover:opacity-90 active:scale-95 transition-all disabled:opacity-30"
          aria-label="Envoyer"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
