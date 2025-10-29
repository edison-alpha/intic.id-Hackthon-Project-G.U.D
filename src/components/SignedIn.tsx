import React, { ReactNode } from 'react';

interface SignedInProps {
  children: ReactNode;
}

/**
 * Component wrapper - authentication disabled
 */
export const SignedIn: React.FC<SignedInProps> = ({ children }) => {
  return <>{children}</>;
};
