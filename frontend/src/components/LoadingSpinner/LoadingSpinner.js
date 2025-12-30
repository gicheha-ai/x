import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'medium', color = '#007bff', text = 'Loading...' }) => {
  const sizeMap = {
    small: '30px',
    medium: '50px',
    large: '80px'
  };

  const fontSizeMap = {
    small: '12px',
    medium: '14px',
    large: '16px'
  };

  const spinnerSize = sizeMap[size] || sizeMap.medium;
  const textSize = fontSizeMap[size] || fontSizeMap.medium;

  return (
    <div className="loading-spinner-container">
      <div 
        className="loading-spinner"
        style={{
          width: spinnerSize,
          height: spinnerSize,
          borderColor: color,
          borderTopColor: 'transparent'
        }}
      />
      {text && (
        <p className="loading-text" style={{ fontSize: textSize, color }}>
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
