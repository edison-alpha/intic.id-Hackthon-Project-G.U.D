/**
 * QR Scanner Component
 * Scans QR codes for ticket check-in
 */

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, AlertCircle } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
  isScanning: boolean;
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({
  onScanSuccess,
  onScanError,
  isScanning,
  onClose,
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string>('');
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  useEffect(() => {
    if (isScanning) {
      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isScanning]);

  const startScanner = async () => {
    try {
      // Check camera permission
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setCameraPermission(permission.state);

        if (permission.state === 'denied') {
          setError('Camera permission denied. Please enable camera access in your browser settings.');
          onScanError?.('Camera permission denied');
          return;
        }
      }

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' }, // Use back camera on mobile
        {
          fps: 10, // Frames per second
          qrbox: { width: 250, height: 250 }, // QR box size
        },
        (decodedText) => {
          console.log('✅ QR Code scanned:', decodedText);
          onScanSuccess(decodedText);
          stopScanner();
        },
        (errorMessage) => {
          // This is called for every frame that doesn't contain a QR code
          // We don't need to show this to the user
          // console.log('QR scan error:', errorMessage);
        }
      );

      setError('');
    } catch (err: any) {
      console.error('❌ Error starting scanner:', err);
      let errorMsg = 'Failed to start camera';

      if (err.message?.includes('NotAllowedError')) {
        errorMsg = 'Camera permission denied. Please allow camera access.';
        setCameraPermission('denied');
      } else if (err.message?.includes('NotFoundError')) {
        errorMsg = 'No camera found on this device.';
      } else if (err.message) {
        errorMsg = err.message;
      }

      setError(errorMsg);
      onScanError?.(errorMsg);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {
        console.error('❌ Error stopping scanner:', err);
      }
    }
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Scanner Container */}
        <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#d548ec]/10 rounded-full flex items-center justify-center">
                <Camera className="w-5 h-5 text-[#d548ec]" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Scan QR Code</h3>
                <p className="text-gray-400 text-sm">Position the QR code within the frame</p>
              </div>
            </div>
          </div>

          {/* Scanner Area */}
          <div className="relative bg-black">
            <div id="qr-reader" className="w-full" />

            {/* Scanning Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Corner markers */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-[#d548ec]" />
              <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-[#d548ec]" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-[#d548ec]" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-[#d548ec]" />
            </div>

            {/* Error Display */}
            {error && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-6">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 max-w-sm">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-500 font-semibold mb-1">Camera Error</p>
                      <p className="text-red-400 text-sm">{error}</p>
                      {cameraPermission === 'denied' && (
                        <p className="text-red-400 text-xs mt-2">
                          Please check your browser settings to enable camera access.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="p-4 bg-[#0A0A0A]">
            <p className="text-gray-400 text-sm text-center">
              Hold your device steady and align the QR code within the frame
            </p>
          </div>
        </div>

        {/* Manual Input Option */}
        <div className="mt-4 text-center">
          <button
            onClick={handleClose}
            className="text-gray-400 text-sm hover:text-white transition-colors"
          >
            Cancel and close
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
