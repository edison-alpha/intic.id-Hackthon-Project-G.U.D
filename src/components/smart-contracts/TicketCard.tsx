/**
 * TicketCard Component
 * Displays NFT ticket information from smart contract
 */

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, QrCode, Send, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";

interface TicketCardProps {
  ticketId: number;
  eventId: number;
  eventName?: string;
  eventDate?: string;
  eventLocation?: string;
  eventImage?: string;
  ticketUri?: string;
  used?: boolean;
  cancelled?: boolean;
  onShowQR?: () => void;
  onTransfer?: () => void;
  onUse?: () => void;
  contractAddress?: string;
}

export function TicketCard({
  ticketId,
  eventId,
  eventName = `Event #${eventId}`,
  eventDate = "TBA",
  eventLocation = "Location TBA",
  eventImage,
  ticketUri,
  used = false,
  cancelled = false,
  onShowQR,
  onTransfer,
  onUse,
  contractAddress,
}: TicketCardProps) {
  const [imageError, setImageError] = useState(false);

  const getStatusBadge = () => {
    if (cancelled) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="w-3 h-3" />
          Cancelled
        </Badge>
      );
    }
    if (used) {
      return (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle className="w-3 h-3" />
          Used
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="gap-1 bg-green-600">
        <CheckCircle className="w-3 h-3" />
        Active
      </Badge>
    );
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Ticket Image */}
      <div className="relative h-48 bg-gradient-to-br from-purple-600 to-pink-600 overflow-hidden">
        {eventImage && !imageError ? (
          <img
            src={eventImage}
            alt={eventName}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-white/80">
              <Calendar className="w-12 h-12 mx-auto mb-2" />
              <p className="text-sm">No Image</p>
            </div>
          </div>
        )}
        
        {/* Status Badge Overlay */}
        <div className="absolute top-3 right-3">
          {getStatusBadge()}
        </div>

        {/* Token ID Badge */}
        <div className="absolute bottom-3 left-3">
          <Badge variant="outline" className="bg-black/50 backdrop-blur-sm border-white/20">
            Token #{ticketId}
          </Badge>
        </div>
      </div>

      {/* Ticket Details */}
      <div className="p-4 space-y-3">
        {/* Event Name */}
        <div>
          <h3 className="font-bold text-lg line-clamp-2">{eventName}</h3>
          {contractAddress && (
            <p className="text-xs text-muted-foreground truncate">
              {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
            </p>
          )}
        </div>

        {/* Event Info */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{eventDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span className="line-clamp-1">{eventLocation}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {!used && !cancelled && onShowQR && (
            <Button
              onClick={onShowQR}
              variant="default"
              size="sm"
              className="flex-1 gap-2"
            >
              <QrCode className="w-4 h-4" />
              Show QR
            </Button>
          )}
          
          {!used && !cancelled && onUse && (
            <Button
              onClick={onUse}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Use
            </Button>
          )}

          {!used && !cancelled && onTransfer && (
            <Button
              onClick={onTransfer}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              Transfer
            </Button>
          )}
        </div>

        {/* Metadata Link */}
        {ticketUri && (
          <div className="pt-2 border-t">
            <a
              href={ticketUri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View Metadata →
            </a>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Skeleton loader for TicketCard
 */
export function TicketCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="h-48 bg-muted animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-6 bg-muted rounded animate-pulse" />
        <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
          <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
        </div>
        <div className="flex gap-2 pt-2">
          <div className="h-9 bg-muted rounded flex-1 animate-pulse" />
          <div className="h-9 bg-muted rounded w-20 animate-pulse" />
        </div>
      </div>
    </Card>
  );
}
