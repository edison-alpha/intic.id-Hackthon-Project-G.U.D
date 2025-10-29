import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  Download,
  ExternalLink,
  Clock,
  Hash,
  User,
  MapPin,
  Calendar,
  Ticket,
  Shield,
  Zap,
  Copy,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import bannerImg from '../assets/banner (1).png';

interface NFTMetadata {
  tokenId: string;
  contractAddress: string;
  name: string;
  description: string;
  image: string;
  animationUrl?: string;
  externalUrl?: string;
  attributes: {
    trait_type: string;
    value: string | number;
    rarity?: string;
  }[];
  properties: {
    event: {
      name: string;
      date: string;
      venue: string;
      organizer: string;
    };
    ticket: {
      type: string;
      section: string;
      row?: string;
      seat?: string;
      tier: string;
    };
    blockchain: {
      network: string;
      standard: string;
      mintTransaction: string;
      blockNumber: number;
      timestamp: string;
    };
    ownership: {
      currentOwner: string;
      originalOwner: string;
      transferCount: number;
      purchasePrice: string;
      currentValue?: string;
    };
    utility: {
      accessCode: string;
      qrCode: string;
      isUsed: boolean;
      usageTimestamp?: string;
      earlyAccess: boolean;
      perks: string[];
    };
  };
  rarity: {
    rank: number;
    totalSupply: number;
    rarityScore: number;
    rarityTier: string;
  };
  provenance: {
    mintedAt: string;
    mintedBy: string;
    history: {
      timestamp: string;
      action: string;
      from?: string;
      to?: string;
      price?: string;
      transaction: string;
    }[];
  };
}

interface NFTMetadataViewerProps {
  tokenId: string;
  contractAddress: string;
  className?: string;
}

export const NFTMetadataViewer: React.FC<NFTMetadataViewerProps> = ({
  tokenId,
  contractAddress,
  className = ''
}) => {
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'properties' | 'history' | 'rarity'>('overview');

  useEffect(() => {
    fetchNFTMetadata();
  }, [tokenId, contractAddress]);

  const fetchNFTMetadata = async () => {
    setLoading(true);
    try {
      // Simulate API call - replace with actual contract interaction
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockMetadata: NFTMetadata = {
        tokenId,
        contractAddress,
        name: `Pulse Robot Event Ticket #${tokenId}`,
        description: 'Exclusive NFT ticket for Summer Music Festival 2025. This ticket grants access to the event and includes special perks for holders.',
        image: bannerImg,
        animationUrl: 'https://pulse-robot.com/animations/ticket-reveal.mp4',
        externalUrl: 'https://pulse-robot.com/tickets/' + tokenId,
        attributes: [
          { trait_type: 'Event', value: 'Summer Music Festival 2025' },
          { trait_type: 'Venue', value: 'Madison Square Garden' },
          { trait_type: 'Date', value: '2025-07-15' },
          { trait_type: 'Ticket Type', value: 'VIP', rarity: 'Rare' },
          { trait_type: 'Section', value: 'A' },
          { trait_type: 'Row', value: '1' },
          { trait_type: 'Seat', value: '12' },
          { trait_type: 'Tier', value: 'Gold' },
          { trait_type: 'Early Access', value: 'Yes', rarity: 'Uncommon' },
          { trait_type: 'Artist', value: 'Various Artists' },
          { trait_type: 'Genre', value: 'Electronic' },
          { trait_type: 'Organizer Verified', value: 'Yes', rarity: 'Common' }
        ],
        properties: {
          event: {
            name: 'Summer Music Festival 2025',
            date: '2025-07-15T18:00:00Z',
            venue: 'Madison Square Garden, New York',
            organizer: 'EventCorp Ltd.'
          },
          ticket: {
            type: 'VIP',
            section: 'A',
            row: '1',
            seat: '12',
            tier: 'Gold'
          },
          blockchain: {
            network: 'Stacks Testnet',
            standard: 'SIP-009',
            mintTransaction: '0x1234567890abcdef...',
            blockNumber: 145692,
            timestamp: '2025-06-01T10:30:00Z'
          },
          ownership: {
            currentOwner: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
            originalOwner: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
            transferCount: 0,
            purchasePrice: '0.05 sBTC',
            currentValue: '0.075 sBTC'
          },
          utility: {
            accessCode: 'PRT-2025-VIP-001234',
            qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
            isUsed: false,
            earlyAccess: true,
            perks: [
              'VIP Lounge Access',
              'Meet & Greet with Artists',
              'Exclusive Merchandise',
              'Premium Seating',
              'Complimentary Drinks'
            ]
          }
        },
        rarity: {
          rank: 45,
          totalSupply: 1000,
          rarityScore: 89.5,
          rarityTier: 'Rare'
        },
        provenance: {
          mintedAt: '2025-06-01T10:30:00Z',
          mintedBy: 'SP1HTBVD3JG9C05J7HBJTHGR0GGW7KX17ECNXF1DK',
          history: [
            {
              timestamp: '2025-06-01T10:30:00Z',
              action: 'Minted',
              to: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
              price: '0.05 sBTC',
              transaction: '0x1234567890abcdef...'
            }
          ]
        }
      };

      setMetadata(mockMetadata);
    } catch (error) {
      console.error('Error fetching NFT metadata:', error);
      toast.error('Failed to load NFT metadata');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const downloadMetadata = () => {
    if (!metadata) return;

    const dataStr = JSON.stringify(metadata, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `nft-metadata-${tokenId}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    toast.success('Metadata downloaded successfully');
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'legendary': return 'bg-gradient-to-r from-yellow-400 to-[#e7a4fd]';
      case 'epic': return 'bg-gradient-to-r from-purple-500 to-pink-500';
      case 'rare': return 'bg-gradient-to-r from-blue-500 to-cyan-500';
      case 'uncommon': return 'bg-gradient-to-r from-green-500 to-emerald-500';
      default: return 'bg-gradient-to-r from-gray-500 to-gray-600';
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        <div className="h-64 bg-gray-700 rounded-lg"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!metadata) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-gray-400">Failed to load NFT metadata</p>
        <Button
          onClick={fetchNFTMetadata}
          variant="outline"
          className="mt-4"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* NFT Image and Basic Info */}
      <Card className="bg-[#1A1A1A] border-gray-800">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image */}
            <div className="space-y-4">
              <div className="relative group">
                <img
                  src={metadata.image}
                  alt={metadata.name}
                  className="w-full h-64 md:h-80 object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open(metadata.image, '_blank')}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Full Size
                  </Button>
                </div>
              </div>

              {/* Rarity Badge */}
              <div className="flex items-center justify-center">
                <div className={`px-4 py-2 rounded-full text-white font-bold ${getRarityColor(metadata.rarity.rarityTier)}`}>
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    {metadata.rarity.rarityTier} #{metadata.rarity.rank} / {metadata.rarity.totalSupply}
                  </span>
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">{metadata.name}</h1>
                <p className="text-gray-400 text-sm mb-4">{metadata.description}</p>

                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="secondary" className="bg-[#d548ec] text-white">
                    <Hash className="w-3 h-3 mr-1" />
                    {metadata.tokenId}
                  </Badge>
                  <Badge variant="outline" className="border-gray-600">
                    <Shield className="w-3 h-3 mr-1" />
                    {metadata.properties.blockchain.standard}
                  </Badge>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
                  <p className="text-gray-400 text-xs mb-1">Current Value</p>
                  <p className="text-white font-bold">{metadata.properties.ownership.currentValue}</p>
                </div>
                <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
                  <p className="text-gray-400 text-xs mb-1">Rarity Score</p>
                  <p className="text-white font-bold">{metadata.rarity.rarityScore}/100</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={downloadMetadata}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  onClick={() => window.open(metadata.externalUrl, '_blank')}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on Explorer
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-[#1A1A1A] border border-gray-800 rounded-lg p-1">
        {[
          { id: 'overview', label: 'Overview', icon: Eye },
          { id: 'properties', label: 'Properties', icon: Activity },
          { id: 'history', label: 'History', icon: Clock },
          { id: 'rarity', label: 'Rarity', icon: Zap }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-[#d548ec] text-white'
                : 'text-gray-400 hover:text-white hover:bg-[#0A0A0A]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Event Details */}
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#d548ec]" />
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Event:</span>
                <span className="text-white font-medium">{metadata.properties.event.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Date:</span>
                <span className="text-white">{new Date(metadata.properties.event.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Venue:</span>
                <span className="text-white">{metadata.properties.event.venue}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Organizer:</span>
                <span className="text-white">{metadata.properties.event.organizer}</span>
              </div>
            </CardContent>
          </Card>

          {/* Ticket Details */}
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Ticket className="w-5 h-5 text-[#d548ec]" />
                Ticket Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Type:</span>
                <span className="text-white font-medium">{metadata.properties.ticket.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Section:</span>
                <span className="text-white">{metadata.properties.ticket.section}</span>
              </div>
              {metadata.properties.ticket.row && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Row:</span>
                  <span className="text-white">{metadata.properties.ticket.row}</span>
                </div>
              )}
              {metadata.properties.ticket.seat && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Seat:</span>
                  <span className="text-white">{metadata.properties.ticket.seat}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Tier:</span>
                <Badge className="bg-[#d548ec] text-white">{metadata.properties.ticket.tier}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Utility & Perks */}
          <Card className="bg-[#1A1A1A] border-gray-800 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#d548ec]" />
                Utility & Perks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Access Code</p>
                  <div className="flex items-center gap-2">
                    <code className="text-white font-mono text-sm">{metadata.properties.utility.accessCode}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(metadata.properties.utility.accessCode, 'Access code')}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Status</p>
                  <Badge className={metadata.properties.utility.isUsed ? 'bg-gray-600' : 'bg-green-600'}>
                    {metadata.properties.utility.isUsed ? 'Used' : 'Active'}
                  </Badge>
                </div>
                <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Early Access</p>
                  <Badge className={metadata.properties.utility.earlyAccess ? 'bg-[#d548ec]' : 'bg-gray-600'}>
                    {metadata.properties.utility.earlyAccess ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-white font-medium mb-2">Included Perks:</p>
                <div className="flex flex-wrap gap-2">
                  {metadata.properties.utility.perks.map((perk, index) => (
                    <Badge key={index} variant="outline" className="border-gray-600">
                      {perk}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'properties' && (
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Properties & Attributes</CardTitle>
            <CardDescription>Unique characteristics of this NFT</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {metadata.attributes.map((attr, index) => (
                <div
                  key={index}
                  className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4 relative overflow-hidden"
                >
                  {attr.rarity && (
                    <div className={`absolute top-0 right-0 px-2 py-1 text-xs font-bold text-white ${getRarityColor(attr.rarity)} rounded-bl-lg`}>
                      {attr.rarity}
                    </div>
                  )}
                  <p className="text-gray-400 text-sm mb-1">{attr.trait_type}</p>
                  <p className="text-white font-semibold">{attr.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'history' && (
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Transaction History</CardTitle>
            <CardDescription>Complete ownership and transaction history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metadata.provenance.history.map((event, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-[#0A0A0A] border border-gray-800 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-[#d548ec] flex items-center justify-center flex-shrink-0">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white font-medium">{event.action}</p>
                        <p className="text-gray-400 text-sm">
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                        {event.from && event.to && (
                          <p className="text-gray-400 text-sm">
                            From: {event.from.substring(0, 6)}...{event.from.substring(event.from.length - 4)}
                            {' → '}
                            To: {event.to.substring(0, 6)}...{event.to.substring(event.to.length - 4)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {event.price && (
                          <p className="text-white font-medium">{event.price}</p>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(event.transaction, 'Transaction hash')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'rarity' && (
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Rarity Analysis</CardTitle>
            <CardDescription>Detailed rarity breakdown and ranking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <div className={`w-20 h-20 rounded-full ${getRarityColor(metadata.rarity.rarityTier)} flex items-center justify-center mx-auto mb-2`}>
                  <span className="text-white font-bold text-xl">#{metadata.rarity.rank}</span>
                </div>
                <p className="text-gray-400 text-sm">Rank</p>
                <p className="text-white font-medium">#{metadata.rarity.rank} of {metadata.rarity.totalSupply}</p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mx-auto mb-2">
                  <span className="text-white font-bold text-lg">{metadata.rarity.rarityScore}</span>
                </div>
                <p className="text-gray-400 text-sm">Rarity Score</p>
                <p className="text-white font-medium">{metadata.rarity.rarityScore}/100</p>
              </div>

              <div className="text-center">
                <div className={`w-20 h-20 rounded-full ${getRarityColor(metadata.rarity.rarityTier)} flex items-center justify-center mx-auto mb-2`}>
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <p className="text-gray-400 text-sm">Rarity Tier</p>
                <p className="text-white font-medium">{metadata.rarity.rarityTier}</p>
              </div>
            </div>

            <div>
              <h3 className="text-white font-medium mb-3">Trait Rarity Breakdown</h3>
              <div className="space-y-2">
                {metadata.attributes
                  .filter(attr => attr.rarity)
                  .map((attr, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-[#0A0A0A] border border-gray-800 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{attr.trait_type}: {attr.value}</p>
                      </div>
                      <Badge className={getRarityColor(attr.rarity!)}>
                        {attr.rarity}
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NFTMetadataViewer;