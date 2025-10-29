import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Check, 
  Ticket, 
  Users, 
  Clock, 
  TrendingUp,
  AlertCircle,
  Crown,
  Star,
  Zap
} from 'lucide-react';
import STXIcon from '@/components/STXIcon';
import { cn } from '@/lib/utils';

export interface TicketType {
  id: string;
  name: string;
  type: 'VIP' | 'VVIP' | 'Regular' | 'Premium';
  price: string;
  priceInMicroSTX: number;
  totalSupply: number;
  sold: number;
  remaining: number;
  cooldownPeriod?: number; // in hours
  cooldownRemaining?: number; // in hours
  features: string[];
  icon: 'crown' | 'star' | 'zap' | 'ticket';
  color: string;
  available: boolean;
}

interface TicketSelectionProps {
  tickets: TicketType[];
  selectedTicketId?: string;
  onSelectTicket: (ticketId: string) => void;
  isWalletConnected: boolean;
  comingSoon?: boolean;
}

const TicketSelection = ({ 
  tickets, 
  selectedTicketId, 
  onSelectTicket,
  isWalletConnected,
  comingSoon = true // Default to true - show subtle coming soon overlay
}: TicketSelectionProps) => {
  const [hoveredTicket, setHoveredTicket] = useState<string | null>(null);

  const getIconComponent = (iconType: string) => {
    switch (iconType) {
      case 'crown':
        return Crown;
      case 'star':
        return Star;
      case 'zap':
        return Zap;
      default:
        return Ticket;
    }
  };

  const getAvailabilityPercentage = (ticket: TicketType) => {
    return ticket.totalSupply > 0 
      ? ((ticket.remaining / ticket.totalSupply) * 100).toFixed(0)
      : 0;
  };

  return (
    <div className="space-y-3 relative">
      {/* Coming Soon Overlay - Very Subtle */}
      {comingSoon && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] rounded-xl z-10 flex items-center justify-center pointer-events-auto">
          <div className="text-center px-6 opacity-40 hover:opacity-80 transition-opacity">
            <div className="bg-gradient-to-r from-[#d548ec]/30 to-purple-600/30 text-white/80 px-4 py-2 rounded-lg shadow-sm mb-2">
              <h3 className="text-base font-semibold mb-0.5">🎫 Coming Soon</h3>
              <p className="text-xs opacity-70">Multiple Ticket Types</p>
            </div>
            <p className="text-gray-300/60 text-[10px] max-w-xs">
              VIP, VVIP, and Regular categories will be available soon
            </p>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
          <Ticket className="w-4 h-4 text-[#d548ec]" />
          Select Ticket Type
        </h3>
        <p className="text-xs text-gray-400">
          Choose your preferred ticket category
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {tickets.map((ticket) => {
          const IconComponent = getIconComponent(ticket.icon);
          const isSelected = selectedTicketId === ticket.id;
          const isHovered = hoveredTicket === ticket.id;
          const availabilityPercent = getAvailabilityPercentage(ticket);
          const isSoldOut = ticket.remaining === 0;
          const hasCooldown = ticket.cooldownRemaining && ticket.cooldownRemaining > 0;

          return (
            <Card
              key={ticket.id}
              className={cn(
                "bg-[#1A1A1A] border-2 transition-all relative overflow-hidden",
                !comingSoon && "cursor-pointer",
                comingSoon && "opacity-90",
                isSelected && "border-[#d548ec] shadow-lg shadow-[#d548ec]/20",
                !isSelected && "border-gray-800 hover:border-gray-700",
                isSoldOut && "opacity-60",
                hasCooldown && "opacity-70"
              )}
              onMouseEnter={() => !comingSoon && setHoveredTicket(ticket.id)}
              onMouseLeave={() => !comingSoon && setHoveredTicket(null)}
              onClick={() => {
                if (!comingSoon && ticket.available && !isSoldOut && !hasCooldown && isWalletConnected) {
                  onSelectTicket(ticket.id);
                }
              }}
            >
              {/* Background gradient effect */}
              <div 
                className={cn(
                  "absolute inset-0 opacity-0 transition-opacity",
                  isHovered && "opacity-10"
                )}
                style={{ 
                  background: `linear-gradient(135deg, ${ticket.color}20 0%, transparent 100%)`
                }}
              />

              <CardContent className="p-3 relative">
                <div className="flex flex-col h-full">
                  {/* Header with Icon and Selection */}
                  <div className="flex items-start justify-between mb-2">
                    <div 
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        "transition-all"
                      )}
                      style={{ 
                        backgroundColor: `${ticket.color}15`,
                        border: `2px solid ${ticket.color}40`
                      }}
                    >
                      <IconComponent 
                        className="w-5 h-5" 
                        style={{ color: ticket.color }}
                      />
                    </div>

                    {/* Selection indicator */}
                    {isSelected && (
                      <div 
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: ticket.color }}
                      >
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Title and Badge */}
                  <div className="mb-2">
                    <h4 className="text-base font-bold text-white mb-1">{ticket.name}</h4>
                    <Badge 
                      variant="secondary" 
                      className="text-[10px] px-1.5 py-0"
                      style={{ 
                        backgroundColor: `${ticket.color}20`,
                        color: ticket.color,
                        border: `1px solid ${ticket.color}40`
                      }}
                    >
                      {ticket.type}
                    </Badge>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-xl font-bold text-white">
                      {ticket.price}
                    </span>
                    <span className="text-xs font-semibold text-gray-300">PUSH</span>
                    <STXIcon size="sm" />
                  </div>

                  {/* Features - Only show 2 */}
                  <div className="space-y-0.5 mb-2">
                    {ticket.features.slice(0, 2).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-1 text-[10px] text-gray-400">
                        <Check className="w-2.5 h-2.5 text-green-500 flex-shrink-0" />
                        <span className="truncate">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-1.5 mb-2">
                    {/* Total Supply */}
                    <div className="bg-[#0A0A0A] rounded-lg p-1.5">
                      <div className="flex items-center gap-0.5 mb-0.5">
                        <Users className="w-2.5 h-2.5 text-blue-400" />
                        <span className="text-[9px] text-gray-400">Supply</span>
                      </div>
                      <div className="text-xs font-bold text-white">
                        {ticket.totalSupply}
                      </div>
                    </div>

                    {/* Sold */}
                    <div className="bg-[#0A0A0A] rounded-lg p-1.5">
                      <div className="flex items-center gap-0.5 mb-0.5">
                        <TrendingUp className="w-2.5 h-2.5 text-green-400" />
                        <span className="text-[9px] text-gray-400">Sold</span>
                      </div>
                      <div className="text-xs font-bold text-white">
                        {ticket.sold}
                      </div>
                    </div>

                    {/* Remaining */}
                    <div className="bg-[#0A0A0A] rounded-lg p-1.5">
                      <div className="flex items-center gap-0.5 mb-0.5">
                        <Ticket className="w-2.5 h-2.5" style={{ color: ticket.color }} />
                        <span className="text-[9px] text-gray-400">Left</span>
                      </div>
                      <div className="text-xs font-bold text-white">
                        {ticket.remaining}
                      </div>
                    </div>
                  </div>

                  {/* Availability Progress Bar */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] text-gray-400">Available</span>
                      <span className="text-[10px] font-semibold text-white">
                        {availabilityPercent}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1">
                      <div
                        className="h-1 rounded-full transition-all"
                        style={{ 
                          width: `${availabilityPercent}%`,
                          backgroundColor: ticket.color
                        }}
                      />
                    </div>
                  </div>

                  {/* Cooldown Info - Compact */}
                  {ticket.cooldownPeriod && (
                    <div className="mb-2">
                      <div className="flex items-center gap-1 text-[10px] text-gray-400">
                        <Clock className="w-2.5 h-2.5 text-yellow-400" />
                        <span>Cooldown: {ticket.cooldownPeriod}h</span>
                      </div>
                    </div>
                  )}

                  {/* Status Messages - Compact */}
                  {isSoldOut && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded p-1.5 mb-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-red-400">
                        <AlertCircle className="w-3 h-3" />
                        <span className="font-semibold">SOLD OUT</span>
                      </div>
                    </div>
                  )}

                  {hasCooldown && !isSoldOut && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-1.5 mb-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-yellow-400">
                        <Clock className="w-3 h-3" />
                        <span>{ticket.cooldownRemaining}h left</span>
                      </div>
                    </div>
                  )}

                  {!isWalletConnected && !isSoldOut && !hasCooldown && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded p-1.5 mb-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-blue-400">
                        <AlertCircle className="w-3 h-3" />
                        <span>Connect wallet</span>
                      </div>
                    </div>
                  )}

                  {/* Select Button */}
                  {isWalletConnected && ticket.available && !isSoldOut && !hasCooldown && (
                    <Button
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "w-full transition-all h-8 text-xs",
                        isSelected && "text-white border-0",
                        !isSelected && "border-gray-700 hover:border-[#d548ec]"
                      )}
                      style={
                        isSelected 
                          ? { background: `linear-gradient(135deg, ${ticket.color} 0%, ${ticket.color}80 100%)` }
                          : {}
                      }
                    >
                      {isSelected ? 'Selected' : 'Select'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default TicketSelection;
