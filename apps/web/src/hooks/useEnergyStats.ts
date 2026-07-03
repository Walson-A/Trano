import { useEffect, useState } from 'react';
import { useHA } from '../context/HAContext';
import { ENERGY_STATS } from '../config/energy';

export type EnergyRange = 'day' | 'week' | 'month' | 'year';

export interface EnergyPoint {
  /** Libellé de l'axe X ("14h", "Lun 30", "Juil"…) */
  time: string;
  /** kWh produits sur la période */
  solar: number;
  /** kWh consommés par la maison sur la période */
  consumption: number;
  /** kWh importés depuis EDF */
  gridImport: number;
  /** kWh exportés vers EDF */
  gridExport: number;
  /** % batterie moyen (null si inconnu) */
  soc: number | null;
}

export interface EnergyStatsResult {
  points: EnergyPoint[];
  totals: {
    solar: number;
    consumption: number;
    gridImport: number;
    gridExport: number;
    /** 1 - import/conso, borné [0,1] (null si pas de conso mesurée) */
    selfSufficiency: number | null;
  };
  loading: boolean;
  error: string | null;
}

interface StatRow {
  start: number;
  change: number | null;
  mean: number | null;
}

const RANGE_CONFIG: Record<EnergyRange, { ms: number; period: 'hour' | 'day' | 'month' }> = {
  day: { ms: 24 * 3600_000, period: 'hour' },
  week: { ms: 7 * 24 * 3600_000, period: 'day' },
  month: { ms: 30 * 24 * 3600_000, period: 'day' },
  year: { ms: 365 * 24 * 3600_000, period: 'month' },
};

function formatBucket(ts: number, range: EnergyRange): string {
  const d = new Date(ts);
  if (range === 'day') return `${d.getHours()}h`;
  if (range === 'year') return d.toLocaleDateString('fr-FR', { month: 'short' });
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
}

/**
 * Historique énergie réel via l'API statistiques de Home Assistant.
 * Consommation maison reconstituée par bilan :
 * conso = production + import - export + décharge - charge.
 */
export function useEnergyStats(range: EnergyRange): EnergyStatsResult {
  const { connection } = useHA();
  const [result, setResult] = useState<EnergyStatsResult>({
    points: [],
    totals: { solar: 0, consumption: 0, gridImport: 0, gridExport: 0, selfSufficiency: null },
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!connection) return;
    let cancelled = false;

    const groups: Array<{
      key: keyof typeof ENERGY_STATS;
      ids: { id: string; factor?: number; meanPower?: boolean; invert?: boolean }[];
    }> = [
      { key: 'solar', ids: ENERGY_STATS.solar },
      { key: 'gridImport', ids: ENERGY_STATS.gridImport },
      { key: 'gridExport', ids: ENERGY_STATS.gridExport },
      { key: 'batteryCharge', ids: ENERGY_STATS.batteryCharge },
      { key: 'batteryDischarge', ids: ENERGY_STATS.batteryDischarge },
    ];
    const statisticIds = [
      ...groups.flatMap((g) => g.ids.map((s) => s.id)),
      ENERGY_STATS.batterySoc,
    ];

    const { ms, period } = RANGE_CONFIG[range];
    const end = new Date();
    const start = new Date(end.getTime() - ms);

    setResult((r) => ({ ...r, loading: true, error: null }));

    connection
      .sendMessagePromise<Record<string, StatRow[]>>({
        type: 'recorder/statistics_during_period',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        statistic_ids: statisticIds,
        period,
        types: ['change', 'mean'],
      })
      .then((stats) => {
        if (cancelled) return;

        // Regroupe par bucket temporel (timestamp de début de période)
        const buckets = new Map<number, EnergyPoint>();
        const bucket = (ts: number): EnergyPoint => {
          let b = buckets.get(ts);
          if (!b) {
            b = { time: formatBucket(ts, range), solar: 0, consumption: 0, gridImport: 0, gridExport: 0, soc: null };
            buckets.set(ts, b);
          }
          return b;
        };

        const sums: Record<string, Map<number, number>> = {};
        for (const g of groups) {
          const acc = new Map<number, number>();
          for (const s of g.ids) {
            for (const row of stats[s.id] ?? []) {
              let kwh: number;
              if (s.meanPower) {
                // Capteur de puissance : énergie = moyenne (W) × durée
                if (row.mean == null) continue;
                const watts = s.invert ? -row.mean : row.mean;
                kwh = (watts / 1000) * hoursPerBucket(period);
              } else {
                if (row.change == null) continue;
                kwh = row.change * (s.factor ?? 1);
              }
              // Garde-fou : un compteur cumulatif ne recule jamais, et un
              // saut irréaliste (> 10 kWh/h par source) est un glitch
              // d'intégration, pas de l'énergie réelle.
              if (kwh < 0 || kwh > 10 * hoursPerBucket(period)) continue;
              acc.set(row.start, (acc.get(row.start) ?? 0) + kwh);
            }
          }
          sums[g.key] = acc;
        }
        for (const row of stats[ENERGY_STATS.batterySoc] ?? []) {
          if (row.mean != null) bucket(row.start).soc = Math.round(row.mean);
        }

        const allTs = new Set<number>([
          ...Object.values(sums).flatMap((m) => [...m.keys()]),
          ...buckets.keys(),
        ]);

        for (const ts of allTs) {
          const b = bucket(ts);
          const solar = sums.solar.get(ts) ?? 0;
          const imp = sums.gridImport.get(ts) ?? 0;
          const exp = sums.gridExport.get(ts) ?? 0;
          const charge = sums.batteryCharge.get(ts) ?? 0;
          const discharge = sums.batteryDischarge.get(ts) ?? 0;
          b.solar = round2(solar);
          b.gridImport = round2(imp);
          b.gridExport = round2(exp);
          b.consumption = round2(Math.max(0, solar + imp - exp + discharge - charge));
        }

        const points = [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([, p]) => p);
        const totals = points.reduce(
          (t, p) => ({
            solar: t.solar + p.solar,
            consumption: t.consumption + p.consumption,
            gridImport: t.gridImport + p.gridImport,
            gridExport: t.gridExport + p.gridExport,
            selfSufficiency: null as number | null,
          }),
          { solar: 0, consumption: 0, gridImport: 0, gridExport: 0, selfSufficiency: null as number | null }
        );
        totals.selfSufficiency =
          totals.consumption > 0
            ? Math.min(1, Math.max(0, 1 - totals.gridImport / totals.consumption))
            : null;

        setResult({ points, totals, loading: false, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setResult((r) => ({
          ...r,
          loading: false,
          error: err instanceof Error ? err.message : 'Statistiques indisponibles',
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [connection, range]);

  return result;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function hoursPerBucket(period: 'hour' | 'day' | 'month'): number {
  return period === 'hour' ? 1 : period === 'day' ? 24 : 744;
}
