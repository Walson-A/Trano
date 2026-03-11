import React from 'react';
import { Typography } from '../../ui/Typography/Typography';

export const SettingsView = () => {
  return (
    <div>
      <Typography variant="title">Réglages</Typography>
      <Typography variant="body" color="secondary" style={{ marginTop: '1rem' }}>
        Configuration de l'accès Home Assistant.
      </Typography>
    </div>
  );
};
