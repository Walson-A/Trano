import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SHOPPING_CATEGORIES,
  SHOPPING_CATEGORY_LABELS,
  type ShoppingCategory,
  type ShoppingItem,
} from '@trano/shared';
import {
  Apple, Home as HomeIcon, Sparkles, Shirt, Gamepad2, Package,
  Plus, Check, Trash2, Repeat, ChevronDown, RefreshCw,
} from 'lucide-react';
import { useShoppingStore } from '../core/store/useShoppingStore';
import { useProfileStore, useActiveProfile } from '../core/store/useProfileStore';
import { cn } from '../utils';

const CATEGORY_ICONS: Record<ShoppingCategory, React.ComponentType<{ className?: string }>> = {
  alimentaire: Apple,
  maison: HomeIcon,
  hygiene: Sparkles,
  vetements: Shirt,
  loisirs: Gamepad2,
  autre: Package,
};

const RECURRENCE_OPTIONS = [
  { label: 'Une fois', days: null },
  { label: 'Chaque semaine', days: 7 },
  { label: 'Toutes les 2 semaines', days: 14 },
  { label: 'Chaque mois', days: 30 },
] as const;

export function Shopping() {
  const { items, loaded, error, addItem, removeItem, toggleBought, fetchItems } = useShoppingStore();
  const profiles = useProfileStore((s) => s.profiles);
  const activeProfile = useActiveProfile();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ShoppingCategory>('alimentaire');
  const [recurrenceDays, setRecurrenceDays] = useState<number | null>(null);
  const [filter, setFilter] = useState<ShoppingCategory | 'toutes'>('toutes');
  const [showBought, setShowBought] = useState(false);
  const [adding, setAdding] = useState(false);

  const profileById = useMemo(
    () => Object.fromEntries(profiles.map((p) => [p.id, p])),
    [profiles]
  );

  const todoItems = items.filter(
    (i) => i.status === 'todo' && (filter === 'toutes' || i.category === filter)
  );
  const boughtItems = items.filter(
    (i) => i.status === 'bought' && (filter === 'toutes' || i.category === filter)
  );

  const handleAdd = async () => {
    if (!title.trim() || adding) return;
    setAdding(true);
    try {
      await addItem({
        title: title.trim(),
        category,
        authorId: activeProfile?.id ?? null,
        recurrenceDays,
      });
      setTitle('');
      setRecurrenceDays(null);
    } finally {
      setAdding(false);
    }
  };

  const authorBadge = (item: ShoppingItem) => {
    const author = item.authorId ? profileById[item.authorId] : null;
    if (!author) return null;
    return (
      <span
        title={`Ajouté par ${author.name}`}
        className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0"
        style={{ backgroundColor: `${author.color}26`, border: `1.5px solid ${author.color}` }}
      >
        {author.avatar}
      </span>
    );
  };

  return (
    <div className="max-w-3xl mx-auto pb-24 md:pb-4">
      <header className="mb-6 md:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Liste de courses
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
          {todoItems.length === 0
            ? 'Rien à acheter pour le moment'
            : `${todoItems.length} article${todoItems.length > 1 ? 's' : ''} à acheter`}
        </p>
      </header>

      {/* Ajout d'article : une seule ligne, gros boutons */}
      <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/5 rounded-3xl p-4 sm:p-5 mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Ajouter un article…"
            className="flex-1 min-w-0 bg-zinc-100 dark:bg-white/5 border border-transparent focus:border-zinc-300 dark:focus:border-white/20 rounded-2xl px-5 py-4 text-base sm:text-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 outline-none transition-colors"
          />
          <button
            onClick={handleAdd}
            disabled={!title.trim() || adding}
            className="w-14 h-14 shrink-0 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 flex items-center justify-center hover:opacity-90 active:scale-95 transition-all disabled:opacity-30"
            aria-label="Ajouter"
          >
            <Plus className="w-7 h-7" />
          </button>
        </div>

        {/* Catégorie + récurrence : gros pictos, pas de menus compliqués */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {SHOPPING_CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c];
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all',
                  category === c
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900'
                    : 'bg-zinc-100 dark:bg-white/5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{SHOPPING_CATEGORY_LABELS[c]}</span>
              </button>
            );
          })}

          <div className="w-px h-6 bg-zinc-200 dark:bg-white/10 mx-1 hidden sm:block" />

          <select
            value={recurrenceDays ?? ''}
            onChange={(e) => setRecurrenceDays(e.target.value ? Number(e.target.value) : null)}
            className={cn(
              'px-3 py-2 rounded-xl text-sm font-medium outline-none cursor-pointer transition-all border-none',
              recurrenceDays
                ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900'
                : 'bg-zinc-100 dark:bg-white/5 text-zinc-500'
            )}
          >
            {RECURRENCE_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.days ?? ''}>
                {opt.days ? `↻ ${opt.label}` : opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filtre par catégorie */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-5 -mx-1 px-1">
        <button
          onClick={() => setFilter('toutes')}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0',
            filter === 'toutes'
              ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
          )}
        >
          Tout
        </button>
        {SHOPPING_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0',
              filter === c
                ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            )}
          >
            {SHOPPING_CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {!loaded && <p className="text-zinc-500 animate-pulse text-center py-10">Chargement…</p>}

      {loaded && error && (
        <div className="flex flex-col items-center gap-3 py-10">
          <p className="text-zinc-500">Impossible de joindre le serveur Trano.</p>
          <button
            onClick={fetchItems}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 font-medium"
          >
            <RefreshCw className="w-4 h-4" /> Réessayer
          </button>
        </div>
      )}

      {/* À acheter */}
      {loaded && !error && (
        <>
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {todoItems.map((item) => {
                const Icon = CATEGORY_ICONS[item.category] ?? Package;
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    className="flex items-center gap-3 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/5 rounded-2xl px-4 py-3"
                  >
                    <button
                      onClick={() => toggleBought(item.id, activeProfile?.id ?? null)}
                      className="w-9 h-9 shrink-0 rounded-full border-2 border-zinc-300 dark:border-zinc-600 hover:border-emerald-500 dark:hover:border-emerald-500 flex items-center justify-center transition-colors group"
                      aria-label="Marquer comme acheté"
                    >
                      <Check className="w-5 h-5 text-transparent group-hover:text-emerald-500 transition-colors" />
                    </button>

                    <Icon className="w-5 h-5 text-zinc-400 shrink-0" />

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {item.title}
                        {item.quantity && (
                          <span className="text-zinc-400 dark:text-zinc-500 font-normal"> · {item.quantity}</span>
                        )}
                      </p>
                    </div>

                    {item.recurrenceDays && (
                      <Repeat className="w-4 h-4 text-zinc-400 shrink-0" aria-label="Récurrent" />
                    )}
                    {authorBadge(item)}

                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 rounded-xl text-zinc-300 dark:text-zinc-700 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {todoItems.length === 0 && (
              <div className="text-center py-12 text-zinc-400 dark:text-zinc-600">
                <Check className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>Tout est acheté !</p>
              </div>
            )}
          </div>

          {/* Achetés (repliable) */}
          {boughtItems.length > 0 && (
            <div className="mt-8">
              <button
                onClick={() => setShowBought(!showBought)}
                className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium transition-colors mb-3"
              >
                <ChevronDown className={cn('w-5 h-5 transition-transform', showBought && 'rotate-180')} />
                Achetés ({boughtItems.length})
              </button>

              {showBought && (
                <div className="flex flex-col gap-2">
                  {boughtItems.map((item) => {
                    const buyer = item.boughtBy ? profileById[item.boughtBy] : null;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-2xl px-4 py-3 opacity-60 bg-zinc-100/50 dark:bg-white/[0.02]"
                      >
                        <button
                          onClick={() => toggleBought(item.id, null)}
                          className="w-9 h-9 shrink-0 rounded-full bg-emerald-500 flex items-center justify-center hover:opacity-80 transition-opacity"
                          aria-label="Remettre dans la liste"
                        >
                          <Check className="w-5 h-5 text-white" />
                        </button>
                        <p className="flex-1 min-w-0 font-medium text-zinc-500 line-through truncate">
                          {item.title}
                        </p>
                        {item.recurrenceDays && item.nextDue && (
                          <span className="text-xs text-zinc-400 flex items-center gap-1 shrink-0">
                            <Repeat className="w-3 h-3" />
                            reviendra le {new Date(item.nextDue).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                        {buyer && (
                          <span className="text-xs text-zinc-400 shrink-0">par {buyer.name}</span>
                        )}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-2 rounded-xl text-zinc-300 dark:text-zinc-700 hover:text-red-500 transition-colors shrink-0"
                          aria-label="Supprimer définitivement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
