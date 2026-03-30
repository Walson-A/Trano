import { useMemo } from 'react';
import { useHA } from '../../context/HAContext';
import { ENERGY_ENTITIES } from './config';

/**
 * Patterns de reconnaissance par catégorie.
 * On cherche dans : entity_id, friendly_name (attribut), name (attribut).
 */
const PATTERNS = {
  solarPowerNow: {
    deviceClass: 'power',
    keywords: [/solar/i, /\bpv\b/i, /photovolt/i, /panneaux?/i, /onduleur/i, /inverter/i],
    excludeKeywords: [/battery/i, /grid/i, /réseau/i, /home/i, /maison/i, /consumption/i],
  },
  solarEnergyToday: {
    deviceClass: 'energy',
    keywords: [/solar/i, /\bpv\b/i, /photovolt/i, /panneaux?/i, /onduleur/i, /inverter/i],
    excludeKeywords: [/battery/i, /grid/i, /réseau/i, /home/i, /maison/i],
    preferKeywords: [/today/i, /daily/i, /jour/i, /day/i],
  },
  batteryPercent: {
    deviceClass: 'battery',
    keywords: [/battery/i, /batterie/i, /\bsoc\b/i, /charge/i],
    excludeKeywords: [/power/i, /watt/i, /\bw\b/],
  },
  batteryPower: {
    deviceClass: 'power',
    keywords: [/battery/i, /batterie/i],
    excludeKeywords: [/solar/i, /pv/i, /grid/i, /home/i, /maison/i],
  },
  gridPower: {
    deviceClass: 'power',
    keywords: [/grid/i, /réseau/i, /network/i, /import/i, /export/i, /utility/i, /mains/i],
    excludeKeywords: [/solar/i, /battery/i, /batterie/i, /home/i, /maison/i],
  },
  gridImportToday: {
    deviceClass: 'energy',
    keywords: [/grid/i, /réseau/i, /import/i, /drawn/i],
    excludeKeywords: [/solar/i, /battery/i, /export/i],
    preferKeywords: [/today/i, /daily/i, /jour/i, /day/i],
  },
  gridExportToday: {
    deviceClass: 'energy',
    keywords: [/grid/i, /réseau/i, /export/i, /feed/i, /returned/i],
    excludeKeywords: [/solar/i, /battery/i, /import/i],
    preferKeywords: [/today/i, /daily/i, /jour/i, /day/i],
  },
  homePower: {
    deviceClass: 'power',
    keywords: [/home/i, /maison/i, /house/i, /load/i, /consumption/i, /consommation/i, /demand/i],
    excludeKeywords: [/solar/i, /battery/i, /batterie/i, /grid/i, /réseau/i],
  },
  homeEnergyToday: {
    deviceClass: 'energy',
    keywords: [/home/i, /maison/i, /house/i, /consumption/i, /consommation/i, /load/i],
    excludeKeywords: [/solar/i, /battery/i, /grid/i],
    preferKeywords: [/today/i, /daily/i, /jour/i, /day/i],
  },
};

/** Score an entity against a pattern rule. Returns null if it doesn't match, or a score >= 0. */
const scoreEntity = (entityId, attributes, rule) => {
  const dc = attributes?.device_class;
  const friendlyName = attributes?.friendly_name || '';

  // device_class must match
  if (rule.deviceClass && dc !== rule.deviceClass) return null;

  const haystack = `${entityId} ${friendlyName}`.toLowerCase();

  // At least one keyword must match
  const hasKeyword = rule.keywords.some((re) => re.test(haystack));
  if (!hasKeyword) return null;

  // No exclude keyword must match
  const hasExclude = (rule.excludeKeywords || []).some((re) => re.test(haystack));
  if (hasExclude) return null;

  // Bonus for preferred keywords
  const preferBonus = (rule.preferKeywords || []).filter((re) => re.test(haystack)).length;

  return preferBonus;
};

/**
 * useEnergyDiscovery
 *
 * Scans all HA entities already subscribed in HAContext and attempts to
 * automatically identify energy-related sensors. Falls back to config.js
 * values for any key that cannot be auto-detected.
 *
 * Returns: { entityIds, discovered }
 *   entityIds   – map of key → entityId (same shape as ENERGY_ENTITIES in config.js)
 *   discovered  – map of key → true|false (whether it was auto-detected or fell back to config)
 */
export const useEnergyDiscovery = () => {
  const { entities } = useHA();

  const result = useMemo(() => {
    const entityIds = { ...ENERGY_ENTITIES }; // start with config fallbacks
    const discovered = {};

    Object.entries(PATTERNS).forEach(([key, rule]) => {
      let bestId = null;
      let bestScore = -1;

      Object.entries(entities).forEach(([entityId, entity]) => {
        const score = scoreEntity(entityId, entity.attributes, rule);
        if (score !== null && score > bestScore) {
          bestScore = score;
          bestId = entityId;
        }
      });

      if (bestId) {
        entityIds[key] = bestId;
        discovered[key] = true;
      } else {
        discovered[key] = false;
      }
    });

    return { entityIds, discovered };
  }, [entities]);

  return result;
};
