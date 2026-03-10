import React from 'react';
import clsx from 'clsx';
import './Card.css';

export const Card = ({ children, className, onClick, active }) => {
  return (
    <div 
      className={clsx('tesla-card', active && 'active', className)} 
      onClick={onClick}
    >
      {children}
    </div>
  );
};
