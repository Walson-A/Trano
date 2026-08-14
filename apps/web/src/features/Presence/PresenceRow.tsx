import React, { useCallback, useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import type { PresenceEntry } from '@trano/shared';
import { api } from '../../lib/api';
import { cn } from '../../utils';

/**
 * Qui est là.
 *
 * Trois états, pas deux — et c'est tout l'enjeu de cet écran :
 *
 * - **là** : au moins un de ses téléphones se dit à la maison ;
 * - **sorti** : son téléphone le dit, on l'affirme donc ;
 * - **on ne sait pas** : aucun téléphone enregistré, ou aucun n'a rapporté.
 *
 * Confondre les deux derniers afficherait toute la famille comme absente le
 * jour où personne n'a encore installé l'app — une information fausse, et que
 * les gens croiraient. Un « ? » discret dit la vérité : on n'en sait rien.
 *
 * Relu périodiquement : la présence se dégrade **par le silence**, aucun
 * événement n'est émis au moment où quelqu'un s'en va.
 */

const PERIOD_MS = 30_000;

export function PresenceRow() {
  const [people, setPeople] = useState<PresenceEntry[] | null>(null);

  const refresh = useCallback(async () => {
    try {
      setPeople(await api.presence.list());
    } catch {
      // Serveur injoignable : on garde l'affichage précédent plutôt que de
      // faire disparaître tout le monde, ce qui se lirait comme « personne
      // n'est là ».
    }
  }, []);

  useEffect(() => {
    void refresh();
    // Deux déclencheurs, pour deux causes différentes :
    // - l'événement, pour les franchissements (départ, arrivée) — immédiat ;
    // - le minuteur, pour l'extinction silencieuse d'un téléphone, que rien
    //   n'annonce.
    const onPresence = () => void refresh();
    window.addEventListener('trano:presence', onPresence);
    const timer = setInterval(() => void refresh(), PERIOD_MS);
    return () => {
      window.removeEventListener('trano:presence', onPresence);
      clearInterval(timer);
    };
  }, [refresh]);

  if (!people || people.length === 0) return null;

  const presents = people.filter((p) => p.isHome === true);
  const inconnus = people.filter((p) => p.isHome === null);

  const resume =
    presents.length > 0
      ? `${presents.map((p) => p.name).join(', ')} ${presents.length > 1 ? 'sont là' : 'est là'}`
      : inconnus.length === people.length
        ? 'Aucun téléphone ne le dit encore'
        : 'Personne à la maison';

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-sky-500" />
        <h2 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-100">Qui est là</h2>
        <span className="text-sm text-zinc-500 truncate">— {resume}</span>
      </div>

      <div className="flex flex-wrap gap-3">
        {people.map((p) => {
          const la = p.isHome === true;
          const inconnu = p.isHome === null;
          return (
            <div
              key={p.profileId}
              title={
                la ? `${p.name} est à la maison` : inconnu ? `On ne sait pas où est ${p.name}` : `${p.name} est sorti`
              }
              className={cn(
                'flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-2xl border transition-colors',
                la
                  ? 'bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-white/10'
                  : 'bg-transparent border-dashed border-zinc-200 dark:border-zinc-800',
              )}
            >
              <div className="relative">
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all',
                    !la && 'opacity-40 grayscale',
                  )}
                  style={{ backgroundColor: `${p.color}26`, border: `1.5px solid ${p.color}` }}
                >
                  {p.avatar}
                </div>
                {la && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
                )}
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-sm font-semibold truncate',
                    la ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500',
                  )}
                >
                  {p.name}
                </p>
                <p className="text-[11px] text-zinc-500">
                  {la ? 'à la maison' : inconnu ? 'on ne sait pas' : 'sorti'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
