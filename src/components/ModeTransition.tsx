import React, { useEffect, useState } from 'react';
import { useEOMode } from '@/contexts/EOContext';
import EOModeLogo from '@/assets/EOmode.svg';
import UserModeLogo from '@/assets/userMode.svg';

const ModeTransition: React.FC = () => {
  const { isEOMode, isTransitioning } = useEOMode();
  const [showTransition, setShowTransition] = useState(false);

  useEffect(() => {
    if (isTransitioning) {
      setShowTransition(true);
    } else {
      // Keep showing for fade out animation
      const timer = setTimeout(() => {
        setShowTransition(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning]);

  if (!showTransition) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-500 ${
        isTransitioning ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #000000 100%)',
      }}
    >
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] animate-pulse" />
      </div>

      {/* Logo Container */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo with Animation */}
        <div
          className={`mb-8 transition-all duration-700 ${
            isTransitioning ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
          }`}
        >
          <div className="relative">
            {/* Glow Effect */}
            <div className="absolute inset-0 blur-3xl opacity-50 animate-pulse">
              <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full ${
                isEOMode ? 'bg-[#d548ec]' : 'bg-blue-500'
              }`} />
            </div>
            
            {/* Logo */}
            <img
              src={isEOMode ? EOModeLogo : UserModeLogo}
              alt={isEOMode ? 'EO Mode' : 'User Mode'}
              className="relative w-32 h-32 md:w-40 md:h-40 object-contain animate-bounce-slow"
              style={{
                filter: 'drop-shadow(0 0 30px rgba(213, 72, 236, 0.5))',
              }}
            />
          </div>
        </div>

        {/* Text */}
        <div
          className={`text-center transition-all duration-700 delay-200 ${
            isTransitioning ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
            {isEOMode ? 'Event Organizer Mode' : 'User Mode'}
          </h2>
          <p className="text-gray-400 text-sm md:text-base">
            {isEOMode ? 'Access full event management features' : 'Browse and discover amazing events'}
          </p>
        </div>

        {/* Loading Bar */}
        <div
          className={`mt-8 w-48 md:w-64 h-1 bg-white/10 rounded-full overflow-hidden transition-all duration-700 delay-300 ${
            isTransitioning ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
          }`}
        >
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isEOMode 
                ? 'bg-gradient-to-r from-[#d548ec] to-purple-600' 
                : 'bg-gradient-to-r from-blue-500 to-cyan-500'
            }`}
            style={{
              width: isTransitioning ? '100%' : '0%',
            }}
          />
        </div>
      </div>

      {/* Particles Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-1 h-1 rounded-full ${
              isEOMode ? 'bg-[#d548ec]' : 'bg-blue-500'
            } opacity-60 animate-float`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default ModeTransition;
