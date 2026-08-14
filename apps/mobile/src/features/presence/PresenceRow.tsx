import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { Users } from 'lucide-react-native';
import { usePresence } from './store';

/**
 * Qui est là — le portage de `apps/web/src/features/Presence/PresenceRow.tsx`.
 *
 * Trois états, pas deux, et c'est tout l'enjeu :
 *
 * - **là** : au moins un de ses téléphones se dit à la maison ;
 * - **sorti** : son téléphone le dit, on l'affirme donc ;
 * - **on ne sait pas** : aucun téléphone enregistré, ou aucun n'a rapporté.
 *
 * Confondre les deux derniers afficherait toute la famille comme absente le
 * jour où personne n'a encore installé l'app — une information fausse, et que
 * les gens croiraient.
 */

const PERIOD_MS = 30_000;

export function PresenceRow() {
  const people = usePresence((s) => s.people);
  const refresh = usePresence((s) => s.refresh);

  useEffect(() => {
    void refresh();
    // Le fil temps réel couvre les franchissements ; ce minuteur couvre
    // l'extinction silencieuse d'un téléphone, que rien n'annonce.
    const timer = setInterval(() => void refresh(), PERIOD_MS);
    return () => clearInterval(timer);
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
    <View>
      <View className="mb-4 flex-row items-center gap-2">
        <Users size={18} color="#0ea5e9" />
        <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Qui est là</Text>
        <Text className="flex-1 text-sm text-zinc-500" numberOfLines={1}>
          — {resume}
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-3">
        {people.map((p) => {
          const la = p.isHome === true;
          const inconnu = p.isHome === null;
          return (
            <View
              key={p.profileId}
              className={
                la
                  ? 'flex-row items-center gap-2.5 rounded-2xl border border-zinc-200 bg-white py-2 pl-2 pr-4 dark:border-white/10 dark:bg-zinc-900'
                  : 'flex-row items-center gap-2.5 rounded-2xl border border-dashed border-zinc-200 py-2 pl-2 pr-4 dark:border-zinc-800'
              }
            >
              <View>
                <View
                  className="h-10 w-10 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: `${p.color}26`,
                    borderColor: p.color,
                    borderWidth: 1.5,
                    opacity: la ? 1 : 0.4,
                  }}
                >
                  <Text className="text-xl">{p.avatar}</Text>
                </View>
                {la ? (
                  <View className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500" />
                ) : null}
              </View>
              <View>
                <Text
                  className={
                    la
                      ? 'text-sm font-semibold text-zinc-900 dark:text-zinc-100'
                      : 'text-sm font-semibold text-zinc-500'
                  }
                >
                  {p.name}
                </Text>
                <Text className="text-[11px] text-zinc-500">
                  {la ? 'à la maison' : inconnu ? 'on ne sait pas' : 'sorti'}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
