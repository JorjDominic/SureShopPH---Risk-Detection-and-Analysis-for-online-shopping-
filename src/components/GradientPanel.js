import React from 'react';
import './gradient-panel.css';

/**
 * GradientPanel: A visual background surface for grouping content sections.
 * - Blue-green gradient with blurred circles for depth
 * - Optional grid overlay
 */
export default function GradientPanel({ children, gridOverlay = false, className = '' }) {
  return (
    <div className={`gradient-panel${gridOverlay ? ' grid-overlay' : ''} ${className}`}>
      <div className="gradient-panel-bg">
        <div className="circle circle1" />
        <div className="circle circle2" />
        <div className="circle circle3" />
      </div>
      <div className="gradient-panel-content">
        {children}
      </div>
    </div>
  );
}
