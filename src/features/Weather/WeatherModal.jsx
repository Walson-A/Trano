import React, { useState, useEffect, useRef } from 'react';
import { useHA } from '../../context/HAContext';
import { Modal } from '../../ui/Modal/Modal';
import { WeatherIcon } from './WeatherWidget';
import { ChevronDown } from 'lucide-react';
import './WeatherModal.css';

const HourlyForecastItem = ({ item, showDay, dayName }) => {
  const d = new Date(item.datetime);
  const hourStr = d.getHours() + 'h';
  
  return (
    <div 
      className="forecast-item"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
        padding: '16px 12px',
        minWidth: '80px',
        borderRadius: '24px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '36px' }}>
        {showDay && <span style={{ fontSize: '0.8rem', color: 'var(--color-accent)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '2px' }}>{dayName.slice(0, 3)}</span>}
        <span style={{ fontSize: '1rem', color: 'var(--text-main)', fontWeight: '600' }}>{hourStr}</span>
      </div>
      
      <WeatherIcon state={item.condition} size={36} />
      
      <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)', marginTop: '4px' }}>
        {Math.round(item.temperature)}°
      </span>
      
      {item.precipitation > 0 ? (
        <span style={{ fontSize: '0.8rem', color: 'var(--color-rain)', fontWeight: '600', marginTop: '-4px' }}>
          {item.precipitation}mm
        </span>
      ) : (
        <span style={{ fontSize: '0.8rem', color: 'transparent', fontWeight: '600', marginTop: '-4px' }}>
          0mm
        </span>
      )}
    </div>
  );
};

export const WeatherModal = ({ isOpen, onClose, entityId }) => {
  const { connection, entities } = useHA();
  const weatherEntity = entities[entityId];
  const [hourlyData, setHourlyData] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      hasFetchedRef.current = false; // Reset when closed
      return;
    }
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    let isMounted = true;
    const fetchForecast = async () => {
      setLoading(true);
      let hData = [];
      let dData = [];

      try {
        // Fetch both hourly and daily in parallel if connection exists
        if (connection) {
          const [resHourly, resDaily] = await Promise.all([
            connection.sendMessagePromise({
              type: 'call_service',
              domain: 'weather',
              service: 'get_forecasts',
              target: { entity_id: entityId },
              service_data: { type: 'hourly' },
              return_response: true
            }),
            connection.sendMessagePromise({
              type: 'call_service',
              domain: 'weather',
              service: 'get_forecasts',
              target: { entity_id: entityId },
              service_data: { type: 'daily' },
              return_response: true
            })
          ]);
          
          hData = resHourly?.response?.[entityId]?.forecast || resHourly?.[entityId]?.forecast || [];
          dData = resDaily?.response?.[entityId]?.forecast || resDaily?.[entityId]?.forecast || [];
        } else if (weatherEntity?.attributes?.forecast) {
           // Fallback for older HA
           dData = weatherEntity.attributes.forecast;
        }
      } catch (e) {
        console.error("Forecast fetch error:", e);
      }

      if (isMounted) {
        setHourlyData(hData);
        setDailyData(dData);
        setLoading(false);
      }
    };

    fetchForecast();
    return () => { isMounted = false; };
  }, [isOpen, connection, entityId]); // Removed hasFetched to prevent cancelling effect

  const formatDayName = (datetimeStr) => {
    const d = new Date(datetimeStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (d.toDateString() === tomorrow.toDateString()) return "Demain";
    return d.toLocaleDateString('fr-FR', { weekday: 'long' });
  };

  const unit = weatherEntity?.attributes?.temperature_unit || '°C';

  const [expandedDay, setExpandedDay] = useState(null);

  // Generic Drag to scroll logic
  const dragInfo = useRef({ isDown: false, startX: 0, scrollLeft: 0, target: null });

  const startDragging = (e) => {
    dragInfo.current.isDown = true;
    dragInfo.current.target = e.currentTarget;
    dragInfo.current.startX = e.pageX - e.currentTarget.offsetLeft;
    dragInfo.current.scrollLeft = e.currentTarget.scrollLeft;
    e.currentTarget.style.cursor = 'grabbing';
  };

  const stopDragging = (e) => {
    dragInfo.current.isDown = false;
    if (dragInfo.current.target) {
      dragInfo.current.target.style.cursor = 'grab';
    }
    dragInfo.current.target = null;
  };

  const onDrag = (e) => {
    if (!dragInfo.current.isDown || dragInfo.current.target !== e.currentTarget) return;
    e.preventDefault();
    const x = e.pageX - e.currentTarget.offsetLeft;
    const walk = (x - dragInfo.current.startX) * 1.5; // Scroll speed multiplier
    e.currentTarget.scrollLeft = dragInfo.current.scrollLeft - walk;
  };

  const todayHourly = hourlyData.filter(item => 
    new Date(item.datetime).toDateString() === new Date().toDateString()
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Prévisions Météo">
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ animation: 'pulse 1.5s infinite', fontSize: '1.2rem' }}>Calcul des prévisions...</div>
        </div>
      ) : hourlyData.length === 0 && dailyData.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Aucune prévision disponible pour cette maison.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Continuous Hourly Timeline (Today Only) */}
          {todayHourly.length > 0 && (
            <div style={{ paddingBottom: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '16px', paddingLeft: '8px' }}>
                Aujourd'hui
              </div>
              <div 
                onMouseDown={startDragging}
                onMouseLeave={stopDragging}
                onMouseUp={stopDragging}
                onMouseMove={onDrag}
                style={{ 
                  display: 'flex', 
                  gap: '8px',
                  overflowX: 'auto',
                  paddingBottom: '16px',
                  scrollbarWidth: 'none', msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch',
                  cursor: 'grab',
                  userSelect: 'none',
                  transform: 'translateZ(0)',
                  willChange: 'transform'
                }}
              >
                {todayHourly.map((item, idx) => (
                  <HourlyForecastItem 
                    key={idx} 
                    item={item} 
                    showDay={false} 
                    dayName="" 
                  />
                ))}
              </div>
            </div>
          )}

          {/* Daily Summaries Vertical List */}
          {dailyData.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '12px', paddingLeft: '8px' }}>
                Prochains Jours
              </div>
              {dailyData.map((item, idx) => {
                const itemDateStr = new Date(item.datetime).toDateString();
                const isToday = itemDateStr === new Date().toDateString();
                
                if (isToday && todayHourly.length > 0) return null; // Skip today in daily list if hourly is shown top
                
                const isExpanded = expandedDay === itemDateStr;
                const dayHourly = hourlyData.filter(h => new Date(h.datetime).toDateString() === itemDateStr);

                const hasHourly = dayHourly.length > 0;

                return (
                  <div key={idx} style={{
                    display: 'flex', flexDirection: 'column',
                    padding: '16px 20px',
                    borderRadius: '16px',
                    background: isExpanded ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                    marginBottom: '8px',
                    transition: 'background 0.3s ease',
                  }}>
                    <div 
                      style={{ 
                        display: 'flex', alignItems: 'center', 
                        cursor: hasHourly ? 'pointer' : 'default',
                        userSelect: 'none'
                      }}
                      onClick={() => hasHourly && setExpandedDay(isExpanded ? null : itemDateStr)}
                    >
                      <div style={{ width: '130px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', display: 'flex', justifyContent: 'center' }}>
                          {hasHourly && (
                            <ChevronDown 
                              size={20} 
                              style={{ 
                                color: isExpanded ? 'var(--color-accent)' : 'var(--text-muted)',
                                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s',
                                transform: isExpanded ? 'rotate(0)' : 'rotate(-90deg)'
                              }} 
                            />
                          )}
                        </div>
                        <span style={{ fontSize: '1.1rem', color: isExpanded ? 'var(--color-accent)' : 'var(--text-main)', fontWeight: '500', textTransform: 'capitalize', transition: 'color 0.2s' }}>
                          {formatDayName(item.datetime)}
                        </span>
                      </div>
                      
                      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                        <WeatherIcon state={item.condition} size={32} />
                      </div>
                      
                      <div style={{ width: '130px', display: 'flex', justifyContent: 'flex-end', gap: '16px', fontSize: '1.1rem', fontWeight: '600' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{Math.round(item.templow)}°</span>
                        <span style={{ color: 'var(--text-main)' }}>{Math.round(item.temperature)}°</span>
                      </div>
                    </div>

                    {isExpanded && hasHourly && (
                      <div 
                        onMouseDown={startDragging}
                        onMouseLeave={stopDragging}
                        onMouseUp={stopDragging}
                        onMouseMove={onDrag}
                        onClick={(e) => e.stopPropagation()}
                        style={{ 
                          display: 'flex', 
                          gap: '8px',
                          overflowX: 'auto',
                          marginTop: '20px',
                          paddingTop: '20px',
                          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                          scrollbarWidth: 'none', msOverflowStyle: 'none',
                          WebkitOverflowScrolling: 'touch',
                          cursor: 'grab',
                          userSelect: 'none',
                          transform: 'translateZ(0)',
                          willChange: 'transform'
                        }}
                      >
                        {dayHourly.map((hItem, hIdx) => (
                          <HourlyForecastItem 
                            key={hIdx} 
                            item={hItem} 
                            showDay={false} 
                            dayName="" 
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
