import React from 'react';
import { useEnergyDiscovery } from '../../features/Energy/useEnergyDiscovery';
import { SolarCard } from '../../features/Energy/SolarCard';
import { BatteryCard } from '../../features/Energy/BatteryCard';
import { PowerFlowCard } from '../../features/Energy/PowerFlowCard';
import { EnergyStatsRow } from '../../features/Energy/EnergyStatsRow';
import './EnergyView.css';

export const EnergyView = () => {
  const { entityIds, discovered } = useEnergyDiscovery();

  // Count how many were auto-discovered vs falling back to config
  const discoveredCount = Object.values(discovered).filter(Boolean).length;
  const totalCount = Object.keys(discovered).length;
  const allDiscovered = discoveredCount === totalCount;
  const noneDiscovered = discoveredCount === 0;

  return (
    <div className="energy-view">

      {/* Discovery status banner */}
      <div className={`energy-view__discovery-badge ${allDiscovered ? 'ok' : noneDiscovered ? 'fallback' : 'partial'}`}>
        {allDiscovered && `✓ ${totalCount} entités détectées automatiquement`}
        {noneDiscovered && `⚠ Aucune entité détectée — IDs de config.js utilisés`}
        {!allDiscovered && !noneDiscovered && `⚡ ${discoveredCount}/${totalCount} entités détectées — reste via config.js`}
      </div>

      {/* Row 1 : Solar + Battery */}
      <div className="energy-view__top-row">
        <SolarCard entityIds={entityIds} />
        <BatteryCard entityIds={entityIds} />
      </div>

      {/* Row 2 : Power Flow diagram */}
      <PowerFlowCard entityIds={entityIds} />

      {/* Row 3 : Daily stats */}
      <EnergyStatsRow entityIds={entityIds} />

    </div>
  );
};
