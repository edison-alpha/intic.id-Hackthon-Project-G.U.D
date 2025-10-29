import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * AuthCallback Component
 * 
 * Handles OAuth callback redirects after authentication
 * Integrates with PushChain wallet for account creation
 */
export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get OAuth parameters from URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state'); // Organization ID
        const error = params.get('error');

        if (error) {
          console.error('OAuth error:', error);
          const errorDescription = params.get('error_description') || 'Authentication failed';
          toast.error(errorDescription);
          navigate('/');
          return;
        }

        if (!code) {
          console.error('No authorization code received');
          toast.error('Invalid authentication response');
          navigate('/');
          return;
        }

        console.log('✅ OAuth callback received:', { code: code.substring(0, 10) + '...', state });
        
                // Wallet creation process
        console.log('Handling wallet creation...');
        toast.info('Wallet creation is currently disabled');
        
        // Redirect to app after a short delay
        setTimeout(() => {
          navigate('/app');
        }, 2000);
        
      } catch (error: unknown) {
        console.error('Error handling OAuth callback:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        toast.error(errorMessage || 'Authentication failed. Please try again.');
        navigate('/');
      }
    };

    handleOAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-primary/20 rounded-full">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Completing Authentication
        </h2>
        <p className="text-gray-400">
          Please wait while we set up your wallet...
        </p>
      </div>
    </div>
  );
};
