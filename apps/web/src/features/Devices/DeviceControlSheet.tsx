import React from 'react';
import { Modal } from '../../ui/Modal/Modal';
import { useHA } from '../../context/HAContext';
import { useDeviceControls } from '../../core/store/useDeviceControls';
import type { SheetProps } from './useOptimistic';
import { LightSheet } from './LightSheet';
import { MediaSheet } from './MediaSheet';
import { CoverSheet } from './CoverSheet';
import { ClimateSheet } from './ClimateSheet';

// Une fiche par domaine HA — chacune ne montre que les capacités réelles
// de l'appareil (supported_features / supported_color_modes).
const SHEETS: Record<string, React.ComponentType<SheetProps>> = {
  light: LightSheet,
  media_player: MediaSheet,
  cover: CoverSheet,
  climate: ClimateSheet,
};

export function DeviceControlSheet() {
  const { openId, close } = useDeviceControls();
  const { entities } = useHA();
  const entity = openId ? entities[openId] : undefined;
  const Sheet = openId ? SHEETS[openId.split('.')[0]] : undefined;

  if (!openId || !entity || !Sheet) {
    return <Modal isOpen={false} onClose={close} title=""><div /></Modal>;
  }
  return <Sheet entityId={openId} entity={entity} onClose={close} />;
}
