import { Text, View } from 'react-native';
import { Screen, ToCome } from '@/components/Screen';
import { PresenceRow } from '@/features/presence/PresenceRow';
import { usePresence } from '@/features/presence/store';
import { useServer } from '@/lib/server';

/**
 * L'accueil.
 *
 * « Qui est là » en premier, comme sur le web : c'est ce que la famille regarde
 * en ouvrant l'app, avant les lampes et avant l'énergie.
 */
export default function Accueil() {
  const error = usePresence((s) => s.error);
  const people = usePresence((s) => s.people);
  const url = useServer((s) => s.url);

  return (
    <Screen title="La maison">
      {/* Affiché seulement quand on n'a **rien** : une erreur passagère alors
          que la liste est déjà à l'écran n'a pas à alarmer. */}
      {error && !people ? (
        <View className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
          <Text className="text-sm font-semibold text-amber-600 dark:text-amber-400">{error}</Text>
          <Text className="mt-1 text-xs text-zinc-500">
            {url} — vérifie l'adresse dans Réglages, et que tu es bien sur le Wi-Fi de la maison.
          </Text>
        </View>
      ) : null}

      <PresenceRow />

      <View className="mt-8">
        <ToCome what="Pièces favorites, énergie, courses et interphone arrivent ici." />
      </View>
    </Screen>
  );
}
