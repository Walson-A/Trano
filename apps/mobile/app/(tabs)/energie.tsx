import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { BatteryCharging, Sun, Zap } from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { HOUSE_PERIOD_MS, useHouse } from '@/features/house/store';

/**
 * L'énergie.
 *
 * L'écran que le père de Walson regarde en permanence, donc celui qui a le
 * moins le droit de mentir. Trois règles en découlent :
 *
 * - **rien d'inventé** : une valeur absente s'affiche « — », jamais zéro. Un
 *   « 0 W » de production ferait croire à une panne d'onduleur ;
 * - **le signe du réseau porte tout le sens** : négatif on vend à EDF, positif
 *   on lui achète. Un nombre nu ne dit rien, on écrit donc ce qu'il veut dire ;
 * - **on garde la dernière valeur connue** quand le serveur ne répond pas,
 *   plutôt que de vider l'écran.
 */

function fmtW(w: number | null | undefined): string {
  if (w === null || w === undefined) return '—';
  const abs = Math.abs(w);
  return abs >= 1000 ? `${(abs / 1000).toFixed(2)} kW` : `${Math.round(abs)} W`;
}

export default function Energie() {
  const state = useHouse((s) => s.state);
  const error = useHouse((s) => s.error);
  const refresh = useHouse((s) => s.refresh);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), HOUSE_PERIOD_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const e = state?.energie ?? null;
  const reseau = e?.reseau_W ?? null;
  // Le seuil évite de faire clignoter « vend / achète » autour de zéro, quand
  // la maison est à l'équilibre.
  const vend = reseau !== null && reseau < -20;
  const achete = reseau !== null && reseau > 20;

  return (
    <Screen title="Énergie" subtitle="Production solaire, batterie et réseau.">
      {error && !state ? (
        <View className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
          <Text className="text-sm text-amber-600 dark:text-amber-400">{error}</Text>
        </View>
      ) : null}

      {/* Le réseau en premier et en grand : c'est la seule ligne qui se lit
          d'un coup d'œil depuis l'autre bout de la pièce. */}
      <View
        className={
          vend
            ? 'rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-6'
            : achete
              ? 'rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-6'
              : 'rounded-2xl border border-zinc-200 bg-white px-5 py-6 dark:border-white/5 dark:bg-zinc-900/60'
        }
      >
        <View className="flex-row items-center gap-2">
          <Zap size={16} color={vend ? '#10b981' : achete ? '#f59e0b' : '#71717a'} />
          <Text className="text-sm text-zinc-500">
            {reseau === null ? 'Réseau' : vend ? 'On vend à EDF' : achete ? 'On achète à EDF' : 'À l’équilibre'}
          </Text>
        </View>
        <Text
          className={
            vend
              ? 'mt-2 text-4xl font-semibold text-emerald-600 dark:text-emerald-400'
              : achete
                ? 'mt-2 text-4xl font-semibold text-amber-600 dark:text-amber-400'
                : 'mt-2 text-4xl font-semibold text-zinc-900 dark:text-zinc-100'
          }
        >
          {fmtW(reseau)}
        </Text>
      </View>

      <View className="mt-3 flex-row gap-3">
        <View className="flex-1 rounded-2xl border border-zinc-200 bg-white px-5 py-5 dark:border-white/5 dark:bg-zinc-900/60">
          <View className="flex-row items-center gap-2">
            <Sun size={15} color="#f59e0b" />
            <Text className="text-sm text-zinc-500">Solaire</Text>
          </View>
          <Text className="mt-1.5 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {fmtW(e?.solaire_W)}
          </Text>
          <Text className="mt-0.5 text-xs text-zinc-500">
            {e?.production_du_jour_kWh !== null && e?.production_du_jour_kWh !== undefined
              ? `${e.production_du_jour_kWh.toFixed(1)} kWh aujourd'hui`
              : '—'}
          </Text>
        </View>

        <View className="flex-1 rounded-2xl border border-zinc-200 bg-white px-5 py-5 dark:border-white/5 dark:bg-zinc-900/60">
          <View className="flex-row items-center gap-2">
            <BatteryCharging size={15} color="#10b981" />
            <Text className="text-sm text-zinc-500">Batterie</Text>
          </View>
          <Text className="mt-1.5 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {e?.batterie_pct !== null && e?.batterie_pct !== undefined ? `${e.batterie_pct} %` : '—'}
          </Text>
          {e?.batterie_pct !== null && e?.batterie_pct !== undefined ? (
            <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
              <View
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${Math.max(0, Math.min(100, e.batterie_pct))}%` }}
              />
            </View>
          ) : null}
        </View>
      </View>

      <Text className="mt-6 text-xs text-zinc-500">
        Relu toutes les {HOUSE_PERIOD_MS / 1000} secondes. L'historique et les courbes restent
        sur le site : ils demandent au serveur une porte qu'il n'a pas encore.
      </Text>
    </Screen>
  );
}
