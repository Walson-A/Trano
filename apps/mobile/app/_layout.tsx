import '../global.css';

import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useServer } from '@/lib/server';
import { useAutoUpdates } from '@/lib/updates';
import { useTranoWs } from '@/lib/ws';

/**
 * Racine de l'app.
 *
 * Trois choses seulement s'y passent : on relit l'adresse du serveur (rien ne
 * peut s'afficher avant de savoir à qui parler), on ouvre le fil temps réel, et
 * on branche les mises à jour par les airs.
 */
export default function RootLayout() {
  const ready = useServer((s) => s.ready);
  const load = useServer((s) => s.load);

  useAutoUpdates();
  useTranoWs();

  useEffect(() => {
    void load();
  }, [load]);

  // Un écran vide plutôt qu'un écran qui affiche « injoignable » pendant les
  // quelques millisecondes de lecture du stockage : un faux message d'erreur
  // au lancement, c'est le genre de détail qui fait croire l'app cassée.
  if (!ready) return <View className="flex-1 bg-zinc-50 dark:bg-[#0a0a0a]" />;

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SafeAreaProvider>
  );
}
