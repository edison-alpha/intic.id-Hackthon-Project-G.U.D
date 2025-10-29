import React, { useState } from "react";
import AppLayout from "@/components/AppLayout";
import STXIcon from "@/components/STXIcon";
import { CheckCircle2, Clock, TrendingUp, Users, MessageSquare, ThumbsUp, ThumbsDown, Minus } from "lucide-react";
import { toast } from "sonner";

const Governance = () => {
  // Mock user staking data - PushChain
  const userStaking = {
    totalStaked: 2500,
    tier: "Silver",
    votingPower: 2500, // 1 PC = 1 vote on PushChain
    votesUsed: 1000,
    votesAvailable: 1500
  };

  const [votes, setVotes] = useState<{[key: number]: 'yes' | 'no' | 'abstain' | null}>({});

  const proposals = [
    {
      id: 1,
      title: "Add Drake as Headliner for Summer Music Festival",
      description: "Proposal to add Drake as the main headliner for the Summer Music Festival 2025. This would increase ticket prices by 5 PC but significantly boost event prestige and attract more attendees to PushChain events.",
      category: "Lineup",
      event: "Summer Music Festival 2025",
      status: "active",
      votingEnds: "May 30, 2025",
      hoursLeft: 72,
      votes: {
        yes: 12450,
        no: 3200,
        abstain: 800
      },
      totalVotes: 16450,
      quorum: 10000,
      proposer: "EventOrg_Official",
      proposedDate: "May 15, 2025"
    },
    {
      id: 2,
      title: "Change NBA Finals Game 5 Date to June 22",
      description: "Due to potential scheduling conflicts, we propose moving the event from June 20 to June 22. All ticket holders will be notified and given refund options via PushChain smart contracts if they cannot attend the new date.",
      category: "Schedule",
      event: "NBA Finals Game 5",
      status: "active",
      votingEnds: "May 25, 2025",
      hoursLeft: 24,
      votes: {
        yes: 8900,
        no: 5100,
        abstain: 1000
      },
      totalVotes: 15000,
      quorum: 10000,
      proposer: "SportsArena_DAO",
      proposedDate: "May 18, 2025"
    },
    {
      id: 3,
      title: "Add VIP Lounge Area to Web3 Conference",
      description: "Proposal to create an exclusive VIP lounge area for Gold and Platinum tier holders on PushChain. This would include complimentary food, drinks, and networking opportunities with blockchain leaders.",
      category: "Venue",
      event: "Web3 Conference 2025",
      status: "active",
      votingEnds: "June 1, 2025",
      hoursLeft: 120,
      votes: {
        yes: 9500,
        no: 2100,
        abstain: 400
      },
      totalVotes: 12000,
      quorum: 8000,
      proposer: "Web3_Community",
      proposedDate: "May 10, 2025"
    },
    {
      id: 4,
      title: "Implement Dynamic Pricing for High-Demand Events",
      description: "Proposal to implement surge pricing during high-demand periods on PushChain. Prices would increase by up to 25% but tier discounts would still apply. This helps prevent bots and scalpers while maintaining fair access.",
      category: "Pricing",
      event: "Platform-wide",
      status: "passed",
      votingEnds: "May 20, 2025",
      hoursLeft: 0,
      votes: {
        yes: 18200,
        no: 8100,
        abstain: 1700
      },
      totalVotes: 28000,
      quorum: 15000,
      proposer: "INTIC_Treasury",
      proposedDate: "May 1, 2025"
    },
    {
      id: 5,
      title: "Reduce Royalty Fee from 5% to 3%",
      description: "Community proposal to reduce the PushChain platform royalty fee on secondary sales from 5% to 3%. This would make resale more attractive while still supporting the platform and event organizers.",
      category: "Economics",
      event: "Platform-wide",
      status: "rejected",
      votingEnds: "May 15, 2025",
      hoursLeft: 0,
      votes: {
        yes: 7200,
        no: 15800,
        abstain: 2000
      },
      totalVotes: 25000,
      quorum: 15000,
      proposer: "Community_DAO",
      proposedDate: "April 25, 2025"
    }
  ];

  const handleVote = (proposalId: number, voteType: 'yes' | 'no' | 'abstain') => {
    if (userStaking.votesAvailable <= 0) {
      toast.error("Not enough voting power! Stake more PC on PushChain to gain votes.");
      return;
    }

    setVotes({ ...votes, [proposalId]: voteType });
    toast.success(`Vote submitted: ${voteType.toUpperCase()}`, {
      description: `Used ${userStaking.totalStaked} PC voting power on PushChain`
    });
  };

  const activeProposals = proposals.filter(p => p.status === 'active');
  const pastProposals = proposals.filter(p => p.status !== 'active');

  const getCategoryColor = (category: string) => {
    const colors: {[key: string]: string} = {
      'Lineup': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'Schedule': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Venue': 'bg-green-500/20 text-green-400 border-green-500/30',
      'Pricing': 'bg-[#e7a4fd]/20 text-[#e7a4fd] border-[#e7a4fd]/30',
      'Economics': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    };
    return colors[category] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full border border-green-500/30">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          ACTIVE
        </span>
      );
    } else if (status === 'passed') {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full border border-blue-500/30">
          <CheckCircle2 className="w-3 h-3" />
          PASSED
        </span>
      );
    } else {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full border border-red-500/30">
          <Minus className="w-3 h-3" />
          REJECTED
        </span>
      );
    }
  };

  return (
    <AppLayout>
      <div className="px-4 pb-6 md:px-6 md:pb-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h1 className="text-3xl md:text-4xl font-bold text-white">Governance</h1>
            <span className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/40 rounded-full text-yellow-400 text-xs font-bold">
              COMING SOON
            </span>
          </div>
          <p className="text-gray-400">Vote on proposals and shape the future of INTIC events</p>
        </div>

        {/* Voting Power Card */}
        <div className="mb-8 p-6 bg-gradient-to-r from-[#d548ec]/10 to-purple-600/10 border-2 border-[#d548ec]/30 rounded-xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-[#d548ec]" />
                <p className="text-gray-400 text-sm">Total Staked</p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-white">{userStaking.totalStaked.toFixed(2)}</p>
                <STXIcon size="md" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-purple-400" />
                <p className="text-gray-400 text-sm">Your Tier</p>
              </div>
              <p className="text-2xl font-bold text-white">{userStaking.tier}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <ThumbsUp className="w-5 h-5 text-green-400" />
                <p className="text-gray-400 text-sm">Voting Power</p>
              </div>
              <p className="text-2xl font-bold text-white">{userStaking.votingPower.toLocaleString()}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                <p className="text-gray-400 text-sm">Available Votes</p>
              </div>
              <p className="text-2xl font-bold text-white">{userStaking.votesAvailable.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Active Proposals */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Active Proposals ({activeProposals.length})</h2>
          
          <div className="space-y-4">
            {activeProposals.map((proposal) => {
              const yesPercentage = (proposal.votes.yes / proposal.totalVotes) * 100;
              const noPercentage = (proposal.votes.no / proposal.totalVotes) * 100;
              const abstainPercentage = (proposal.votes.abstain / proposal.totalVotes) * 100;
              const quorumReached = proposal.totalVotes >= proposal.quorum;

              return (
                <div key={proposal.id} className="bg-[#0A0A0A] border-2 border-gray-800 rounded-xl p-6 hover:border-[#d548ec]/50 transition-all">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {getStatusBadge(proposal.status)}
                        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getCategoryColor(proposal.category)}`}>
                          {proposal.category}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">{proposal.title}</h3>
                      <p className="text-gray-400 text-sm mb-3">{proposal.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Event: <span className="text-gray-300">{proposal.event}</span></span>
                        <span>•</span>
                        <span>By: <span className="text-gray-300">{proposal.proposer}</span></span>
                      </div>
                    </div>

                    {/* Time Left Badge */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2 px-3 py-2 bg-black/30 rounded-lg border border-gray-800">
                        <Clock className="w-4 h-4 text-[#d548ec]" />
                        <div className="text-right">
                          <p className="text-white text-sm font-bold">{proposal.hoursLeft}h</p>
                          <p className="text-gray-500 text-xs">left</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Voting Results */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm">Results</span>
                      <span className={`text-sm font-bold ${quorumReached ? 'text-green-400' : 'text-yellow-400'}`}>
                        {quorumReached ? '✓ Quorum Reached' : `${proposal.totalVotes.toLocaleString()} / ${proposal.quorum.toLocaleString()} votes`}
                      </span>
                    </div>

                    {/* Vote Bars */}
                    <div className="space-y-2">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-green-400 text-sm font-medium">Yes</span>
                          <span className="text-green-400 text-sm font-bold">{yesPercentage.toFixed(1)}% ({proposal.votes.yes.toLocaleString()})</span>
                        </div>
                        <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500" style={{ width: `${yesPercentage}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-red-400 text-sm font-medium">No</span>
                          <span className="text-red-400 text-sm font-bold">{noPercentage.toFixed(1)}% ({proposal.votes.no.toLocaleString()})</span>
                        </div>
                        <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500" style={{ width: `${noPercentage}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-400 text-sm font-medium">Abstain</span>
                          <span className="text-gray-400 text-sm font-bold">{abstainPercentage.toFixed(1)}% ({proposal.votes.abstain.toLocaleString()})</span>
                        </div>
                        <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                          <div className="h-full bg-gray-500" style={{ width: `${abstainPercentage}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Voting Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleVote(proposal.id, 'yes')}
                      disabled={votes[proposal.id] === 'yes'}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                        votes[proposal.id] === 'yes'
                          ? 'bg-green-500 text-white'
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <ThumbsUp className="w-4 h-4" />
                        <span>Vote Yes</span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleVote(proposal.id, 'no')}
                      disabled={votes[proposal.id] === 'no'}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                        votes[proposal.id] === 'no'
                          ? 'bg-red-500 text-white'
                          : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <ThumbsDown className="w-4 h-4" />
                        <span>Vote No</span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleVote(proposal.id, 'abstain')}
                      disabled={votes[proposal.id] === 'abstain'}
                      className={`py-3 px-6 rounded-lg font-bold transition-all ${
                        votes[proposal.id] === 'abstain'
                          ? 'bg-gray-500 text-white'
                          : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 border border-gray-500/30'
                      }`}
                    >
                      Abstain
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Past Proposals */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Past Proposals ({pastProposals.length})</h2>
          
          <div className="space-y-4">
            {pastProposals.map((proposal) => {
              const yesPercentage = (proposal.votes.yes / proposal.totalVotes) * 100;
              const noPercentage = (proposal.votes.no / proposal.totalVotes) * 100;

              return (
                <div key={proposal.id} className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-6 opacity-75">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {getStatusBadge(proposal.status)}
                        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getCategoryColor(proposal.category)}`}>
                          {proposal.category}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{proposal.title}</h3>
                      <p className="text-gray-500 text-sm mb-2">{proposal.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Ended: {proposal.votingEnds}</span>
                      </div>
                    </div>
                  </div>

                  {/* Final Results */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-black/30 rounded-lg border border-green-500/30">
                      <p className="text-green-400 text-xs mb-1">Yes</p>
                      <p className="text-white font-bold">{yesPercentage.toFixed(1)}%</p>
                    </div>
                    <div className="p-3 bg-black/30 rounded-lg border border-red-500/30">
                      <p className="text-red-400 text-xs mb-1">No</p>
                      <p className="text-white font-bold">{noPercentage.toFixed(1)}%</p>
                    </div>
                    <div className="p-3 bg-black/30 rounded-lg border border-gray-800">
                      <p className="text-gray-400 text-xs mb-1">Total Votes</p>
                      <p className="text-white font-bold">{proposal.totalVotes.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Governance;
