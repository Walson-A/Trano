import React from 'react';
import { useHA } from '../../context/HAContext';
import { Sun, Home, BatteryMedium, Zap } from 'lucide-react';
import './PowerFlowCard.css';

const formatPower = (val) => {
  const w = parseFloat(val);
  if (val === null || val === undefined || isNaN(w)) return '--';
  if (Math.abs(w) >= 1000) return `${(w / 1000).toFixed(1)} kW`;
  return `${Math.round(Math.abs(w))} W`;
};

// ---- SVG line endpoints (viewBox 360 x 280) ----
// Nodes:  Solar (180, 48), Home (180, 148), Battery (62, 234), Grid (298, 234), r=40
const LINES = {
  solar: {
    x1: 180, y1: 88,   // bottom of Solar circle
    x2: 180, y2: 108,  // top of Home circle
  },
  battery: {
    x1: 94,  y1: 210,  // top-right edge of Battery circle (toward Home)
    x2: 148, y2: 172,  // bottom-left edge of Home circle (toward Battery)
  },
  grid: {
    x1: 212, y1: 172,  // bottom-right edge of Home circle (toward Grid)
    x2: 266, y2: 210,  // top-left edge of Grid circle (toward Home)
  },
};

// ---- Flow line ----
const FlowLine = ({ x1, y1, x2, y2, active, direction, color }) => {
  const animClass = !active ? ''
    : direction === 'forward' ? 'flow-line--fwd'
    : 'flow-line--rev';

  return (
    <g>
      {/* Static track */}
      <line x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Animated flow */}
      {active && (
        <line x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="8 6"
          className={`flow-line ${animClass}`}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      )}
    </g>
  );
};

// ---- Node circle ----
const FlowNode = ({ cx, cy, r = 40, active, color, iconElement, label, value }) => (
  <g>
    {/* Background circle */}
    <circle cx={cx} cy={cy} r={r}
      fill="var(--card-bg)"
      stroke={active ? color : 'rgba(255,255,255,0.06)'}
      strokeWidth="1.5"
      style={{ filter: active ? `drop-shadow(0 0 10px ${color}33)` : 'none', transition: 'stroke 0.4s, filter 0.4s' }}
    />
    {/* Icon via foreignObject */}
    <foreignObject x={cx - 16} y={cy - 22} width="32" height="32">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        {iconElement}
      </div>
    </foreignObject>
    {/* Value text */}
    <text x={cx} y={cy + 18} textAnchor="middle"
      fontSize="11" fontWeight="700" fontFamily="Inter, system-ui, sans-serif"
      fill={active ? color : 'var(--text-muted)'}
      style={{ transition: 'fill 0.4s' }}
    >
      {value}
    </text>
    {/* Label text */}
    <text x={cx} y={cy + r + 16} textAnchor="middle"
      fontSize="10" fontWeight="500" fontFamily="Inter, system-ui, sans-serif"
      fill="var(--text-muted)"
    >
      {label}
    </text>
  </g>
);

// ---- Main Component ----
export const PowerFlowCard = ({ entityIds }) => {
  const { entities } = useHA();

  const solarPowerEnt   = entities[entityIds.solarPowerNow];
  const batteryPowerEnt = entities[entityIds.batteryPower];
  const gridPowerEnt    = entities[entityIds.gridPower];
  const homePowerEnt    = entities[entityIds.homePower];

  const solarPower   = solarPowerEnt  ? parseFloat(solarPowerEnt.state)  : null;
  const batteryPower = batteryPowerEnt ? parseFloat(batteryPowerEnt.state) : null;
  const gridPower    = gridPowerEnt   ? parseFloat(gridPowerEnt.state)   : null;
  const homePower    = homePowerEnt   ? parseFloat(homePowerEnt.state)   : null;

  // Flow directions
  const solarFlowing       = solarPower !== null && solarPower > 10;
  const batteryCharging    = batteryPower !== null && batteryPower > 5;   // power > 0 = charging
  const batteryDischarging = batteryPower !== null && batteryPower < -5;  // power < 0 = discharging
  const batteryActive      = batteryCharging || batteryDischarging;
  const gridImporting      = gridPower !== null && gridPower > 5;
  const gridExporting      = gridPower !== null && gridPower < -5;
  const gridActive         = gridImporting || gridExporting;
  const homeActive         = homePower !== null && homePower > 5;

  // Colors
  const C_SOLAR   = 'var(--color-sun)';
  const C_BATTERY = batteryCharging ? 'var(--color-energy)' : 'var(--color-sun)';
  const C_GRID    = gridImporting   ? 'var(--color-error)'  : 'var(--color-energy)';
  const C_HOME    = 'var(--color-accent)';

  return (
    <div className="flow-card">
      <div className="flow-card__header">
        <span className="flow-card__title">Flux d'énergie</span>
        <span className="flow-card__subtitle">Temps réel</span>
      </div>

      <div className="flow-card__diagram">
        <svg
          viewBox="0 0 360 300"
          xmlns="http://www.w3.org/2000/svg"
          className="flow-card__svg"
          aria-label="Diagramme de flux d'énergie"
        >
          {/* Solar → Home : always forward (top to bottom) */}
          <FlowLine
            {...LINES.solar}
            active={solarFlowing}
            direction="forward"
            color={C_SOLAR}
          />

          {/* Battery ↔ Home : charging = battery→home (rev), discharging = home→battery (fwd) */}
          <FlowLine
            {...LINES.battery}
            active={batteryActive}
            direction={batteryDischarging ? 'reverse' : 'forward'}
            color={C_BATTERY}
          />

          {/* Grid ↔ Home : importing = grid→home (rev), exporting = home→grid (fwd) */}
          <FlowLine
            {...LINES.grid}
            active={gridActive}
            direction={gridImporting ? 'reverse' : 'forward'}
            color={C_GRID}
          />

          {/* ---- Nodes ---- */}
          <FlowNode cx={180} cy={48}  label="Solaire"  value={formatPower(solarPower)}   active={solarFlowing}  color={C_SOLAR}
            iconElement={<Sun size={22} strokeWidth={1.8} color={solarFlowing ? C_SOLAR : 'var(--text-muted)'} />}
          />
          <FlowNode cx={180} cy={148} label="Maison"   value={formatPower(homePower)}    active={homeActive}    color={C_HOME}
            iconElement={<Home size={22} strokeWidth={1.8} color={homeActive ? C_HOME : 'var(--text-muted)'} />}
          />
          <FlowNode cx={62}  cy={234} label="Batterie" value={formatPower(batteryPower)} active={batteryActive} color={C_BATTERY}
            iconElement={<BatteryMedium size={22} strokeWidth={1.8} color={batteryActive ? C_BATTERY : 'var(--text-muted)'} />}
          />
          <FlowNode cx={298} cy={234} label="Réseau"   value={formatPower(gridPower)}    active={gridActive}    color={C_GRID}
            iconElement={<Zap size={22} strokeWidth={1.8} color={gridActive ? C_GRID : 'var(--text-muted)'} />}
          />
        </svg>
      </div>
    </div>
  );
};
