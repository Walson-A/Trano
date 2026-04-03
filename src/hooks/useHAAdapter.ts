import { useMemo } from 'react';
import { useHA } from '../context/HAContext';
import { Device, DeviceType } from '../types';
import { HassEntity } from 'home-assistant-js-websocket';

const ROOM_MAPPING: Record<string, { room: string; floor: 'RDC' | 'Etage' }> = {
  'salon': { room: 'Salon', floor: 'RDC' },
  'cuisine': { room: 'Cuisine', floor: 'RDC' },
  'chambre': { room: 'Chambre', floor: 'Etage' },
  'sdb': { room: 'SDB', floor: 'Etage' },
  'entree': { room: 'Entrée', floor: 'RDC' },
  'bureau': { room: 'Bureau', floor: 'Etage' },
};

const getDeviceType = (entityId: string): DeviceType => {
  const domain = entityId.split('.')[0];
  switch (domain) {
    case 'light': return 'light';
    case 'climate': return 'climate';
    case 'lock': return 'lock';
    case 'media_player': return 'media';
    case 'sensor':
    case 'binary_sensor': return 'sensor';
    default: return 'light'; // Default fallback
  }
};

const getRoomInfo = (entityId: string) => {
  const parts = entityId.split('.')[1].split('_');
  for (const part of parts) {
    if (ROOM_MAPPING[part]) return ROOM_MAPPING[part];
  }
  return { room: 'Salon', floor: 'RDC' as const };
};

export function useHAAdapter() {
  const { entities, connection } = useHA();

  const devices = useMemo(() => {
    return (Object.values(entities) as HassEntity[])
      .filter(entity => {
        const domain = entity.entity_id.split('.')[0];
        return ['light', 'switch', 'climate', 'lock', 'media_player'].includes(domain);
      })
      .map(entity => {
        const info = getRoomInfo(entity.entity_id);
        const type = getDeviceType(entity.entity_id);
        
        const device: Device = {
          id: entity.entity_id,
          name: entity.attributes.friendly_name || entity.entity_id,
          type: type,
          room: info.room,
          floor: info.floor,
          position: { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 }, // Random for now
          state: {
            isOn: entity.state === 'on' || entity.state === 'playing' || entity.state === 'locked',
            brightness: entity.attributes.brightness ? Math.round(entity.attributes.brightness / 2.55) : undefined,
            temperature: entity.attributes.current_temperature,
            mode: entity.state,
            isLocked: entity.state === 'locked',
            isPlaying: entity.state === 'playing',
            volume: entity.attributes.volume_level ? Math.round(entity.attributes.volume_level * 100) : undefined,
          }
        };
        return device;
      });
  }, [entities]);

  const toggleDevice = async (id: string) => {
    if (!connection) return;
    
    const entity = entities[id];
    if (!entity) return;

    const domain = id.split('.')[0];
    let service = '';

    switch (domain) {
      case 'light':
      case 'switch':
        service = entity.state === 'on' ? 'turn_off' : 'turn_on';
        break;
      case 'lock':
        service = entity.state === 'locked' ? 'unlock' : 'lock';
        break;
      case 'media_player':
        service = entity.state === 'playing' ? 'media_pause' : 'media_play';
        break;
      default:
        service = 'toggle';
    }

    try {
      await connection.sendMessagePromise({
        type: 'call_service',
        domain,
        service,
        target: { entity_id: id }
      });
    } catch (e) {
      console.error(`Failed to toggle device ${id}:`, e);
    }
  };

  return { devices, toggleDevice };
}
