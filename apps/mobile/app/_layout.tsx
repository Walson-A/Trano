import '../global.css';

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useServer } from '@/lib/server';
import { useAutoUpdates } from '@/lib/updates';
import { useTranoWs } from '@/lib/ws';
import { getDeviceId } from '@/lib/deviceId';
import { useDeviceHeartbeat } from '@/hooks/useDeviceHeartbeat';
import { useProfiles } from '@/features/profiles/store';
import { DeviceSetup } from '@/features/devices/DeviceSetup';

/**
 * Racine de l'app.
 *
 * Quatre choses s'y passent : on relit l'adresse du serveur (rien ne peut
 * s'afficher avant de savoir à qui parler), on regarde si cet appareil s'est
 * déjà présenté, on ouvre le fil temps réel, et on branche les mises à jour par
 * les airs.
 */
export default function RootLayout() {
  const ready = useServer((s) => s.ready);
  const load = useServer((s) => s.load);
  const loadOwner = useProfiles((s) => s.loadOwner);

  // `null` = on ne sait pas encore. À distinguer de `false`, qui déclencherait
  // l'écran de présentation : le montrer une fraction de seconde à quelqu'un
  // qui l'a déjà rempli serait le pire des accueils.
  const [deviceKnown, setDeviceKnown] = useState<boolean | null>(null);

  useAutoUpdates();
  useTranoWs();
  useDeviceHeartbeat(deviceKnown === true);

  useEffect(() => {
    void load();
    void loadOwner();
    void getDeviceId().then((id) => setDeviceKnown(Boolean(id)));
  }, [load, loadOwner]);

  const booting = !ready || deviceKnown === null;

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {/* Le navigateur est monté en toutes circonstances : expo-router exige
          qu'une racine en rende un, et le démonter pour afficher l'accueil
          reviendrait à jeter l'historique. Les deux écrans d'avant se posent
          donc par-dessus. */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>

      {booting ? (
        <View className="absolute inset-0 bg-zinc-50 dark:bg-[#0a0a0a]" />
      ) : deviceKnown ? null : (
        <View className="absolute inset-0">
          <DeviceSetup onDone={() => setDeviceKnown(true)} />
        </View>
      )}
    </SafeAreaProvider>
  );
}
