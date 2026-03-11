import React from 'react';
import { Typography } from '../../ui/Typography/Typography';

export const EnergyView = () => {
  return (
    <div>
      <Typography variant="title" style={{ color: 'var(--accent-energy)' }}>Énergie & Solaire</Typography>
      <Typography variant="body" color="secondary" style={{ marginTop: '1rem' }}>
        Tableau de bord de la production solaire, de la batterie et de la consommation Shelly.
      </Typography>
    </div>
  );
};
