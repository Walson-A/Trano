import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { getApi } from '@/lib/server';
import { getDeviceId } from '@/lib/deviceId';

/**
 * Les notifications — l'autre raison d'être de l'app native.
 *
 * Le site ne pourra **jamais** les avoir : le Web Push exige un Service Worker,
 * qui exige un contexte sécurisé, et Trano est servi en HTTP clair sur le
 * réseau de la maison.
 *
 * Ce fichier ne fait qu'une chose : obtenir le jeton et le donner au serveur.
 * L'envoi viendra du serveur, quand le géofence saura dire « Papa vient de
 * partir » — c'est déjà repéré dans `routes/userDevices.ts`, à l'endroit exact
 * où la transition est détectée.
 *
 * Le jeton part par le battement de cœur (`pushToken`), et le serveur ne le
 * ressort jamais : l'API n'expose que `hasPushToken`, un booléen. Un secret ne
 * s'affiche pas dans une liste d'appareils.
 */

// Une notification reçue app ouverte doit se voir : par défaut, iOS ne
// l'affiche pas au premier plan. Pour un interphone, la rater est le seul
// échec qui compte.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPush(): Promise<string | null> {
  // Un simulateur n'a pas d'APNs : inutile de demander une permission qui ne
  // mènera à rien.
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    // Sans canal déclaré, Android range tout en « Autres » et l'utilisateur ne
    // peut pas régler l'interphone séparément du reste.
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Trano',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#0ea5e9',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let statut = existing.status;
  // On ne redemande pas si c'est déjà refusé : iOS ne réafficherait pas la
  // boîte de dialogue, et l'appel serait un aller-retour pour rien.
  if (statut === 'undetermined') {
    statut = (await Notifications.requestPermissionsAsync()).status;
  }
  if (statut !== 'granted') return null;

  // L'identifiant du projet EAS est indispensable hors Expo Go : c'est lui qui
  // dit au service de push à quelle application le jeton appartient.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  if (!projectId) return null;

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch {
    // Clé APNs absente côté EAS, ou appareil sans réseau. L'app fonctionne
    // sans : elle sera simplement muette.
    return null;
  }
}

/**
 * Demande la permission, récupère le jeton, le remet au serveur.
 *
 * `enabled` n'est vrai qu'une fois l'appareil enregistré : demander l'accès aux
 * notifications avant même de savoir à qui appartient le téléphone serait une
 * boîte de dialogue sortie de nulle part, et c'est comme ça qu'on se fait
 * refuser.
 */
export function usePushRegistration(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    let annule = false;

    void (async () => {
      const token = await registerForPush();
      if (!token || annule) return;
      const id = await getDeviceId();
      if (!id || annule) return;
      try {
        await getApi().userDevices.heartbeat(id, { pushToken: token });
      } catch {
        // Serveur injoignable : le jeton repartira au prochain battement
        // réussi. Il ne change quasiment jamais.
      }
    })();

    return () => {
      annule = true;
    };
  }, [enabled]);
}
