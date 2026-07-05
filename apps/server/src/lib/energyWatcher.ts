import { readGridAndBattery, notifyPhone, haConfigured } from './ha.ts';
import { broadcastMessage } from '../ws.ts';

/**
 * Surveillance proactive de l'autonomie : alerte quand la maison tire sur
 * EDF **alors que c'est évitable** (la batterie a encore de la charge).
 *
 * Anti-spam : une alerte par « épisode » d'import, avec un délai de garde.
 * La nuit batterie vide → import inévitable → pas d'alerte (SOC sous le seuil).
 *
 * Réglable par variables d'environnement :
 *   TRANO_EDF_ALERT=off        désactive complètement
 *   TRANO_EDF_THRESHOLD_W=250  seuil d'import déclencheur (W)
 *   TRANO_EDF_MIN_SOC=25       batterie mini pour juger l'import "évitable" (%)
 *   TRANO_EDF_COOLDOWN_MIN=60  délai entre deux alertes (min)
 *   TRANO_EDF_ALERT_PHONES=on  notifie aussi les téléphones (défaut : écrans seuls)
 */

const PHONE_SERVICES = ['mobile_app_iphone_de_walson', 'mobile_app_iphonerenew'];
const POLL_MS = 5 * 60 * 1000;

function envNum(name: string, def: number): number {
  const v = parseFloat(process.env[name] ?? '');
  return Number.isNaN(v) ? def : v;
}

export function startEnergyWatcher(log: (msg: string) => void): () => void {
  if ((process.env.TRANO_EDF_ALERT ?? 'on').toLowerCase() === 'off') {
    return () => {};
  }

  const thresholdW = envNum('TRANO_EDF_THRESHOLD_W', 250);
  const minSoc = envNum('TRANO_EDF_MIN_SOC', 25);
  const cooldownMs = envNum('TRANO_EDF_COOLDOWN_MIN', 60) * 60 * 1000;
  const alsoPhones = (process.env.TRANO_EDF_ALERT_PHONES ?? 'off').toLowerCase() === 'on';

  let lastAlert = 0;
  let inEpisode = false; // évite de ré-alerter tant qu'on n'est pas repassé sain

  async function tick(now: number): Promise<void> {
    if (!haConfigured()) return;
    let grid: Awaited<ReturnType<typeof readGridAndBattery>>;
    try {
      grid = await readGridAndBattery();
    } catch {
      return; // HA momentanément injoignable
    }
    const { gridW, soc } = grid;
    if (gridW == null) return;

    const importing = gridW > thresholdW;
    const avoidable = soc == null || soc > minSoc;

    // Retour à la normale : on réarme pour le prochain épisode
    if (!importing) {
      inEpisode = false;
      return;
    }

    if (importing && avoidable && !inEpisode && now - lastAlert > cooldownMs) {
      inEpisode = true;
      lastAlert = now;
      const message = `La maison consomme ${Math.round(gridW)} W depuis EDF${
        soc != null ? ` alors que la batterie est à ${Math.round(soc)} %` : ''
      }. Un gros appareil est peut-être en marche.`;

      broadcastMessage({
        type: 'intercom',
        from: { name: 'Trano', avatar: '⚡', color: '#f59e0b' },
        toProfileId: null,
        message,
      });
      if (alsoPhones) {
        await Promise.allSettled(PHONE_SERVICES.map((s) => notifyPhone(s, '⚡ Trano — conso EDF', message)));
      }
      log(`Alerte EDF émise : ${Math.round(gridW)} W (batterie ${soc ?? '?'}%)`);
    }
  }

  // On ne peut pas appeler Date.now() ici sans risque d'être bloqué dans
  // d'autres contextes ; le serveur Node l'autorise, on l'utilise via un
  // horodatage passé au tick.
  const interval = setInterval(() => {
    void tick(Date.now());
  }, POLL_MS);

  log(`Surveillance EDF active (seuil ${thresholdW} W, batterie mini ${minSoc}%).`);
  return () => clearInterval(interval);
}
