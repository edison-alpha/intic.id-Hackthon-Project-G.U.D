import React from "react";
import { X, Download, Share2, Calendar, ExternalLink } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { addToGoogleCalendar } from "@/lib/calendar";


interface TicketQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: {
    id: string;
    eventName: string;
    eventDate: string;
    ticketType: string;
    holderName: string;
    seatNumber?: string;
    mintTxId?: string;
    contractId?: string;
    tokenId?: number;
    location?: string;
    price?: string;
    category?: string;
  };
}

const TicketQRModal: React.FC<TicketQRModalProps> = ({ isOpen, onClose, ticket }) => {
  if (!isOpen) return null;

  const network = 'testnet';
  const pushExplorerUrl = ticket.mintTxId
    ? `https://donut.push.network/tx/${ticket.mintTxId}`
    : `https://donut.push.network`;

  // Generate check-in QR data if we have contract info
  let qrCodeData = pushExplorerUrl;

  if (ticket.contractId && ticket.tokenId !== undefined) {
    const [contractAddress, contractName] = ticket.contractId.split('.');

    // Extract date and time from eventDate string (format: "Month Day, Year at Time")
    const eventDateParts = ticket.eventDate.split(' at ');
    const dateStr = eventDateParts[0] || ticket.eventDate;
    const timeStr = eventDateParts[1] || 'TBA';

    if (contractAddress && contractName) {
      // Use check-in format for QR code
      qrCodeData = `checkin:${contractAddress}.${contractName}:${ticket.tokenId}:${dateStr}:${timeStr}`;
    }
  }

  // Format date
  const formatDate = (dateStr: string) => {
    const parts = dateStr.split(' at ');
    return parts[0] || dateStr;
  };

  const formatTime = (dateStr: string) => {
    const parts = dateStr.split(' at ');
    return parts[1] || 'TBA';
  };

  const handleDownload = () => {
    const canvas = document.getElementById('ticket-qr-canvas') as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `ticket-${ticket.id}.png`;
      link.href = url;
      link.click();
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ticket for ${ticket.eventName}`,
          text: `My ticket for ${ticket.eventName}`,
          url: window.location.href
        });
      } catch (error) {
        // Ignore
      }
    }
  };

  const handleAddToCalendar = () => {
    const [dateStr, timeStr] = ticket.eventDate.split(' at ');
    addToGoogleCalendar({
      eventName: ticket.eventName,
      eventDate: dateStr,
      eventTime: timeStr || "7:00 PM",
      location: ticket.location || "Check ticket details",
      ticketId: ticket.id
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300"
      onClick={onClose}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 group"
      >
        <div className="relative w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 hover:border-white/40 rounded-full flex items-center justify-center transition-all">
          <X className="w-5 h-5 text-white" />
        </div>
      </button>

      {/* Ticket Container */}
      <div
        className="relative max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main Ticket - Front Side */}
        <div className="relative bg-white rounded-xl overflow-hidden shadow-2xl transform hover:scale-[1.01] transition-transform duration-300">

          {/* Event Image Background */}
          <div className="relative h-48 md:h-56 overflow-hidden">
            {/* Background Image with Overlay */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url('/background-section1.png')`,
                filter: 'brightness(0.7)'
              }}
            />

            {/* Dark Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />

            {/* Content Over Image */}
            <div className="relative h-full flex flex-col justify-between p-5 md:p-6">

              {/* Top Section */}
              <div>
                <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md border border-white/30 rounded-full mb-3">
                  <span className="text-white text-[10px] font-bold uppercase tracking-wider">Live Performance</span>
                </div>

                <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white mb-2 uppercase tracking-tight leading-none">
                  {ticket.eventName}
                </h1>

                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1">
                    <div className="flex gap-0.5">
                      <div className="w-6 h-0.5 bg-white" />
                      <div className="w-6 h-0.5 bg-white" />
                      <div className="w-6 h-0.5 bg-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section - Event Info */}
              <div className="grid grid-cols-3 gap-4 md:gap-6">
                <div>
                  <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Venue</p>
                  <p className="text-white text-xs md:text-sm font-bold leading-tight">{ticket.location || 'Studio Venue'}</p>
                </div>
                <div>
                  <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Date</p>
                  <p className="text-white text-xs md:text-sm font-bold">{formatDate(ticket.eventDate)}</p>
                </div>
                <div>
                  <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Time</p>
                  <p className="text-white text-xs md:text-sm font-bold">{formatTime(ticket.eventDate)}</p>
                </div>
              </div>
            </div>

            {/* Diagonal Cut */}
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-white transform rotate-45 translate-x-12 translate-y-12" />
          </div>

          {/* Bottom White Section */}
          <div className="relative bg-white">

            {/* Perforation Line */}
            <div className="flex items-center justify-center gap-1 py-1.5">
              {Array.from({ length: 50 }).map((_, i) => (
                <div key={i} className="w-0.5 h-0.5 bg-gray-300 rounded-full" />
              ))}
            </div>

            {/* Ticket Details Section */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 p-5 md:p-6">

              {/* Left - Ticket Info */}
              <div className="space-y-4">

                {/* Ticket Type & Seat */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-gray-500 text-[9px] font-bold uppercase tracking-wider mb-0.5">Seat</p>
                    <p className="text-gray-900 text-xs font-bold">{ticket.seatNumber || `Token #${ticket.tokenId}`}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-[9px] font-bold uppercase tracking-wider mb-0.5">Row</p>
                    <p className="text-gray-900 text-xs font-bold">{ticket.category || 'General'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-[9px] font-bold uppercase tracking-wider mb-0.5">Gate</p>
                    <p className="text-gray-900 text-xs font-bold">01</p>
                  </div>
                </div>

                {/* Ticket Number */}
                <div>
                  <p className="text-gray-500 text-[9px] font-bold uppercase tracking-wider mb-0.5">Ticket Number</p>
                  <p className="text-gray-900 text-[10px] font-mono">{ticket.id}</p>
                </div>

                {/* Terms & Conditions */}
                <div className="pt-3 border-t border-gray-200">
                  <h3 className="text-gray-900 text-xs font-bold mb-2 uppercase tracking-wide">Terms & Conditions</h3>
                  <ul className="space-y-1.5 text-gray-600 text-[10px] leading-relaxed">
                    <li>• This NFT ticket is your proof of entry to the event</li>
                    <li>• Present QR code at entrance for verification</li>
                    <li>• Non-transferable unless traded on blockchain</li>
                    {ticket.mintTxId && (
                      <li className="flex items-center gap-1 text-blue-600">
                        • Verified on PushChain Blockchain
                        <a
                          href={pushExplorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                    )}
                  </ul>
                </div>

                {/* Price Tag */}
                <div className="inline-block px-4 py-2 border-2 border-gray-900 rounded-lg">
                  <p className="text-gray-500 text-[9px] font-bold uppercase tracking-wider mb-0.5">Ticket Price</p>
                  <p className="text-gray-900 text-lg font-black">${ticket.price || '25.00'}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-3">
                  <button
                    onClick={handleDownload}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Save
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border-2 border-gray-900 hover:bg-gray-50 text-gray-900 text-xs font-bold rounded-lg transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share
                  </button>
                  <button
                    onClick={handleAddToCalendar}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border-2 border-gray-900 hover:bg-gray-50 text-gray-900 text-xs font-bold rounded-lg transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Calendar
                  </button>
                </div>
              </div>

              {/* Right - QR Code & Barcode */}
              <div className="flex flex-col items-center gap-4">

                {/* QR Code */}
                <div className="relative">
                  <div className="bg-white p-3 border-2 border-gray-900 rounded-lg">
                    <QRCodeCanvas
                      id="ticket-qr-canvas"
                      value={qrCodeData}
                      size={120}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <p className="text-center text-gray-500 text-[9px] font-bold uppercase tracking-wider mt-1.5">Scan to Verify</p>
                </div>

                {/* Vertical Barcode Design */}
                <div className="flex flex-col items-center gap-1.5">
                  {/* Barcode Lines */}
                  <div className="flex gap-[1.5px]">
                    {Array.from({ length: 24 }).map((_, i) => {
                      const heights = [30, 38, 34, 45, 42, 38, 34, 42, 45, 38];
                      const height = heights[i % heights.length];
                      return (
                        <div
                          key={i}
                          className="w-[2.5px] bg-gray-900"
                          style={{ height: `${height}px` }}
                        />
                      );
                    })}
                  </div>
                  <p className="text-gray-900 text-[10px] font-mono tracking-wider">{ticket.tokenId || '000000'}</p>
                </div>

                {/* Admit One Badge */}
                <div className="transform rotate-90 origin-center">
                  <div className="px-6 py-1.5 bg-gray-900 text-white">
                    <p className="text-base font-black uppercase tracking-[0.25em] whitespace-nowrap">Admit One</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ticket Stub Cuts */}
          <div className="absolute left-0 top-1/2 w-3 h-3 bg-black/95 rounded-full -ml-1.5 -mt-1.5" />
          <div className="absolute right-0 top-1/2 w-3 h-3 bg-black/95 rounded-full -mr-1.5 -mt-1.5" />
        </div>
      </div>
    </div>
  );
};

export default TicketQRModal;
