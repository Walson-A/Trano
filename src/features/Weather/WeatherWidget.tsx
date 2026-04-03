import React, { useState } from 'react';
import { useHA } from '../../context/HAContext';
import { 
  Sun, Moon, Cloud, CloudFog, CloudHail, 
  CloudLightning, CloudSun, CloudRain, 
  CloudDrizzle, Snowflake, Wind, CloudOff,
  Zap, Droplets
} from 'lucide-react';

export const WEATHER_MAPPING: Record<string, { label: string }> = {
  'clear-night': { label: 'Nuit claire' },
  'cloudy': { label: 'Nuageux' },
  'fog': { label: 'Brouillard' },
  'hail': { label: 'Grêle' },
  'lightning': { label: 'Orage' },
  'lightning-rainy': { label: 'Orage et pluie' },
  'partlycloudy': { label: 'Éclaircies' },
  'pouring': { label: 'Averses' },
  'rainy': { label: 'Pluvieux' },
  'snowy': { label: 'Neige' },
  'snowy-rainy': { label: 'Pluie mêlée' },
  'sunny': { label: 'Ensoleillé' },
  'windy': { label: 'Venteux' },
  'windy-variant': { label: 'Venteux' },
};

import { WeatherModal } from './WeatherModal';

export const WeatherIcon: React.FC<{ state: string; size?: number }> = ({ state, size = 40 }) => {
  // ... (previous implementation remains same)
  switch (state) {
    case 'sunny':
      return <Sun size={size} color="var(--color-sun)" strokeWidth={1.5} style={{ filter: 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.4))' }} />;
    case 'clear-night':
      return <Moon size={size} color="var(--color-cloud)" strokeWidth={1.5} />;
    case 'cloudy':
      return <Cloud size={size} color="var(--color-cloud)" strokeWidth={1.5} />;
    case 'partlycloudy':
      return (
        <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sun size={size * 0.75} color="var(--color-sun)" strokeWidth={1.5} style={{ position: 'absolute', top: -4, right: -4, filter: 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.3))' }} />
          <Cloud size={size * 0.8} color="var(--color-cloud)" strokeWidth={2} style={{ position: 'absolute', bottom: 0, left: 0 }} />
        </div>
      );
    case 'rainy':
    case 'pouring':
      return (
        <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Cloud size={size * 0.85} color="var(--color-cloud)" strokeWidth={1.5} style={{ position: 'absolute', top: 0 }} />
          <Droplets size={size * 0.55} color="var(--color-rain)" strokeWidth={2} style={{ position: 'absolute', bottom: -2 }} />
        </div>
      );
    default:
      return <Cloud size={size} color="var(--color-cloud)" strokeWidth={1.5} />;
  }
};

const DEFAULT_WEATHER_ENTITY = import.meta.env.VITE_HA_WEATHER_ENTITY || 'weather.forecast_home';

export const WeatherWidget: React.FC<{ entityId?: string }> = ({ entityId = DEFAULT_WEATHER_ENTITY }) => {
  const { entities, status } = useHA();
  const weatherEntity = entities[entityId];
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isUnavailable = !weatherEntity || weatherEntity.state === 'unavailable' || weatherEntity.state === 'unknown';

  if (isUnavailable) {
    const message = status === 'connecting' ? 'Connexion...'
      : status === 'error' ? 'HA déconnecté'
      : !weatherEntity ? 'Entité introuvable'
      : 'Non disponible';

    return (
      <div className="flex items-center gap-3 px-4 py-2 opacity-50" title={message}>
        <CloudOff size={24} className="text-zinc-500" />
        <div className="flex flex-col">
          <span className="text-lg font-bold">--°C</span>
          <span className="text-xs text-zinc-500">{message}</span>
        </div>
      </div>
    );
  }

  const { state, attributes } = weatherEntity;
  const temp = typeof attributes.temperature === 'number' ? Math.round(attributes.temperature) : null;
  const label = WEATHER_MAPPING[state]?.label || state;

  return (
    <>
      <div 
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-4 px-5 py-2 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/40 rounded-3xl transition-all active:scale-95"
      >
        <WeatherIcon state={state} size={36} />
        <div className="flex flex-col leading-tight">
          <span className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">{temp !== null ? `${temp}°C` : '--°C'}</span>
          <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 capitalize">{label}</span>
        </div>
      </div>
      <WeatherModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        entityId={entityId} 
      />
    </>
  );
};
