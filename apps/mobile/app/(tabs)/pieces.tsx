import { useEffect, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Lightbulb, Power } from 'lucide-react-native';
import type { HouseDevice } from '@trano/shared/api';
import { Screen } from '@/components/Screen';
import { HOUSE_PERIOD_MS, useHouse } from '@/features/house/store';

/**
 * Les pièces.
 *
 * ⚠️ **Écran partiel, et c'est assumé.** `GET /api/house` ne renvoie
 * aujourd'hui que les favoris du profil et ce qui est **allumé** — pas
 * l'inventaire complet. On peut donc éteindre n'importe quoi, mais n'allumer
 * que ses favoris. La liste complète demande une addition côté serveur
 * (`?appareils=1`), en attente parce qu'une autre session travaille dans ce
 * fichier.
 *
 * Ce n'est pas qu'un pis-aller : « mes favoris, plus ce qui est allumé » est
 * sans doute la bonne vue pour un pouce. On verra à l'usage si l'inventaire
 * complet manque vraiment.
 *
 * L'app ne parle **jamais** à Home Assistant directement — ce serait mettre un
 * jeton d'administrateur dans cinq poches. Tout passe par le serveur, qui
 * porte déjà les garde-fous : serrures et alarme refusées.
 */

function DeviceRow({
  device,
  on,
  onToggle,
}: {
  device: HouseDevice;
  on: boolean;
  onToggle: () => void;
}) {
  const isLight = device.entity_id.startsWith('light.');
  return (
    <Pressable
      onPress={onToggle}
      className={
        on
          ? 'flex-row items-center gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3.5'
          : 'flex-row items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 dark:border-white/5 dark:bg-zinc-900/60'
      }
    >
      {isLight ? (
        <Lightbulb size={18} color={on ? '#f59e0b' : '#71717a'} />
      ) : (
        <Power size={18} color={on ? '#f59e0b' : '#71717a'} />
      )}
      <View className="flex-1">
        <Text className="font-medium text-zinc-900 dark:text-zinc-100">{device.nom}</Text>
        {device.piece ? <Text className="text-[11px] text-zinc-500">{device.piece}</Text> : null}
      </View>
      <Text className={on ? 'text-xs font-semibold text-amber-600' : 'text-xs text-zinc-500'}>
        {on ? 'allumé' : 'éteint'}
      </Text>
    </Pressable>
  );
}

export default function Pieces() {
  const state = useHouse((s) => s.state);
  const error = useHouse((s) => s.error);
  const refresh = useHouse((s) => s.refresh);
  const toggle = useHouse((s) => s.toggle);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), HOUSE_PERIOD_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const allumes = useMemo(() => state?.allumes ?? [], [state]);
  const allumesIds = useMemo(() => new Set(allumes.map((d) => d.entity_id)), [allumes]);
  const favoris = state?.favoris ?? [];

  // Ce qui est allumé, rangé par pièce — sans les favoris, déjà affichés
  // au-dessus : les voir deux fois donnerait l'impression de deux appareils.
  const parPiece = useMemo(() => {
    const favIds = new Set(favoris.map((d) => d.entity_id));
    const groupes = new Map<string, HouseDevice[]>();
    for (const d of allumes) {
      if (favIds.has(d.entity_id)) continue;
      const piece = d.piece ?? 'Ailleurs';
      groupes.set(piece, [...(groupes.get(piece) ?? []), d]);
    }
    return [...groupes.entries()].sort(([a], [b]) => a.localeCompare(b, 'fr'));
  }, [allumes, favoris]);

  return (
    <Screen
      title="Pièces"
      subtitle={
        state ? `${allumes.length} allumé${allumes.length > 1 ? 's' : ''} sur ${state.total_appareils}` : undefined
      }
    >
      {error ? <Text className="mb-4 text-sm text-amber-500">{error}</Text> : null}

      {favoris.length > 0 ? (
        <View className="mb-8">
          <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Mes favoris
          </Text>
          <View className="gap-2">
            {favoris.map((d) => (
              <DeviceRow
                key={d.entity_id}
                device={d}
                on={allumesIds.has(d.entity_id)}
                onToggle={() => void toggle(d.entity_id)}
              />
            ))}
          </View>
        </View>
      ) : state?.profil_connu === false ? null : (
        <View className="mb-8 rounded-2xl border border-dashed border-zinc-300 px-5 py-6 dark:border-zinc-800">
          <Text className="text-center text-sm text-zinc-500">
            Aucun favori. Choisis-les depuis le site, ils apparaîtront ici.
          </Text>
        </View>
      )}

      {parPiece.length === 0 ? (
        <View className="rounded-2xl border border-dashed border-zinc-300 px-5 py-8 dark:border-zinc-800">
          <Text className="text-center text-sm text-zinc-500">
            Rien d'autre n'est allumé dans la maison.
          </Text>
        </View>
      ) : (
        <View className="gap-6">
          <Text className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Allumé en ce moment
          </Text>
          {parPiece.map(([piece, devices]) => (
            <View key={piece}>
              <Text className="mb-2 text-xs text-zinc-500">{piece}</Text>
              <View className="gap-2">
                {devices.map((d) => (
                  <DeviceRow
                    key={d.entity_id}
                    device={d}
                    on
                    onToggle={() => void toggle(d.entity_id)}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
