import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import * as Application from 'expo-application';
import { Screen } from '@/components/Screen';
import { DEFAULT_SERVER_URL, normalizeUrl, useServer } from '@/lib/server';
import { runningVersion } from '@/lib/updates';

/**
 * Réglages.
 *
 * Pour l'instant, la seule chose vraiment réglable est **l'adresse du serveur**,
 * et c'est la plus importante : elle seule décide si l'app fonctionne ou reste
 * muette. Le reste de l'écran répond à la question qu'on se pose quand ça ne
 * marche pas — « qu'est-ce qui tourne, au juste ? ».
 */
export default function Reglages() {
  const url = useServer((s) => s.url);
  const setUrl = useServer((s) => s.setUrl);
  const api = useServer((s) => s.api);

  const [draft, setDraft] = useState(url);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const version = runningVersion();

  const save = async () => {
    const next = normalizeUrl(draft) || DEFAULT_SERVER_URL;
    setDraft(next);
    await setUrl(next);
    setResult(null);
  };

  const test = async () => {
    setTesting(true);
    setResult(null);
    try {
      const rooms = await api.rooms.list();
      setResult({ ok: true, text: `Connecté — ${rooms.length} pièces` });
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : 'Échec' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Screen title="Réglages">
      <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        Adresse du serveur
      </Text>
      <Text className="mt-0.5 text-xs text-zinc-500">
        La machine qui fait tourner Trano, sur le réseau de la maison.
      </Text>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onBlur={save}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder={DEFAULT_SERVER_URL}
        placeholderTextColor="#71717a"
        className="mt-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100"
      />

      <View className="mt-3 flex-row items-center gap-3">
        <Pressable
          onPress={test}
          disabled={testing}
          className="flex-row items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 dark:bg-zinc-100"
        >
          {testing ? <ActivityIndicator size="small" /> : null}
          <Text className="text-sm font-semibold text-zinc-100 dark:text-zinc-900">Tester</Text>
        </Pressable>
        {result ? (
          <Text
            className={
              result.ok
                ? 'flex-1 text-sm text-emerald-600 dark:text-emerald-400'
                : 'flex-1 text-sm text-red-500'
            }
          >
            {result.text}
          </Text>
        ) : null}
      </View>

      <View className="mt-10 border-t border-zinc-200 pt-6 dark:border-white/5">
        <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Version installée
        </Text>
        <Text className="mt-2 text-xs leading-5 text-zinc-500">
          App {Application.nativeApplicationVersion ?? '—'} (build{' '}
          {Application.nativeBuildVersion ?? '—'})
          {'\n'}Canal : {version.channel}
          {'\n'}Version d'exécution : {version.runtimeVersion}
          {'\n'}
          {version.embedded
            ? 'Aucune mise à jour par les airs appliquée.'
            : `Mise à jour ${version.updateId.slice(0, 8)} appliquée.`}
        </Text>
        <Text className="mt-3 text-xs leading-5 text-zinc-500">
          Les corrections arrivent toutes seules au lancement. Une nouvelle
          installation n'est nécessaire que si Trano gagne une capacité du
          téléphone — position, notifications, son.
        </Text>
      </View>
    </Screen>
  );
}
