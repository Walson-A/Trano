import React from 'react';
import { Device } from '../types';
import { DeviceCard } from '../components/DeviceCard';

interface RoomsProps {
  devices: Device[];
  onToggleDevice: (id: string) => void;
}

export function Rooms({ devices, onToggleDevice }: RoomsProps) {
  // Group devices by room
  const rooms = Array.from(new Set(devices.map(d => d.room))).sort();

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-6 lg:p-12 pb-28 md:pb-12 bg-zinc-50 dark:bg-[#111111] transition-colors duration-300">
      <header className="mb-8 md:mb-10">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Pièces
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2">
          Gérez les appareils de chaque pièce.
        </p>
      </header>

      <div className="flex flex-col gap-8 md:gap-12">
        {rooms.map(room => {
          const roomDevices = devices.filter(d => d.room === room);
          
          return (
            <section key={room}>
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-100 capitalize">{room}</h2>
                <span className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">{roomDevices.length} appareil{roomDevices.length > 1 ? 's' : ''}</span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {roomDevices.map(device => (
                  <DeviceCard 
                    key={device.id} 
                    device={device} 
                    onToggle={onToggleDevice} 
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
