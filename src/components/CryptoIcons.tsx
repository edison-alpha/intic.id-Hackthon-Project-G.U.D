import React from 'react';

interface CryptoIconProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ETHIcon: React.FC<CryptoIconProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <svg
      className={`${sizeClasses[size]} ${className}`}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_1_2)">
        <path
          d="M16 32C24.8366 32 32 24.8366 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32Z"
          fill="#627EEA"
        />
        <path
          d="M16.498 4V12.87L23.995 16.22L16.498 4Z"
          fill="white"
          fillOpacity="0.602"
        />
        <path d="M16.498 4L9 16.22L16.498 12.87V4Z" fill="white" />
        <path
          d="M16.498 21.968V27.995L24 17.616L16.498 21.968Z"
          fill="white"
          fillOpacity="0.602"
        />
        <path d="M16.498 27.995V21.967L9 17.616L16.498 27.995Z" fill="white" />
        <path d="M16.498 20.573L23.995 16.22L16.498 12.87V20.573Z" fill="white" fillOpacity="0.2" />
        <path d="M9 16.22L16.498 20.573V12.87L9 16.22Z" fill="white" fillOpacity="0.602" />
      </g>
      <defs>
        <clipPath id="clip0_1_2">
          <rect width="32" height="32" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};

export const SOLIcon: React.FC<CryptoIconProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <svg
      className={`${sizeClasses[size]} ${className}`}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_1_3)">
        <path
          d="M16 32C24.8366 32 32 24.8366 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32Z"
          fill="#9945FF"
        />
        <path
          d="M8.5 11.5C8.5 10.6716 9.17157 10 10 10H22C22.8284 10 23.5 10.6716 23.5 11.5C23.5 12.3284 22.8284 13 22 13H10C9.17157 13 8.5 12.3284 8.5 11.5Z"
          fill="white"
        />
        <path
          d="M8.5 16.5C8.5 15.6716 9.17157 15 10 15H22C22.8284 15 23.5 15.6716 23.5 16.5C23.5 17.3284 22.8284 18 22 18H10C9.17157 18 8.5 17.3284 8.5 16.5Z"
          fill="white"
        />
        <path
          d="M10 20.5C9.17157 20.5 8.5 21.1716 8.5 22C8.5 22.8284 9.17157 23.5 10 23.5H18C18.8284 23.5 19.5 22.8284 19.5 22C19.5 21.1716 18.8284 20.5 18 20.5H10Z"
          fill="white"
        />
      </g>
      <defs>
        <clipPath id="clip0_1_3">
          <rect width="32" height="32" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};

export default { ETHIcon, SOLIcon };