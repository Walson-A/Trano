import React from 'react';
import { useHA } from '../../context/HAContext';
import { ENERGY_ENTITIES } from './config';
import { Sun, MoonStar } from 'lucide-react';
import './SolarCard.css';

const formatPower = (val) => {
  const w = parseFloat(val);
  if (val === null || val === undefined || isNaN(w)) return '--';
  if (Math.abs(w) >= 1000) return `${(w / 1000).toFixed(2)} kW`;
  return `${Math.round(w)} W`;
};

const formatEnergy = (val) => {
  const k = parseFloat(val);
  if (val === null || val === undefined || isNaN(k)) return '--';
  return `${k.toFixed(1)} kWh`;
};

export const SolarCard = () => {
  const { entities } = useHA();
  const powerEnt = entities[ENERGY_ENTITIES.solarPowerNow];
  const todayEnt = entities[ENERGY_ENTITIES.solarEnergyToday];

  const power = powerEnt ? parseFloat(powerEnt.state) : null;
  const today = todayEnt ? parseFloat(todayEnt.state) : null;

  const isProducing = power !== null && power > 10;
  const isNight = power !== null && power <= 1;

  let status = 'offline';
  if (power !== null) {
    status = isNight ? 'night' : isProducing ? 'producing' : 'standby';
  }

  const statusLabels = {
    offline: 'Hors ligne',
    night: 'Nuit',
    standby: 'Nuageux',
    producing: 'En production',
  };

  return (
    <div className={`solar-card solar-card--${status}`}>
      <div className="solar-card__header">
        <div className={`solar-card__icon ${isProducing ? 'solar-card__icon--active' : ''}`}>
          {isNight ? <MoonStar size={30} strokeWidth={1.5} /> : <Sun size={30} strokeWidth={1.5} />}
        </div>
        <span className={`solar-card__badge solar-card__badge--${status}`}>
          {statusLabels[status]}
        </span>
      </div>

      <div className="solar-card__power">{formatPower(power)}</div>
      <div className="solar-card__sublabel">Puissance actuelle</div>

      <div className="solar-card__footer">
        <div className="solar-card__stat">
          <span className="solar-card__stat-label">Production aujourd'hui</span>
          <span className="solar-card__stat-value">{formatEnergy(today)}</span>
        </div>
      </div>

      {isProducing && <div className="solar-card__glow" />}
    </div>
  );
};
