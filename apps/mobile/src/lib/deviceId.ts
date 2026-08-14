import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

/**
 * L'identifiant de cet appareil, généré une fois et gardé.
 *
 * Mêmes règles que sur le web : c'est lui qui permet de reconnaître un appareil
 * déjà vu plutôt que d'en créer un doublon à chaque ouverture. Désinstaller
 * l'app revient donc à présenter un nouvel appareil — c'est voulu.
 *
 * On ne se sert pas de l'identifiant fournisseur d'iOS ni de l'ID Android :
 * l'un change à la réinstallation, l'autre est une donnée qu'on n'a aucune
 * raison de collecter. Un UUID tiré au sort ne dit rien de personne.
 */

const KEY = 'trano-device-id';

let cached: string | null = null;

/** L'identifiant s'il existe déjà, sinon `null` — sans rien créer. */
export async function getDeviceId(): Promise<string | null> {
  if (cached) return cached;
  try {
    cached = await AsyncStorage.getItem(KEY);
    return cached;
  } catch {
    return null;
  }
}

/** Crée l'identifiant : appelé au tout premier enregistrement, jamais après. */
export async function createDeviceId(): Promise<string> {
  const id = Crypto.randomUUID();
  cached = id;
  try {
    await AsyncStorage.setItem(KEY, id);
  } catch {
    // Sans stockage, l'appareil se réenregistrera : un doublon occasionnel
    // vaut mieux qu'un écran bloqué.
  }
  return id;
}
