import React, { useState, useEffect, useRef } from 'react';
import { useHA } from '../../context/HAContext';
import { Modal } from '../../ui/Modal/Modal';
import { WeatherIcon } from './WeatherWidget';
import { ChevronDown } from 'lucide-react';

interface ForecastItem {
  datetime: string;
  condition: string;
  temperature: number;
  templow?: number;
  precipitation?: number;
}

const HourlyForecastItem: React.FC<{ item: ForecastItem }> = ({ item }) => {
  const d = new Date(item.datetime);
  const hourStr = d.getHours() + 'h';
  
  return (
    <div className="flex flex-col items-center gap-3 p-4 min-w-[80px] rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
      <span className="text-sm font-semibold text-zinc-100">{hourStr}</span>
      <WeatherIcon state={item.condition} size={32} />
      <span className="text-lg font-bold text-white mt-1">
        {Math.round(item.temperature)}°
      </span>
      {item.precipitation ? (
        <span className="text-[10px] font-bold text-blue-400 mt-[-4px]">
          {item.precipitation}mm
        </span>
      ) : (
        <div className="h-3" />
      )}
    </div>
  );
};

export const WeatherModal: React.FC<{ isOpen: boolean; onClose: () => void; entityId: string }> = ({ isOpen, onClose, entityId }) => {
  const { connection, entities } = useHA();
  const weatherEntity = entities[entityId];
  const [hourlyData, setHourlyData] = useState<ForecastItem[]>([]);
  const [dailyData, setDailyData] = useState<ForecastItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    
    const fetchForecast = async () => {
      setLoading(true);
      try {
        if (connection) {
          const resHourly: any = await connection.sendMessagePromise({
            type: 'call_service',
            domain: 'weather',
            service: 'get_forecasts',
            target: { entity_id: entityId },
            service_data: { type: 'hourly' },
            return_response: true
          });
          const resDaily: any = await connection.sendMessagePromise({
            type: 'call_service',
            domain: 'weather',
            service: 'get_forecasts',
            target: { entity_id: entityId },
            service_data: { type: 'daily' },
            return_response: true
          });
          
          setHourlyData(resHourly?.response?.[entityId]?.forecast || []);
          setDailyData(resDaily?.response?.[entityId]?.forecast || []);
        }
      } catch (e) {
        console.error("Forecast error:", e);
      }
      setLoading(false);
    };

    fetchForecast();
  }, [isOpen, connection, entityId]);

  const formatDayName = (datetimeStr: string) => {
    const d = new Date(datetimeStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (d.toDateString() === tomorrow.toDateString()) return "Demain";
    return d.toLocaleDateString('fr-FR', { weekday: 'long' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Prévisions Météo">
      {loading ? (
        <div className="py-20 text-center animate-pulse text-zinc-400">
          Calcul des prévisions en cours...
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {hourlyData.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Aujourd'hui</h3>
              <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                {hourlyData.slice(0, 12).map((item, idx) => (
                  <HourlyForecastItem key={idx} item={item} />
                ))}
              </div>
            </div>
          )}

          {dailyData.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 px-2">Prochains Jours</h3>
              <div className="flex flex-col gap-3">
                {dailyData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-5 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                    <span className="w-28 text-base font-semibold text-white/90 capitalize">
                      {formatDayName(item.datetime)}
                    </span>
                    <WeatherIcon state={item.condition} size={32} />
                    <div className="flex gap-4 w-28 justify-end font-bold items-baseline">
                      <span className="text-zinc-500 text-sm font-medium">{Math.round(item.templow || 0)}°</span>
                      <span className="text-white text-xl font-bold">{Math.round(item.temperature)}°</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
