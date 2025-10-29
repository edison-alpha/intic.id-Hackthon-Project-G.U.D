import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface EOContextType {
  isEOMode: boolean;
  toggleEOMode: () => void;
  setEOMode: (value: boolean) => void;
  isTransitioning: boolean;
}

const EOContext = createContext<EOContextType | undefined>(undefined);

export const EOProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load from localStorage on init
  const [isEOMode, setIsEOMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('intic_eo_mode');
    return stored === 'true';
  });
  
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem('intic_eo_mode', isEOMode.toString());
    console.log('🎯 EO Mode:', isEOMode ? 'ENABLED' : 'DISABLED');
  }, [isEOMode]);

  const toggleEOMode = () => {
    setIsTransitioning(true);
    
    // Start transition animation
    setTimeout(() => {
      setIsEOMode(prev => !prev);
      
      // End transition after animation completes
      setTimeout(() => {
        setIsTransitioning(false);
      }, 1500); // Match animation duration
    }, 100);
  };

  const setEOMode = (value: boolean) => {
    if (value !== isEOMode) {
      setIsTransitioning(true);
      
      setTimeout(() => {
        setIsEOMode(value);
        
        setTimeout(() => {
          setIsTransitioning(false);
        }, 1500);
      }, 100);
    }
  };

  return (
    <EOContext.Provider value={{ isEOMode, toggleEOMode, setEOMode, isTransitioning }}>
      {children}
    </EOContext.Provider>
  );
};

export const useEOMode = () => {
  const context = useContext(EOContext);
  if (context === undefined) {
    throw new Error('useEOMode must be used within an EOProvider');
  }
  return context;
};
