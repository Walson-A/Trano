import React, { useState } from 'react';
import { useHA } from '../../context/HAContext';
import { WeatherModal } from './WeatherModal';
import { 
  Sun, Moon, Cloud, CloudFog, CloudHail, 
  CloudLightning, CloudSun, CloudRain, 
  CloudDrizzle, Snowflake, Wind, CloudOff,
  Zap, Droplets
} from 'lucide-react';

const WEATHER_MAPPING = {
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

export const WeatherIcon = ({ state, size = 40 }) => {
  const iconProps = { size: size * 0.8, strokeWidth: 1.5 };
  
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
          <Cloud size={size * 0.8} color="var(--color-cloud)" strokeWidth={2} style={{ position: 'absolute', bottom: 0, left: 0, fill: 'var(--bg-color)', paintOrder: 'fill' }} />
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
    
    case 'lightning':
    case 'lightning-rainy':
      return (
        <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Cloud size={size * 0.8} color="var(--color-cloud)" strokeWidth={1.5} style={{ position: 'absolute', top: 0 }} />
          <Zap size={size * 0.5} color="var(--color-sun)" strokeWidth={2} style={{ position: 'absolute', bottom: -2, fill: 'var(--color-sun)', fillOpacity: 0.2 }} />
        </div>
      );

    case 'snowy':
    case 'snowy-rainy':
      return (
        <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Cloud size={size * 0.8} color="var(--color-cloud)" strokeWidth={1.5} style={{ position: 'absolute', top: 0 }} />
          <Snowflake size={size * 0.5} color="var(--color-snow)" strokeWidth={1.5} style={{ position: 'absolute', bottom: 0 }} />
        </div>
      );

    case 'fog':
      return <CloudFog size={size} color="var(--color-cloud)" strokeWidth={1.5} />;
    
    case 'windy':
    case 'windy-variant':
      return <Wind size={size} color="var(--color-cloud)" strokeWidth={1.5} />;

    default:
      return <Cloud size={size} color="var(--color-cloud)" strokeWidth={1.5} />;
  }
};

export const WeatherWidget = ({ entityId = 'weather.forecast_maison' }) => {
  const { entities } = useHA();
  const weatherEntity = entities[entityId];
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!weatherEntity) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '6px 16px', borderRadius: '20px',
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        boxShadow: 'var(--card-shadow)', cursor: 'wait',
      }}>
        <CloudOff size={24} color="var(--text-muted)" strokeWidth={1.5} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-muted)', lineHeight: 1.1 }}>--°C</span>
          <span style={{ fontSize: '0.75rem', fontWeight: '400', color: 'var(--text-muted)' }}>Chargement...</span>
        </div>
      </div>
    );
  }

  const { state, attributes } = weatherEntity;
  const temp = attributes.temperature != null ? Math.round(attributes.temperature) : '--';
  const unit = attributes.temperature_unit || '°C';
  const label = WEATHER_MAPPING[state]?.label || state;

  return (
    <>
      <div 
        title="Voir les prévisions"
        onClick={() => setIsModalOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '10px 20px',
          borderRadius: '24px',
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--card-shadow)',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
          e.currentTarget.style.background = 'var(--card-bg-hover)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.background = 'var(--card-bg)';
          e.currentTarget.style.borderColor = 'var(--card-border)';
        }}
      >
        <WeatherIcon state={state} size={40} />
        
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '1.4rem', fontWeight: '600', color: 'var(--text-main)', lineHeight: 1.1 }}>
            {temp}{unit}
          </span>
          <span style={{ fontSize: '0.85rem', fontWeight: '400', color: 'var(--text-muted)', textTransform: 'capitalize', letterSpacing: '0.3px' }}>
            {label}
          </span>
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

