import React from 'react';
import { useHA } from '../../context/HAContext';
import { ENERGY_ENTITIES } from './config';
import { Sun, Home, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import './EnergyStatsRow.css';

const formatEnergy = (val) => {
  const k = parseFloat(val);
  if (val === null || val === undefined || isNaN(k)) return '--';
  return `${k.toFixed(1)} kWh`;
};

const StatTile = ({ label, value, color, children }) => (
  <div className="stat-tile">
    <div className="stat-tile__icon" style={{ color }}>
      {children}
    </div>
    <div className="stat-tile__value" style={{ color }}>{value}</div>
    <div className="stat-tile__label">{label}</div>
  </div>
);

export const EnergyStatsRow = () => {
  const { entities } = useHA();

  const solarToday  = entities[ENERGY_ENTITIES.solarEnergyToday];
  const homeToday   = entities[ENERGY_ENTITIES.homeEnergyToday];
  const exportToday = entities[ENERGY_ENTITIES.gridExportToday];
  const importToday = entities[ENERGY_ENTITIES.gridImportToday];

  return (
    <div className="energy-stats-row">
      <StatTile label="Production" value={formatEnergy(solarToday?.state)} color="var(--color-sun)">
        <Sun size={20} strokeWidth={1.8} />
      </StatTile>
      <StatTile label="Consommation" value={formatEnergy(homeToday?.state)} color="var(--color-accent)">
        <Home size={20} strokeWidth={1.8} />
      </StatTile>
      <StatTile label="Export réseau" value={formatEnergy(exportToday?.state)} color="var(--color-energy)">
        <ArrowUpFromLine size={20} strokeWidth={1.8} />
      </StatTile>
      <StatTile label="Import réseau" value={formatEnergy(importToday?.state)} color="var(--color-error)">
        <ArrowDownToLine size={20} strokeWidth={1.8} />
      </StatTile>
    </div>
  );
};
