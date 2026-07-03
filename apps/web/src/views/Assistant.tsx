import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Send, KeyRound, RotateCcw, X } from 'lucide-react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useActiveProfile } from '../core/store/useProfileStore';
import { cn } from '../utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Fil de discussion : conservé quand le panneau se ferme ET persisté en
 * localStorage (survit au rechargement). Une conversation par appareil.
 */
const useAssistantChat = create<{
  messages: ChatMessage[];
  setMessages: (m: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  clear: () => void;
}>()(
  persist(
    (set) => ({
      messages: [],
      setMessages: (m) => set((state) => ({ messages: typeof m === 'function' ? m(state.messages) : m })),
      clear: () => set({ messages: [] }),
    }),
    { name: 'trano-assistant-chat' }
  )
);

interface AssistantStatus {
  configured: boolean;
  haReady: boolean;
  model: string;
}

// ─── Rendu Markdown léger ─────────────────────────────────────
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  // Gras **…** et code `…`
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${keyBase}-${i}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={`${keyBase}-${i}`} className="px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-white/10 text-[0.85em] font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={`${keyBase}-${i}`}>{part}</React.Fragment>;
  });
}

function Markdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Liste à puces
    if (/^\s*[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*•]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={key++} className="list-disc pl-5 space-y-1 my-1">
          {items.map((it, j) => <li key={j}>{renderInline(it, `li${key}-${j}`)}</li>)}
        </ul>
      );
      continue;
    }

    // Tableau markdown
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        if (!cells.every((c) => /^:?-+:?$/.test(c) || c === '')) rows.push(cells); // saute la ligne de séparation
        i++;
      }
      const [head, ...body] = rows;
      blocks.push(
        <div key={key++} className="overflow-x-auto my-2">
          <table className="text-sm border-collapse">
            {head && (
              <thead>
                <tr>{head.map((c, j) => <th key={j} className="text-left font-semibold px-3 py-1.5 border-b border-zinc-300 dark:border-white/10">{renderInline(c, `th${j}`)}</th>)}</tr>
              </thead>
            )}
            <tbody>
              {body.map((r, ri) => (
                <tr key={ri}>{r.map((c, j) => <td key={j} className="px-3 py-1.5 border-b border-zinc-200/60 dark:border-white/5">{renderInline(c, `td${ri}-${j}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Titre
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      blocks.push(<p key={key++} className="font-bold text-base mt-2">{renderInline(h[2], `h${key}`)}</p>);
      i++;
      continue;
    }

    // Ligne vide
    if (line.trim() === '') { i++; continue; }

    // Paragraphe (regroupe les lignes consécutives non-spéciales)
    const para: string[] = [];
    while (
      i < lines.length && lines[i].trim() !== '' &&
      !/^\s*[-*•]\s+/.test(lines[i]) && !/^\s*\|.*\|\s*$/.test(lines[i]) && !/^#{1,3}\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="leading-relaxed">
        {para.map((p, j) => (
          <React.Fragment key={j}>
            {renderInline(p, `p${key}-${j}`)}
            {j < para.length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
    );
  }

  return <div className="space-y-1.5">{blocks}</div>;
}

const SUGGESTIONS = [
  'Quel est l\'état de la maison ?',
  'Combien on produit de solaire ?',
  'Ajoute du lait aux courses',
  'Éteins la chambre de Kevin',
];

export function Assistant({ onClose }: { onClose?: () => void }) {
  const profile = useActiveProfile();
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const { messages, setMessages, clear } = useAssistantChat();
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
        body: JSON.stringify({
          messages: next,
          profile: profile ? { id: profile.id, name: profile.name, avatar: profile.avatar, color: profile.color } : null,
        }),
      });
      // Parsing défensif : jamais de "Unexpected end of JSON input"
      const raw = await res.text();
      let data: { reply?: string; error?: string } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error('Réponse illisible du serveur, réessayez.');
      }
      if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
      if (!data.reply) throw new Error('Réponse vide de l\'assistant, réessayez.');
      setMessages((m) => [...m, { role: 'assistant', content: data.reply! }]);
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
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Assistant non configuré</h1>
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
      <header className="mb-6 shrink-0 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-amber-500" />
            Assistant
          </h1>
          {status && !status.haReady && (
            <p className="text-xs text-amber-500 mt-1">⚠️ Home Assistant injoignable — les questions maison échoueront</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {messages.length > 0 && (
            <button
              onClick={() => { clear(); setError(null); }}
              title="Nouvelle conversation"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-white/5 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Nouvelle</span>
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Fermer l'assistant"
              className="p-2.5 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Fil de discussion */}
      <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-3 min-h-[300px]">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-10">
            <p className="text-zinc-500">
              Bonjour{profile ? ` ${profile.name}` : ''} ! Posez-moi une question ou demandez une action.
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
              'max-w-[85%] min-w-0 px-4 py-3 rounded-2xl [overflow-wrap:anywhere]',
              msg.role === 'user'
                ? 'self-end text-zinc-900 font-medium'
                : 'self-start bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-zinc-100'
            )}
            style={msg.role === 'user' ? { backgroundColor: profile?.color ?? '#f59e0b' } : undefined}
          >
            {msg.role === 'user' ? msg.content : <Markdown text={msg.content} />}
          </motion.div>
        ))}

        {busy && (
          <div className="self-start px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/5">
            <span className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </span>
          </div>
        )}

        {error && <p className="self-center text-sm text-red-400 text-center px-4">{error}</p>}
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
          disabled={busy}
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
