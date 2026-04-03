import { useMemo, useState, useEffect } from 'react';
import { useHA } from '../context/HAContext';
import { Device, DeviceState, DeviceType, HA_DOMAIN_TO_TYPE, SUPPORTED_DOMAINS } from '../types';
import { HassEntity } from 'home-assistant-js-websocket';
import { useConfigStore } from '../core/store/useConfigStore';
import { HA_AREA_TO_ROOM, getRoomById } from '../config/rooms';

// ─── HA Registry Types ──────────────────────────────────────

interface HAArea {
  area_id: string;
  name: string;
}

interface HAEntityRegistryEntry {
  entity_id: string;
  area_id: string | null;
  device_id: string | null;
}

interface HADeviceRegistryEntry {
  id: string;
  area_id: string | null;
}

// ─── Helpers ────────────────────────────────────────────────

function getDeviceType(entityId: string): DeviceType {
  const domain = entityId.split('.')[0];
  return HA_DOMAIN_TO_TYPE[domain] ?? 'switch';
}

function buildDeviceState(entity: HassEntity, type: DeviceType): DeviceState {
  const attrs = entity.attributes;

  return {
    isOn: entity.state === 'on' || entity.state === 'playing' || entity.state === 'locked',
    brightness: attrs.brightness != null ? Math.round(attrs.brightness / 2.55) : undefined,
    temperature: attrs.current_temperature as number | undefined,
    targetTemp: attrs.temperature as number | undefined,
    mode: entity.state,
    isLocked: entity.state === 'locked',
    isPlaying: entity.state === 'playing',
    volume: attrs.volume_level != null ? Math.round(attrs.volume_level * 100) : undefined,
    position: attrs.current_position as number | undefined,
    title: (attrs.media_title as string) || undefined,
  };
}

function resolveRoomId(
  entityId: string,
  areaMap: Map<string, string>, // entity_id → area name (lowercase)
  overrideRoomId?: string
): string | null {
  // 1. User override (highest priority)
  if (overrideRoomId) return overrideRoomId;

  // 2. HA area mapping
  const areaName = areaMap.get(entityId);
  if (areaName) {
    const mapped = HA_AREA_TO_ROOM[areaName];
    if (mapped) return mapped;
  }

  // 3. Unassigned
  return null;
}

// ─── Hook ───────────────────────────────────────────────────

export function useHAAdapter() {
  const { entities, connection, status } = useHA();
  const deviceOverrides = useConfigStore((s) => s.deviceOverrides);

  // HA registries (areas, entity registry, device registry)
  const [areas, setAreas] = useState<HAArea[]>([]);
  const [entityRegistry, setEntityRegistry] = useState<HAEntityRegistryEntry[]>([]);
  const [deviceRegistry, setDeviceRegistry] = useState<HADeviceRegistryEntry[]>([]);

  // Fetch registries when connection is established
  useEffect(() => {
    if (!connection) return;

    const fetchRegistries = async () => {
      try {
        const [areasRes, entityRegRes, deviceRegRes] = await Promise.all([
          connection.sendMessagePromise<HAArea[]>({ type: 'config/area_registry/list' }),
          connection.sendMessagePromise<HAEntityRegistryEntry[]>({ type: 'config/entity_registry/list' }),
          connection.sendMessagePromise<HADeviceRegistryEntry[]>({ type: 'config/device_registry/list' }),
        ]);
        setAreas(areasRes);
        setEntityRegistry(entityRegRes);
        setDeviceRegistry(deviceRegRes);
      } catch (e) {
        console.error('Failed to fetch HA registries:', e);
      }
    };

    fetchRegistries();
  }, [connection]);

  // Build entity → area name map
  const areaMap = useMemo(() => {
    const areaIdToName = new Map<string, string>();
    for (const area of areas) {
      areaIdToName.set(area.area_id, area.name.toLowerCase());
    }

    const deviceIdToAreaId = new Map<string, string>();
    for (const dev of deviceRegistry) {
      if (dev.area_id) deviceIdToAreaId.set(dev.id, dev.area_id);
    }

    // entity_id → area name (lowercase)
    const map = new Map<string, string>();
    for (const entry of entityRegistry) {
      // Entity's own area takes priority, then fall back to its device's area
      const areaId = entry.area_id ?? (entry.device_id ? deviceIdToAreaId.get(entry.device_id) : null);
      if (areaId) {
        const areaName = areaIdToName.get(areaId);
        if (areaName) map.set(entry.entity_id, areaName);
      }
    }

    return map;
  }, [areas, entityRegistry, deviceRegistry]);

  // Build device list
  const devices = useMemo(() => {
    return (Object.values(entities) as HassEntity[])
      .filter(entity => {
        const domain = entity.entity_id.split('.')[0];
        if (!SUPPORTED_DOMAINS.includes(domain as any)) return false;
        // Filter out unavailable entities
        if (entity.state === 'unavailable') return false;
        // Filter out hidden devices
        const override = deviceOverrides[entity.entity_id];
        if (override?.hidden) return false;
        return true;
      })
      .map((entity): Device => {
        const override = deviceOverrides[entity.entity_id];
        const type = getDeviceType(entity.entity_id);
        const roomId = resolveRoomId(entity.entity_id, areaMap, override?.roomId);
        const room = roomId ? getRoomById(roomId) : null;

        return {
          id: entity.entity_id,
          name: override?.displayName || entity.attributes.friendly_name || entity.entity_id,
          type,
          roomId,
          floor: room?.floor ?? null,
          position: override?.position ?? null,
          state: buildDeviceState(entity, type),
        };
      });
  }, [entities, deviceOverrides, areaMap]);

  // Toggle device
  const toggleDevice = async (id: string) => {
    if (!connection) return;

    const entity = entities[id];
    if (!entity) return;

    const domain = id.split('.')[0];
    let service = '';

    switch (domain) {
      case 'light':
      case 'switch':
      case 'fan':
        service = entity.state === 'on' ? 'turn_off' : 'turn_on';
        break;
      case 'lock':
        service = entity.state === 'locked' ? 'unlock' : 'lock';
        break;
      case 'media_player':
        service = entity.state === 'playing' ? 'media_pause' : 'media_play';
        break;
      case 'cover':
        service = entity.state === 'open' ? 'close_cover' : 'open_cover';
        break;
      default:
        service = 'toggle';
    }

    try {
      await connection.sendMessagePromise({
        type: 'call_service',
        domain,
        service,
        target: { entity_id: id },
      });
    } catch (e) {
      console.error(`Failed to toggle device ${id}:`, e);
    }
  };

  return { devices, toggleDevice, status };
}
