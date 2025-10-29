import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Copy,
  Settings
} from 'lucide-react';
import ContractManagement from '@/components/ContractManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DeploymentItem {
  queueId: number;
  deployer: string;
  template: string;
  eventName: string;
  totalSupply: number;
  ticketPrice: number;
  category: string;
  feePaid: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  processedAt?: number;
  contractAddress?: string;
  estimatedTime?: number;
}

// Mock data for demonstration
const mockDeploymentQueue: DeploymentItem[] = [
  {
    queueId: 10001,
    deployer: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    template: 'premium-event',
    eventName: 'Bitcoin Conference 2025',
    totalSupply: 500,
    ticketPrice: 0.005,
    category: 'conference',
    feePaid: 0.03,
    status: 'completed',
    createdAt: Date.now() - 3600000,
    processedAt: Date.now() - 1800000,
    contractAddress: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG'
  },
  {
    queueId: 10002,
    deployer: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    template: 'basic-event',
    eventName: 'Local Music Festival',
    totalSupply: 1000,
    ticketPrice: 0.001,
    category: 'music',
    feePaid: 0.015,
    status: 'processing',
    createdAt: Date.now() - 1800000,
    estimatedTime: 900000 // 15 minutes
  },
  {
    queueId: 10003,
    deployer: 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND',
    template: 'festival-event',
    eventName: 'Summer Arts Festival',
    totalSupply: 2000,
    ticketPrice: 0.008,
    category: 'arts',
    feePaid: 0.06,
    status: 'pending',
    createdAt: Date.now() - 600000,
    estimatedTime: 1800000 // 30 minutes
  },
  {
    queueId: 10004,
    deployer: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    template: 'basic-event',
    eventName: 'Tech Meetup',
    totalSupply: 100,
    ticketPrice: 0.002,
    category: 'conference',
    feePaid: 0.015,
    status: 'failed',
    createdAt: Date.now() - 7200000,
    processedAt: Date.now() - 3600000
  }
];

interface DeploymentQueueProps {
  showManagement?: boolean;
}

export const DeploymentQueue = ({ showManagement = false }: DeploymentQueueProps = {}) => {
  const [deployments, setDeployments] = useState<DeploymentItem[]>(mockDeploymentQueue);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState<DeploymentItem | null>(null);

  // Filter deployments based on user, search, and status
  const filteredDeployments = deployments.filter(deployment => {
    const matchesSearch = deployment.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deployment.queueId.toString().includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || deployment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const refreshQueue = async () => {
    setIsRefreshing(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // In production, this would fetch from the contract

    setIsRefreshing(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const formatEstimatedTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `~${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `~${hours}h ${minutes % 60}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] bg-clip-text text-transparent">
            Contract Management
          </h2>
          <p className="text-gray-400 mt-1">Manage deployments and deployed contracts</p>
        </div>
        <Button 
          onClick={refreshQueue} 
          disabled={isRefreshing} 
          className="bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-gray-800 text-white"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="queue" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-[#0A0A0A] border border-gray-800 p-1">
          <TabsTrigger 
            value="queue" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#d548ec] data-[state=active]:to-[#e7a4fd] data-[state=active]:text-white transition-all duration-300"
          >
            Deployment Queue
          </TabsTrigger>
          <TabsTrigger 
            value="contracts" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#d548ec] data-[state=active]:to-[#e7a4fd] data-[state=active]:text-white transition-all duration-300"
          >
            My Contracts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-6 mt-6">

      {/* Filters */}
      <Card className="bg-[#0A0A0A] border-gray-800">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="flex items-center gap-2 text-white">
            <Filter className="w-5 h-5 text-[#d548ec]" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Search by event name or queue ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#1A1A1A] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#d548ec] focus:ring-[#d548ec]"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 bg-[#1A1A1A] border border-gray-700 text-white rounded-md focus:ring-2 focus:ring-[#d548ec] focus:border-[#d548ec] transition-all"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-yellow-500 mb-1">
              {deployments.filter(d => d.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-400">Pending</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-blue-500 mb-1">
              {deployments.filter(d => d.status === 'processing').length}
            </div>
            <div className="text-sm text-gray-400">Processing</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-green-500 mb-1">
              {deployments.filter(d => d.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-400">Completed</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-red-500 mb-1">
              {deployments.filter(d => d.status === 'failed').length}
            </div>
            <div className="text-sm text-gray-400">Failed</div>
          </CardContent>
        </Card>
      </div>

      {/* Deployment List */}
      <Card className="bg-[#0A0A0A] border-gray-800">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="text-white">Deployment Queue ({filteredDeployments.length})</CardTitle>
          <CardDescription className="text-gray-400">
            Track the status of your contract deployments
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {filteredDeployments.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-300 mb-2">No deployments found</h3>
              <p className="text-gray-500">No deployments match your current filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDeployments.map((deployment) => (
                <Card 
                  key={deployment.queueId} 
                  className="bg-[#1A1A1A] border-gray-800 border-l-4 border-l-[#d548ec] hover:border-l-[#e7a4fd] transition-all duration-300 hover:shadow-lg hover:shadow-[#d548ec]/10"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold text-white">{deployment.eventName}</h3>
                          <Badge className={`${getStatusColor(deployment.status)} border`}>
                            {getStatusIcon(deployment.status)}
                            <span className="ml-1 capitalize">{deployment.status}</span>
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Queue ID:</span>
                            <div className="font-mono font-semibold text-[#d548ec]">#{deployment.queueId}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Template:</span>
                            <div className="font-semibold text-white capitalize">{deployment.template.replace('-', ' ')}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Category:</span>
                            <div className="font-semibold text-white capitalize">{deployment.category}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Supply:</span>
                            <div className="font-semibold text-white">{deployment.totalSupply.toLocaleString()} tickets</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Price:</span>
                            <div className="font-semibold text-white">{deployment.ticketPrice} PC</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Fee Paid:</span>
                            <div className="font-semibold text-[#d548ec]">{deployment.feePaid} PC</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                          <div>Created: {formatTimeAgo(deployment.createdAt)}</div>
                          {deployment.processedAt && (
                            <div>Processed: {formatTimeAgo(deployment.processedAt)}</div>
                          )}
                          {deployment.estimatedTime && deployment.status === 'pending' && (
                            <div className="text-yellow-500">ETA: {formatEstimatedTime(deployment.estimatedTime)}</div>
                          )}
                        </div>

                        {deployment.contractAddress && (
                          <div className="mt-4 p-4 bg-gradient-to-r from-green-500/10 to-green-600/5 border border-green-500/20 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-sm text-gray-400">Contract Address:</span>
                                <div className="font-mono text-sm font-semibold text-green-400">
                                  {formatAddress(deployment.contractAddress)}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-gray-700"
                                  onClick={() => copyToClipboard(deployment.contractAddress!)}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-[#d548ec] hover:bg-[#c030d6] text-white"
                                  onClick={() => window.open(`https://explorer.stacks.co/address/${deployment.contractAddress}?chain=testnet`, '_blank')}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-gray-700 text-white"
                          onClick={() => setSelectedDeployment(deployment)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deployment Details Modal */}
      {selectedDeployment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0A0A0A] border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-white">Deployment Details</CardTitle>
                  <CardDescription className="text-gray-400">Queue ID: #{selectedDeployment.queueId}</CardDescription>
                </div>
                <Button
                  className="bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-gray-700"
                  size="sm"
                  onClick={() => setSelectedDeployment(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Event Name:</span>
                  <div className="font-semibold text-white">{selectedDeployment.eventName}</div>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <Badge className={`${getStatusColor(selectedDeployment.status)} border mt-1`}>
                    {getStatusIcon(selectedDeployment.status)}
                    <span className="ml-1 capitalize">{selectedDeployment.status}</span>
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-600">Deployer:</span>
                  <div className="font-mono text-xs">{selectedDeployment.deployer}</div>
                </div>
                <div>
                  <span className="text-gray-600">Template:</span>
                  <div className="font-semibold capitalize">{selectedDeployment.template.replace('-', ' ')}</div>
                </div>
                <div>
                  <span className="text-gray-600">Total Supply:</span>
                  <div className="font-semibold">{selectedDeployment.totalSupply.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-gray-600">Ticket Price:</span>
                  <div className="font-semibold">{selectedDeployment.ticketPrice} PC</div>
                </div>
                <div>
                  <span className="text-gray-600">Fee Paid:</span>
                  <div className="font-semibold">{selectedDeployment.feePaid} PC</div>
                </div>
                <div>
                  <span className="text-gray-600">Category:</span>
                  <div className="font-semibold capitalize">{selectedDeployment.category}</div>
                </div>
              </div>

              {selectedDeployment.contractAddress && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Deployed Contract</h4>
                  <div className="text-sm">
                    <div className="flex justify-between items-center">
                      <span>Address:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{formatAddress(selectedDeployment.contractAddress)}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(selectedDeployment.contractAddress!)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedDeployment(null)}>
                  Close
                </Button>
                {selectedDeployment.contractAddress && (
                  <Button
                    onClick={() => window.open(`https://explorer.stacks.co/address/${selectedDeployment.contractAddress}?chain=testnet`, '_blank')}
                    className="bg-[#d548ec] hover:bg-[#c030d6]"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View on Explorer
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        )}
        </TabsContent>

        <TabsContent value="contracts" className="mt-6">
          <ContractManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeploymentQueue;