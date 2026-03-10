import React from 'react';
import clsx from 'clsx';
import './Typography.css';

export const Typography = ({ 
  variant = 'body', 
  color = 'primary', 
  weight = 'normal', 
  children, 
  className 
}) => {
  const Component = variant === 'title' || variant === 'subtitle' ? 'h2' : 'span';
  return (
    <Component 
      className={clsx(
        'tesla-typography',
        `variant-${variant}`, 
        `color-${color}`,
        `weight-${weight}`,
        className
      )}
    >
      {children}
    </Component>
  );
};
