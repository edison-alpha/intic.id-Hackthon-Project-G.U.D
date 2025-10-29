/**
 * Event Check-In Point Page
 * For Event Organizers to display QR code at entrance
 * Attendees scan this QR to check-in
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';

import { Download, ScanLine, Users, CheckCircle } from 'lucide-react';

const EventCheckInPoint = () => {
  const { contractId, eventId } = useParams();

  if (!contractId || !eventId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Check-In Point</h1>
          <p className="text-gray-400">Missing contract or event information</p>
        </div>
      </div>
    );
  }

  const [contractAddress, contractName] = contractId.split('.');
  const checkInQRData = `checkin:${contractAddress}.${contractName}:${eventId}`;

  const handleDownloadQR = () => {
    const canvas = document.getElementById('checkin-qr-canvas') as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `checkin-point-event-${eventId}.png`;
      link.href = url;
      link.click();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-[#1A1A1A] border-2 border-[#d548ec] rounded-3xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] p-8 text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
              <ScanLine className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
              EVENT CHECK-IN
            </h1>
            <p className="text-white/90 text-lg">Scan to Enter</p>
          </div>

          {/* QR Code Section */}
          <div className="p-8 md:p-12 bg-white">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 mb-6">
              <div className="flex justify-center">
                <div className="bg-white p-6 rounded-2xl shadow-lg">
                  <QRCodeCanvas
                    id="checkin-qr-canvas"
                    value={checkInQRData}
                    size={300}
                    level="H"
                    includeMargin={true}
                  />
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white font-bold text-sm">1</span>
                </div>
                <div>
                  <p className="text-gray-900 font-semibold mb-1">Open Your INTIC App</p>
                  <p className="text-gray-600 text-sm">Navigate to "My Tickets" section</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white font-bold text-sm">2</span>
                </div>
                <div>
                  <p className="text-gray-900 font-semibold mb-1">Scan This QR Code</p>
                  <p className="text-gray-600 text-sm">Use your phone camera to scan</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white font-bold text-sm">3</span>
                </div>
                <div>
                  <p className="text-gray-900 font-semibold mb-1">Confirm Check-In</p>
                  <p className="text-gray-600 text-sm">Approve transaction to mark attendance</p>
                </div>
              </div>
            </div>

            {/* Download Button */}
            <button
              onClick={handleDownloadQR}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] hover:from-[#c030d6] hover:to-[#d183f0] text-white font-bold rounded-xl transition-all shadow-lg"
            >
              <Download className="w-5 h-5" />
              Download QR Code
            </button>
          </div>

          {/* Footer Info */}
          <div className="bg-[#0A0A0A] p-6 border-t border-gray-800">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-[#d548ec]" />
                  <p className="text-gray-400 text-xs">Event ID</p>
                </div>
                <p className="text-white font-mono font-bold">#{eventId}</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <p className="text-gray-400 text-xs">Blockchain</p>
                </div>
                <p className="text-white font-bold text-sm">Stacks</p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-[#1A1A1A] rounded-lg">
              <p className="text-gray-500 text-xs text-center mb-1">Contract</p>
              <p className="text-gray-400 text-xs font-mono text-center break-all">
                {contractAddress}.{contractName}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Note */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            🔒 Powered by Blockchain Technology
          </p>
          <p className="text-gray-600 text-xs mt-1">
            All check-ins are recorded on-chain
          </p>
        </div>
      </div>
    </div>
  );
};

export default EventCheckInPoint;
