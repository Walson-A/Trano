import React, { useState } from 'react';
import { Device } from '../types';
import { Lightbulb, Thermometer, Lock, Tv, Power } from 'lucide-react';
import { cn } from '../utils';

interface FloorPlanProps {
  devices: Device[];
  onToggleDevice: (id: string) => void;
}

export function FloorPlan({ devices, onToggleDevice }: FloorPlanProps) {
  const [activeFloor, setActiveFloor] = useState<'RDC' | 'Etage'>('RDC');

  const floorDevices = devices.filter(d => d.floor === activeFloor);

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'light': return Lightbulb;
      case 'climate': return Thermometer;
      case 'lock': return Lock;
      case 'media': return Tv;
      default: return Power;
    }
  };

  const isDeviceActive = (device: Device) => {
    switch (device.type) {
      case 'light': return device.state.isOn;
      case 'climate': return device.state.mode !== 'off';
      case 'lock': return !device.state.isLocked;
      case 'media': return device.state.isPlaying;
      default: return false;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 dark:bg-[#111111] transition-colors duration-300 overflow-hidden pb-20 md:pb-0">
      <div className="p-4 sm:p-6 lg:p-12 pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10 shrink-0">
        <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Plan de masse</h1>
        
        {/* Floor Selector */}
        <div className="flex bg-zinc-200/50 dark:bg-zinc-800/50 p-1 rounded-full self-start sm:self-auto">
          {(['RDC', 'Etage'] as const).map(floor => (
            <button
              key={floor}
              onClick={() => setActiveFloor(floor)}
              className={cn(
                "px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300",
                activeFloor === floor 
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm" 
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              {floor}
            </button>
          ))}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative p-4 sm:p-6 lg:p-12 flex items-center justify-center min-h-0 overflow-hidden">
        {/* The Blueprint Area */}
        <div className="relative h-full max-h-[600px] max-w-full aspect-[4/3] bg-zinc-200/30 dark:bg-zinc-800/30 rounded-2xl sm:rounded-3xl border-2 border-zinc-300/50 dark:border-zinc-700/50 shadow-inner overflow-hidden">
          
          {/* Stylized Room Dividers (Mock layout) */}
          {activeFloor === 'RDC' ? (
            <>
              {/* Salon */}
              <div className="absolute top-0 left-0 w-[60%] h-[60%] border-r-2 border-b-2 border-zinc-300/50 dark:border-zinc-700/50 flex items-center justify-center">
                <span className="text-zinc-400 dark:text-zinc-600 font-medium text-xs sm:text-base md:text-xl tracking-widest uppercase opacity-50">Salon</span>
              </div>
              {/* Cuisine */}
              <div className="absolute top-0 right-0 w-[40%] h-[60%] border-b-2 border-zinc-300/50 dark:border-zinc-700/50 flex items-center justify-center">
                <span className="text-zinc-400 dark:text-zinc-600 font-medium text-xs sm:text-base md:text-xl tracking-widest uppercase opacity-50">Cuisine</span>
              </div>
              {/* Entrée */}
              <div className="absolute bottom-0 left-0 w-full h-[40%] flex items-center justify-center">
                <span className="text-zinc-400 dark:text-zinc-600 font-medium text-xs sm:text-base md:text-xl tracking-widest uppercase opacity-50">Entrée</span>
              </div>
            </>
          ) : (
            <>
              {/* Chambre 1 */}
              <div className="absolute top-0 left-0 w-[50%] h-[50%] border-r-2 border-b-2 border-zinc-300/50 dark:border-zinc-700/50 flex items-center justify-center">
                <span className="text-zinc-400 dark:text-zinc-600 font-medium text-xs sm:text-base md:text-xl tracking-widest uppercase opacity-50">Chambre 1</span>
              </div>
              {/* Chambre 2 */}
              <div className="absolute top-0 right-0 w-[50%] h-[50%] border-b-2 border-zinc-300/50 dark:border-zinc-700/50 flex items-center justify-center">
                <span className="text-zinc-400 dark:text-zinc-600 font-medium text-xs sm:text-base md:text-xl tracking-widest uppercase opacity-50">Chambre 2</span>
              </div>
              {/* SDB & Couloir */}
              <div className="absolute bottom-0 left-0 w-[50%] h-[50%] border-r-2 border-zinc-300/50 dark:border-zinc-700/50 flex items-center justify-center">
                <span className="text-zinc-400 dark:text-zinc-600 font-medium text-xs sm:text-base md:text-xl tracking-widest uppercase opacity-50">SDB</span>
              </div>
              <div className="absolute bottom-0 right-0 w-[50%] h-[50%] flex items-center justify-center">
                <span className="text-zinc-400 dark:text-zinc-600 font-medium text-xs sm:text-base md:text-xl tracking-widest uppercase opacity-50">Couloir</span>
              </div>
            </>
          )}

          {/* Devices Overlay */}
          {floorDevices.map(device => {
            const Icon = getDeviceIcon(device.type);
            const active = isDeviceActive(device);
            
            return (
              <button
                key={device.id}
                onClick={() => onToggleDevice(device.id)}
                className={cn(
                  "absolute transform -translate-x-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 group border-2",
                  "bg-white dark:bg-zinc-800",
                  active 
                    ? "border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)] dark:shadow-[0_0_15px_rgba(96,165,250,0.2)]" 
                    : "border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400"
                )}
                style={{ left: `${device.position.x}%`, top: `${device.position.y}%` }}
                title={device.name}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                
                {/* Tooltip */}
                <span className={cn(
                  "absolute -top-8 sm:-top-10 left-1/2 transform -translate-x-1/2 text-[10px] sm:text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none",
                  active ? "bg-blue-600 dark:bg-blue-500 text-white" : "bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900"
                )}>
                  {device.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
