import React from 'react';
import { SolarCard } from '../../features/Energy/SolarCard';
import { BatteryCard } from '../../features/Energy/BatteryCard';
import { PowerFlowCard } from '../../features/Energy/PowerFlowCard';
import { EnergyStatsRow } from '../../features/Energy/EnergyStatsRow';
import './EnergyView.css';

export const EnergyView = () => {
  return (
    <div className="energy-view">

      {/* Row 1 : Solar + Battery */}
      <div className="energy-view__top-row">
        <SolarCard />
        <BatteryCard />
      </div>

      {/* Row 2 : Power Flow diagram */}
      <PowerFlowCard />

      {/* Row 3 : Daily stats */}
      <EnergyStatsRow />

    </div>
  );
};
