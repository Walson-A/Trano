import { Platform } from 'react-native';
import * as Device from 'expo-device';
import type { UserDeviceType } from '@trano/shared';

/**
 * Ce que l'appareil dit de lui-même — et il en dit **beaucoup plus** qu'un
 * navigateur.
 *
 * Sur le web, un iPhone ne livre ni son modèle ni son nom : les Client Hints
 * sont une API Chromium, absente de tout navigateur iOS (voir
 * `apps/web/src/lib/deviceInfo.ts`). En natif, tout est là — et notamment
 * `Device.deviceName`, le nom que la personne a elle-même donné à son
 * téléphone dans les réglages d'iOS. « iPhone de Walson » n'a pas à être
 * deviné : il est déjà écrit.
 *
 * L'écran de première connexion fait quand même **valider** plutôt que de
 * décider en silence. Ce qui est prérempli est juste bien plus souvent juste.
 */

export interface DetectedDevice {
  type: UserDeviceType;
  platform: string | null;
  model: string | null;
  osVersion: string | null;
  /** Proposition de nom, que l'utilisateur corrige. */
  suggestedName: string;
}

function guessType(): UserDeviceType {
  switch (Device.deviceType) {
    case Device.DeviceType.TABLET:
      return 'tablet';
    case Device.DeviceType.DESKTOP:
      return 'pc';
    case Device.DeviceType.TV:
      return 'tv';
    case Device.DeviceType.PHONE:
      return 'phone';
    default:
      // Inconnu : c'est une app posée sur un appareil de poche neuf fois sur
      // dix, et de toute façon la question est posée juste après.
      return 'phone';
  }
}

export function detectDevice(): DetectedDevice {
  const model = Device.modelName?.trim() || null;
  return {
    type: guessType(),
    platform: Platform.OS,
    model,
    osVersion: Device.osVersion?.trim() || null,
    // Le nom donné par la personne d'abord, le modèle ensuite. Sur un
    // simulateur les deux peuvent manquer.
    suggestedName: Device.deviceName?.trim() || model || 'Cet appareil',
  };
}
