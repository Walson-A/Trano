import React from 'react';
import { Typography } from '../../ui/Typography/Typography';

export const RoomsView = () => {
  return (
    <div>
      <Typography variant="title">Pièces</Typography>
      <Typography variant="body" color="secondary" style={{ marginTop: '1rem' }}>
        Navigation par pièce et contrôle détaillé des lumières.
      </Typography>
    </div>
  );
};
