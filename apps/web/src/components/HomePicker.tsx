import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Building2, Check, ChevronDown, Home } from 'lucide-react';
import { useHomeStore } from '../core/store/useHomeStore';

export function HomePicker() {
  const { homeId, homes, select, error } = useHomeStore();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const options = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const current = homes.find(home => home.id === homeId);
  const label = current?.name ?? (error ? 'Logement indisponible' : 'Chargement…');
  const Icon = homeId === 'apartment' ? Building2 : Home;
  useEffect(() => {
    if (!open) return;
    options.current[Math.max(0, homes.findIndex(home => home.id === homeId))]?.focus();
    const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open, homes, homeId]);
  const keyboard = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && open) { e.preventDefault(); e.stopPropagation(); setOpen(false); trigger.current?.focus(); return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key) || !homes.length) return;
    e.preventDefault();
    if (!open) { setOpen(true); return; }
    const index = options.current.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? homes.length - 1 : (index + (e.key === 'ArrowDown' ? 1 : -1) + homes.length) % homes.length;
    options.current[next]?.focus();
  };
  return <div ref={root} className="relative min-w-0" onKeyDown={keyboard}
    onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
    <button ref={trigger} type="button" role="combobox" aria-label={`Logement contrôlé : ${label}`} aria-haspopup="listbox"
      aria-controls={id} aria-expanded={open} data-home-id={homeId} title={error ?? label} disabled={!homes.length}
      onClick={() => setOpen(value => !value)}
      className="flex max-w-[230px] min-w-0 items-center gap-2.5 rounded-full border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-white/[.035] py-2 pl-2 pr-3 text-sm font-medium text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/[.07] focus-visible:outline-2 focus-visible:outline-amber-500 disabled:opacity-50">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400"><Icon size={15} aria-hidden="true" /></span>
      <span className="truncate">{label}</span><ChevronDown size={14} className="shrink-0 text-zinc-400" aria-hidden="true" />
    </button>
    {open && <div id={id} role="listbox" aria-label="Logement contrôlé"
      className="absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-32px)] max-h-64 overflow-y-auto rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-2 shadow-xl">
      <p className="px-3 pt-1 pb-2 text-[10px] font-medium uppercase tracking-widest text-zinc-400">Vos logements</p>
      {homes.map((home,index) => {
        const HomeIcon = home.id === 'apartment' ? Building2 : Home;
        return <button ref={element => { options.current[index] = element; }} key={home.id} type="button" role="option" aria-selected={home.id === homeId} tabIndex={-1}
          onClick={() => { select(home.id); setOpen(false); trigger.current?.focus(); }}
          className={`flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm outline-none hover:bg-zinc-100 dark:hover:bg-white/5 focus-visible:bg-zinc-100 dark:focus-visible:bg-white/5 ${home.id === homeId ? 'bg-amber-500/[.08] text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}`}>
          <HomeIcon size={18} className="shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" /><span className="min-w-0 flex-1 break-words">{home.name}</span>
          {home.id === homeId && <Check size={15} className="shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
        </button>;
      })}
    </div>}
  </div>;
}
