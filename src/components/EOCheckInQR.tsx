/**
 * EO Check-In QR Generator
 * Generates QR codes for event check-in points
 */

import { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Copy, QrCode, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface EOCheckInQRProps {
  contractAddress: string;
  contractName: string;
  eventName: string;
  className?: string;
}

export default function EOCheckInQR({ 
  contractAddress, 
  contractName, 
  eventName,
  className = "" 
}: EOCheckInQRProps) {
  const [qrValue, setQrValue] = useState<string>('');
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    // Generate QR code value in format: checkin:contractAddress.contractName
    const qrData = `checkin:${contractAddress}.${contractName}`;
    setQrValue(qrData);
  }, [contractAddress, contractName]);

  const downloadQR = () => {
    const canvas = document.getElementById('checkin-qr') as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `checkin-qr-${contractName}.png`;
      link.href = url;
      link.click();
      toast.success('QR code downloaded');
    }
  };

  const copyQRValue = async () => {
    try {
      await navigator.clipboard.writeText(qrValue);
      toast.success('QR code data copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy QR code data');
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-blue-500" />
              Check-In QR Code
            </h3>
            <p className="text-sm text-gray-600">{eventName}</p>
          </div>
          <button
            onClick={() => setShowQR(!showQR)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              showQR 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {showQR ? 'Hide QR' : 'Show QR'}
          </button>
        </div>
      </div>

      {/* QR Code Display */}
      {showQR && (
        <div className="p-6">
          <div className="text-center space-y-4">
            {/* QR Code */}
            <div className="inline-block p-4 bg-white rounded-lg border-2 border-gray-200">
              <QRCodeCanvas
                id="checkin-qr"
                value={qrValue}
                size={200}
                level="M"
                includeMargin={true}
                imageSettings={{
                  src: "/manifest.json", // You can add a logo here
                  height: 24,
                  width: 24,
                  excavate: true,
                }}
              />
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <h4 className="font-medium text-blue-900 mb-1">How to use:</h4>
                  <ol className="text-sm text-blue-800 space-y-1">
                    <li>1. Display this QR code at your event entrance</li>
                    <li>2. Ask attendees to scan using their INTIC app</li>
                    <li>3. They select their ticket and scan this code</li>
                    <li>4. Attendees approve the transaction to check-in</li>
                    <li>5. Monitor real-time check-ins in the status panel above</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* QR Data */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">QR Code Data:</p>
              <p className="font-mono text-sm text-gray-800 break-all">{qrValue}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={downloadQR}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
              >
                <Download className="w-4 h-4" />
                Download QR
              </button>
              <button
                onClick={copyQRValue}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
              >
                <Copy className="w-4 h-4" />
                Copy Data
              </button>
            </div>

            {/* Contract Info */}
            <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
              <p>Contract: {contractAddress.slice(0, 10)}...{contractAddress.slice(-8)}</p>
              <p>Name: {contractName}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}