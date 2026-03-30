import React from 'react';
import { useHA } from '../../context/HAContext';
import './BatteryCard.css';

// ---- Helpers ----

const formatPower = (val) => {
  const w = parseFloat(val);
  if (val === null || val === undefined || isNaN(w)) return '--';
  if (Math.abs(w) >= 1000) return `${(w / 1000).toFixed(2)} kW`;
  return `${Math.round(Math.abs(w))} W`;
};

// Battery color based on state of charge
const getBatteryColor = (pct) => {
  if (pct < 20) return 'var(--color-error)';
  if (pct < 50) return 'var(--color-sun)';
  return 'var(--color-energy)';
};

// Build SVG arc path (270° gauge, starts from bottom-left going CW)
const buildArcPath = (percent, cx, cy, r) => {
  const START_ANGLE = -225; // degrees, starting at bottom-left
  const TOTAL_ANGLE = 270;  // degrees span

  const toRad = (deg) => (deg * Math.PI) / 180;
  const clampedPct = Math.min(Math.max(percent, 0), 100);

  const sx = cx + r * Math.cos(toRad(START_ANGLE));
  const sy = cy + r * Math.sin(toRad(START_ANGLE));

  // Background arc end point (full 270°)
  const bgEndAngle = START_ANGLE + TOTAL_ANGLE;
  const bex = cx + r * Math.cos(toRad(bgEndAngle));
  const bey = cy + r * Math.sin(toRad(bgEndAngle));

  // Progress arc end point
  const progEndAngle = START_ANGLE + TOTAL_ANGLE * (clampedPct / 100);
  const pex = cx + r * Math.cos(toRad(progEndAngle));
  const pey = cy + r * Math.sin(toRad(progEndAngle));

  const bgLargeArc = TOTAL_ANGLE > 180 ? 1 : 0;
  const progLargeArc = TOTAL_ANGLE * (clampedPct / 100) > 180 ? 1 : 0;

  return {
    sx: sx.toFixed(2), sy: sy.toFixed(2),
    bex: bex.toFixed(2), bey: bey.toFixed(2),
    pex: pex.toFixed(2), pey: pey.toFixed(2),
    bgLargeArc,
    progLargeArc,
    bgPath: `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 ${bgLargeArc} 1 ${bex.toFixed(2)} ${bey.toFixed(2)}`,
    progPath: clampedPct > 0
      ? `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 ${progLargeArc} 1 ${pex.toFixed(2)} ${pey.toFixed(2)}`
      : null,
  };
};

// ---- Component ----

export const BatteryCard = ({ entityIds }) => {
  const { entities } = useHA();
  const pctEnt  = entities[entityIds.batteryPercent];
  const powerEnt = entities[entityIds.batteryPower];

  const percent = pctEnt  ? parseFloat(pctEnt.state)  : null;
  const power   = powerEnt ? parseFloat(powerEnt.state) : null;

  const isCharging    = power !== null && power > 5;
  const isDischarging = power !== null && power < -5;

  const batteryColor = percent !== null ? getBatteryColor(percent) : 'var(--text-muted)';

  const cx = 60, cy = 60, r = 46;
  const arc = percent !== null ? buildArcPath(percent, cx, cy, r) : null;

  const statusLabel = power === null ? 'Hors ligne'
    : isCharging    ? 'En charge'
    : isDischarging ? 'Décharge'
    : 'En veille';

  const statusClass = power === null ? 'offline'
    : isCharging    ? 'charging'
    : isDischarging ? 'discharging'
    : 'idle';

  return (
    <div className={`battery-card battery-card--${statusClass}`}>
      <div className="battery-card__header">
        <span className="battery-card__title">Batterie</span>
        <span className={`battery-card__badge battery-card__badge--${statusClass}`}>
          {isCharging && '↑ '}
          {isDischarging && '↓ '}
          {statusLabel}
        </span>
      </div>

      <div className="battery-card__dial">
        {/* SVG Gauge Arc */}
        <svg viewBox="0 0 120 120" className="battery-card__svg">
          {/* Track */}
          {arc && (
            <path
              d={arc.bgPath}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="8"
              strokeLinecap="round"
            />
          )}
          {/* Progress */}
          {arc?.progPath && (
            <path
              d={arc.progPath}
              fill="none"
              stroke={batteryColor}
              strokeWidth="8"
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${batteryColor})`, transition: 'd 0.8s ease' }}
            />
          )}
        </svg>

        {/* Center value */}
        <div className="battery-card__center">
          <span className="battery-card__percent" style={{ color: batteryColor }}>
            {percent !== null ? `${Math.round(percent)}` : '--'}
          </span>
          <span className="battery-card__percent-symbol">%</span>
        </div>
      </div>

      <div className="battery-card__footer">
        <div className="battery-card__stat">
          <span className="battery-card__stat-label">Puissance</span>
          <span className="battery-card__stat-value" style={{ color: batteryColor }}>
            {isCharging ? '+' : isDischarging ? '-' : ''}{formatPower(power)}
          </span>
        </div>
      </div>
    </div>
  );
};
