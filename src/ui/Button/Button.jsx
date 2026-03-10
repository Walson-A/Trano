import React from 'react';
import clsx from 'clsx';
import './Button.css';

export const Button = ({ children, onClick, active, className, icon }) => {
  return (
    <button 
      className={clsx('tesla-button', active && 'active', className)} 
      onClick={onClick}
    >
      {icon && <span className="tesla-btn-icon">{icon}</span>}
      {children && <span className="tesla-btn-text">{children}</span>}
    </button>
  );
};
