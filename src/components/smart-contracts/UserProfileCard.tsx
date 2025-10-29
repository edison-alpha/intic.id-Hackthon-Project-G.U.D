/**
 * User Profile Card Component
 * Displays user profile information from smart contract
 */

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserProfile, useProfileExists, useUserTickets } from "@/hooks/useContracts";
import { Ticket, Calendar, Star, Award } from "lucide-react";

interface UserProfileCardProps {
  address?: string;
  showCreateButton?: boolean;
  onCreateProfile?: () => void;
}

export function UserProfileCard({ address, showCreateButton = true, onCreateProfile }: UserProfileCardProps) {
  const { profile, loading: profileLoading, error } = useUserProfile(address);
  const { exists, loading: existsLoading } = useProfileExists(address);
  const { tickets, loading: ticketsLoading } = useUserTickets(address);

  if (existsLoading || profileLoading) {
    return <ProfileSkeleton />;
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-500">
          <p>Error loading profile: {error}</p>
        </div>
      </Card>
    );
  }

  if (!exists) {
    return (
      <Card className="p-8 text-center">
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <Award className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">No Profile Found</h3>
          <p className="text-muted-foreground">
            Create your profile to start collecting tickets and attending events!
          </p>
          {showCreateButton && (
            <Button onClick={onCreateProfile} size="lg" className="mt-4">
              Create Profile
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold">Your Profile</h3>
            <p className="text-sm text-muted-foreground">On-chain verified</p>
          </div>
          <Badge variant="secondary" className="gap-2">
            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
            {profile?.averageRating?.toFixed(1) || '0.0'}
          </Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={<Ticket className="w-5 h-5" />}
            label="Total Tickets"
            value={profile?.totalTickets || 0}
            loading={ticketsLoading}
          />
          <StatCard
            icon={<Calendar className="w-5 h-5" />}
            label="Events Attended"
            value={profile?.eventsAttended || 0}
          />
          <StatCard
            icon={<Star className="w-5 h-5" />}
            label="Reviews"
            value={profile?.totalReviews || 0}
          />
        </div>

        {/* Recent Tickets */}
        {tickets && tickets.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold mb-3">Recent Tickets</h4>
            <div className="space-y-2">
              {tickets.slice(0, 3).map((ticket: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Ticket className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Ticket #{ticket.ticketId}</p>
                      <p className="text-xs text-muted-foreground">Event #{ticket.eventId}</p>
                    </div>
                  </div>
                  <Badge variant="outline">Owned</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profile Details */}
        <div className="pt-4 border-t space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Profile Created</span>
            <span className="font-medium">
              {profile?.createdAt ? new Date(profile.createdAt * 1000).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          {profile?.profileUri && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Profile URI</span>
              <a
                href={profile.profileUri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-xs truncate max-w-[200px]"
              >
                {profile.profileUri}
              </a>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// Helper component for stats
function StatCard({ icon, label, value, loading }: any) {
  if (loading) {
    return (
      <div className="bg-muted p-4 rounded-lg">
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="bg-muted p-4 rounded-lg">
      <div className="flex items-center gap-2 mb-1 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

// Skeleton loader
function ProfileSkeleton() {
  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    </Card>
  );
}
