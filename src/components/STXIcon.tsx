import React from 'react';
import monoWhiteSvg from '../assets/Mono_White.svg';

interface PUSHIconProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const PUSHIcon: React.FC<PUSHIconProps> = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    sm: { container: 'w-4 h-4', svg: '16', icon: 'w-2 h-2' },
    md: { container: 'w-5 h-5', svg: '20', icon: 'w-3 h-3' },
    lg: { container: 'w-8 h-8', svg: '32', icon: 'w-5 h-5' },
    xl: { container: 'w-9 h-9', svg: '36', icon: 'w-6 h-6' },
  };

  const { container, svg, icon } = sizeMap[size];

  return (
    <div className={`relative ${container} flex items-center justify-center ${className}`}>
      <svg width={svg} height={svg} viewBox={`0 0 ${svg} ${svg}`} className="absolute">
        <defs>
          <radialGradient id={`paint0_radial_push_${size}`}>
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#7c3aed" />
          </radialGradient>
        </defs>
        <circle cx={parseInt(svg) / 2} cy={parseInt(svg) / 2} r={parseInt(svg) / 2} fill={`url(#paint0_radial_push_${size})`} />
      </svg>
      <img
        src={monoWhiteSvg}
        alt="PUSH"
        className={`${icon} relative z-10`}
      />
    </div>
  );
};

export default PUSHIcon;
// Keep backward compatibility
export { PUSHIcon as STXIcon };
