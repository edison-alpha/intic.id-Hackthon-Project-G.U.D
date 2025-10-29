import React, { useState, useRef, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Ticket,
  PlusCircle,
  LayoutDashboard,
  Home,
  Briefcase,
  Settings,
  FileText,
  ChevronLeft,
  Search,
  TrendingUp,
  Vote,
  Copy,
  ScanLine,
  Calendar,
  MapPin,
  Users,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import inticDarkSvg from '../assets/inticdark.svg';
import logoInticPng from '../assets/logointic.png';
import { useWallet } from "@/hooks/usePushChainWallet";
import { useUserProfile } from "@/hooks/useUserProfile";
import { PushUniversalAccountButton } from '@pushchain/ui-kit';
import { WalletConnectModal } from "@/components/WalletConnectModal";
import { useEOMode } from "@/contexts/EOContext";
import RealtimeBadges from "@/components/RealtimeBadges";
import { getAllDeployedEventsFromBlockchain } from '@/services/eventOrganizerContract';
import { fetchCompleteEventDetails } from '@/services/eventBrowseContract';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPermanentExpanded, setIsPermanentExpanded] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Wallet integration
  const { wallet, isWalletConnected, balance, isLoadingBalance } = useWallet();
  
  // Fetch user profile data
  const { profile: userProfile, isLoading: isLoadingProfile } = useUserProfile(wallet?.address);
  
  // Helper function to get avatar URL with cache busting
  const getAvatarUrl = (avatar: string | undefined) => {
    if (!avatar) return undefined;
    
    // Clean URL first - remove any existing cache busting params
    const cleanUrl = avatar.split('?')[0];
    
    // Add cache busting with timestamp
    const timestamp = Date.now();
    return `${cleanUrl}?t=${timestamp}`;
  };
  
  // Debug: Log profile data
  useEffect(() => {

    if (userProfile) {

      // Specifically debug avatar for EO
      if (userProfile.isEventOrganizer) {

        // Test if avatar URL is reachable
        if (userProfile.avatar) {

          fetch(userProfile.avatar)
            .then(response => {

            })
            .catch(error => {
              console.error('❌ Avatar URL test failed:', error);
            });
        }
      }
    } else {

    }
  }, [userProfile]);  // EO Mode integration
  const { isEOMode, toggleEOMode } = useEOMode();

  // Debug logging for balance
  useEffect(() => {

  }, [isWalletConnected, wallet?.address, balance, isLoadingBalance]);

  // Debug logging for profile
  useEffect(() => {
    if (userProfile) {

    }
  }, [userProfile]);

  // Menu items berdasarkan mode
  const menuItems = isEOMode ? [
    { path: "/app", icon: Home, label: "Browse Events", exact: true },
    { path: "/app/eo-portfolio", icon: LayoutDashboard, label: "EO Portfolio" },
    { path: "/app/my-tickets", icon: Ticket, label: "My Tickets" },
    { path: "/app/my-events", icon: Calendar, label: "My Events" },
    { path: "/app/check-in", icon: ScanLine, label: "Check-In" },
    { path: "/app/staking", icon: TrendingUp, label: "Staking" },
    { path: "/app/governance", icon: Vote, label: "Governance" },
  ] : [
    { path: "/app", icon: Home, label: "Browse Events", exact: true },
    { path: "/app/my-tickets", icon: Ticket, label: "My Tickets" },
    { path: "/app/check-in", icon: ScanLine, label: "Check-In" },
    { path: "/app/staking", icon: TrendingUp, label: "Staking" },
    { path: "/app/governance", icon: Vote, label: "Governance" },
  ];

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
    setIsPermanentExpanded(false); // Reset permanent expanded when toggling
  };

  // Handle double click on sidebar to toggle between overlay and full sidebar mode
  const handleSidebarDoubleClick = () => {
    if (isSidebarCollapsed && isHovering) {
      // From collapsed + hover (overlay mode) → Full sidebar (permanent)
      setIsPermanentExpanded(true);
      setIsSidebarCollapsed(false);
    } else if (!isSidebarCollapsed && !isPermanentExpanded) {
      // From full sidebar (permanent) → Collapsed (overlay mode)
      setIsSidebarCollapsed(true);
      setIsPermanentExpanded(false);
    }
  };

  // Determine if sidebar should be expanded
  const isSidebarExpanded = !isSidebarCollapsed || (isHovering && !isPermanentExpanded);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is inside any dropdown container
      const target = event.target as Node;
      const dropdownContainers = document.querySelectorAll('[data-dropdown-container]');
      let isInsideDropdown = false;
      
      dropdownContainers.forEach(container => {
        if (container.contains(target)) {
          isInsideDropdown = true;
        }
      });
      
      if (dropdownRef.current && !dropdownRef.current.contains(target) && !isInsideDropdown) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      // Delay adding listener to prevent immediate closure
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Dynamic profile menu
  // Dynamic profile menu
  const profileMenuItems = [
    { 
      icon: Briefcase, 
      label: "Portfolio", 
      path: isEOMode ? "/app/eo-portfolio" : "/app/portofolio" 
    },
    { icon: Settings, label: "Settings", path: "/app/settings" },
    { icon: FileText, label: "Terms & Conditions", path: "/app/terms" },
  ];

  // Debug profile menu items
  useEffect(() => {

  }, [isEOMode]);

  // Search functionality
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowSearchDropdown(true);

    try {
      // Get all deployed events
      const deployedEvents = await getAllDeployedEventsFromBlockchain();
      
      // Fetch details for each event and filter based on search query
      const searchLower = query.toLowerCase().trim();
      const results = [];
      
      for (const deployed of deployedEvents) {
        try {
          const liveData = await fetchCompleteEventDetails(deployed.eventContract);
          
          if (!liveData) continue;

          // Check if matches search query
          const matchesTitle = liveData.title?.toLowerCase().includes(searchLower);
          const matchesLocation = liveData.location?.toLowerCase().includes(searchLower);
          const matchesOrganizer = deployed.organizer?.toLowerCase().includes(searchLower);
          const matchesContract = deployed.eventContract?.toLowerCase().includes(searchLower);

          if (matchesTitle || matchesLocation || matchesOrganizer || matchesContract) {
            results.push({
              id: deployed.eventContract,
              title: liveData.title || 'Unnamed Event',
              location: liveData.location || 'TBA',
              date: liveData.date || new Date(deployed.deployedAt * 1000).toLocaleDateString(),
              image: liveData.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80',
              price: liveData.price || '0',
              available: liveData.available || 0,
              organizer: deployed.organizer,
              isCancelled: liveData.eventCancelled || false,
              isPaused: liveData.eventPaused || false,
            });
          }

          // Limit results to 8
          if (results.length >= 8) break;
        } catch (error) {
          console.error('Error fetching event details:', error);
        }
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navigate to event
  const handleEventClick = (eventId: string) => {
    navigate(`/app/event/${eventId}`);
    setSearchQuery('');
    setShowSearchDropdown(false);
  };

  return (
    <>
      <div className="min-h-screen bg-[#0A0A0A]">
      {/* Backdrop Blur Overlay - Only when sidebar is collapsed and hovering (overlay mode) */}
      {isSidebarCollapsed && isHovering && !isPermanentExpanded && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 md:block hidden transition-opacity duration-300" 
          onDoubleClick={handleSidebarDoubleClick}
        />
      )}

      {/* Desktop Sidebar */}
      <aside
        ref={sidebarRef}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onDoubleClick={handleSidebarDoubleClick}
        className={`hidden md:flex flex-col bg-[#1A1A1A] border-r border-gray-800 transition-all duration-300 ease-in-out fixed left-0 top-0 bottom-0 h-screen z-40 ${
          isSidebarExpanded ? "w-64" : "w-20"
        } ${
          isSidebarCollapsed && isHovering && !isPermanentExpanded ? "shadow-2xl" : ""
        }`}
        title={
          isSidebarCollapsed && isHovering 
            ? "Double-click to pin sidebar" 
            : !isSidebarCollapsed 
            ? "Double-click to collapse sidebar" 
            : ""
        }
      >
        {/* Logo & Toggle */}
        <div className={`h-16 flex items-center border-b border-gray-800 ${
          isSidebarExpanded ? "justify-between px-4" : "justify-center px-3"
        }`}>
          {isSidebarExpanded && (
            <a href="/" className="flex items-center gap-2">
              <img src={inticDarkSvg} alt="intic.id" className="h-8 w-auto" />
            </a>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            {!isSidebarExpanded ? (
              <img src={logoInticPng} alt="Logo" className="w-8 h-8" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-gray-400 hover:text-white" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 py-4 space-y-2 ${isSidebarExpanded ? "px-3" : "px-3"}`}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-lg transition-all duration-200 group ${
                  isSidebarExpanded ? "px-3 py-3" : "justify-center px-3 py-3"
                } ${
                  isActive
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
                title={!isSidebarExpanded ? item.label : ""}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-[#d548ec]" : ""}`} />
                {isSidebarExpanded && (
                  <span className="font-medium text-sm">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Create Event Button - Only visible in EO Mode */}
        {isEOMode && (
          <div className={`border-t border-gray-800 ${isSidebarExpanded ? "px-3 py-4" : "px-3 py-4"}`}>
            <NavLink
              to="/app/create-event"
              className={`flex items-center gap-2 bg-[#d548ec] hover:bg-[#c030d6] text-white rounded-full transition-all duration-200 font-medium text-sm shadow-lg hover:shadow-xl ${
                isSidebarExpanded ? "justify-center px-3 py-3" : "justify-center px-3 py-3"
              }`}
              title={!isSidebarExpanded ? "Create Event" : ""}
            >
              <PlusCircle className="w-5 h-5 flex-shrink-0" />
              {isSidebarExpanded && <span>Create Event</span>}
            </NavLink>
          </div>
        )}

        {/* User Section */}
        <div className={`border-t border-gray-800 ${isSidebarExpanded ? "p-4" : "p-3"}`}>
          {isSidebarExpanded ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => {

                  setIsDropdownOpen(!isDropdownOpen);

                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#d548ec] to-purple-600 flex items-center justify-center text-white font-bold overflow-hidden">
                  {isLoadingProfile ? (
                    <div className="animate-pulse w-full h-full bg-gray-700"></div>
                  ) : userProfile?.avatar ? (
                    <img 
                      src={getAvatarUrl(userProfile.avatar)} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        console.error('❌ Avatar image failed to load:', {
                          src: e.currentTarget.src,
                          originalAvatar: userProfile.avatar,
                          error: e
                        });
                        // Try fallback: load without cache busting
                        if (e.currentTarget.src !== userProfile.avatar) {

                          e.currentTarget.src = userProfile.avatar;
                        }
                      }}
                    />
                  ) : isWalletConnected && wallet?.address ? (
                    wallet.address.slice(0, 2).toUpperCase()
                  ) : (
                    'A'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {isLoadingProfile ? (
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-700 rounded animate-pulse w-24"></div>
                      <div className="h-2 bg-gray-700 rounded animate-pulse w-16"></div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-white truncate flex items-center gap-1">
                        {userProfile?.username || (isWalletConnected && wallet?.address
                          ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
                          : 'Anonymous'
                        )}
                        {userProfile?.isVerified && (
                          <svg className="w-3.5 h-3.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </p>
                      <p className={`text-xs truncate ${isWalletConnected ? 'text-green-400' : 'text-gray-500'}`}>
                        {isWalletConnected ? (
                          userProfile?.isEventOrganizer ? (
                            <span className="flex items-center gap-1">
                              <span className="inline-block w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                              Event Organizer
                            </span>
                          ) : (
                            'Connected'
                          )
                        ) : (
                          'Not Connected'
                        )}
                      </p>
                    </>
                  )}
                </div>
              </button>

              {/* Dropdown Menu - Desktop Expanded */}
              {isDropdownOpen && (
                <div 
                  className="fixed bottom-20 left-4 w-56 bg-[#1A1A1A] border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-[99999]"
                  data-dropdown-container="true"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent closing when clicking inside

                  }}
                >
                  {(() => {

                    return null;
                  })()}
                  
                  {/* Desktop handling - Clean design */}
                  {profileMenuItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();

                          setIsDropdownOpen(false);
                          
                          setTimeout(() => {
                            try {
                              navigate(item.path);
                            } catch (error) {
                              window.location.href = item.path;
                            }
                          }, 100);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors text-gray-300 hover:text-white border-b border-gray-800 last:border-b-0 cursor-pointer text-left"
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => {

                  setIsDropdownOpen(!isDropdownOpen);

                }}
                className="flex justify-center p-2 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer relative"
                title="Profile Menu"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#d548ec] to-purple-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                  {userProfile?.avatar ? (
                    <img 
                      src={getAvatarUrl(userProfile.avatar)} 
                      alt="Avatar" 
                      className="w-full h-full object-cover" 
                    />
                  ) : isWalletConnected && wallet?.address ? (
                    wallet.address.slice(0, 2).toUpperCase()
                  ) : (
                    'A'
                  )}
                </div>
                {isWalletConnected && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-[#1A1A1A]"></div>
                )}
              </button>

              {/* Dropdown Menu - Desktop Collapsed */}
              {isDropdownOpen && (
                <div 
                  className="fixed bottom-20 left-20 w-56 bg-[#1A1A1A] border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-[99999]"
                  data-dropdown-container="true"
                >
                  {(() => {

                    return null;
                  })()}
                  
                  {/* Desktop Collapsed handling - Clean design */}
                  {profileMenuItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();

                          setIsDropdownOpen(false);
                          
                          setTimeout(() => {
                            try {
                              navigate(item.path);
                            } catch (error) {
                              window.location.href = item.path;
                            }
                          }, 100);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors text-gray-300 hover:text-white border-b border-gray-800 last:border-b-0 cursor-pointer text-left"
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Desktop Navbar - Fixed */}
      <nav className={`hidden md:block fixed top-0 right-0 z-30 bg-[#0A0A0A]/30 backdrop-blur-md border-b border-gray-800/30 transition-all duration-300 ${
        !isSidebarCollapsed ? "left-64" : "left-[84px]"
      }`}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && setShowSearchDropdown(true)}
                placeholder="Search by event name, location, or organizer address..."
                className="w-full bg-[#1A1A1A] border border-gray-800 rounded-lg pl-10 pr-10 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#d548ec] focus:ring-1 focus:ring-[#d548ec] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setShowSearchDropdown(false);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors z-10"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              {/* Search Dropdown */}
              {showSearchDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-gray-800 rounded-xl shadow-2xl max-h-[500px] overflow-y-auto z-50">
                  {isSearching ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-[#d548ec] animate-spin" />
                      <span className="ml-2 text-sm text-gray-400">Searching...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="py-2">
                      {searchResults.map((event) => (
                        <button
                          key={event.id}
                          onClick={() => handleEventClick(event.id)}
                          className="w-full px-4 py-3 hover:bg-gray-800/50 transition-colors text-left flex items-center gap-3 group"
                        >
                          {/* Event Image */}
                          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
                            <img 
                              src={event.image} 
                              alt={event.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          </div>

                          {/* Event Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-semibold text-white group-hover:text-[#d548ec] transition-colors truncate">
                                {event.title}
                              </h4>
                              {(event.isCancelled || event.isPaused) && (
                                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                                  event.isCancelled 
                                    ? 'bg-red-600/20 text-red-400' 
                                    : 'bg-yellow-600/20 text-yellow-400'
                                }`}>
                                  {event.isCancelled ? 'CANCELLED' : 'PAUSED'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {event.location}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {event.date}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {event.available} left
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-gray-500 truncate">
                              Organizer: {event.organizer?.substring(0, 10)}...
                            </div>
                          </div>

                          {/* Price */}
                          <div className="flex-shrink-0 text-right">
                            <div className="text-sm font-bold text-white">{event.price}</div>
                            <div className="text-xs text-gray-400">STX</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : searchQuery.trim().length >= 2 ? (
                    <div className="py-8 text-center">
                      <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-400">No events found for "{searchQuery}"</p>
                      <p className="text-xs text-gray-500 mt-1">Try searching by event name, location, or organizer address</p>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-400">Start typing to search events</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* EO Mode Toggle & Wallet Button */}
            <div className="flex items-center gap-3">
              {/* EO Mode Toggle */}
              <div className="flex items-center gap-2 bg-[#1A1A1A] border border-gray-800 rounded-full px-4 py-2">
                <span className={`text-xs font-medium transition-colors ${!isEOMode ? 'text-white' : 'text-gray-500'}`}>
                  User
                </span>
                <button
                  onClick={toggleEOMode}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                    isEOMode ? 'bg-gradient-to-r from-[#d548ec] to-purple-600' : 'bg-gray-700'
                  }`}
                  title={isEOMode ? 'Switch to User Mode' : 'Switch to EO Mode'}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${
                      isEOMode ? 'left-[26px]' : 'left-0.5'
                    }`}
                  />
                </button>
                <span className={`text-xs font-medium transition-colors ${isEOMode ? 'text-white' : 'text-gray-500'}`}>
                  EO
                </span>
              </div>
              
              {/* Wallet Button */}
              <PushUniversalAccountButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${
        !isSidebarCollapsed ? "md:ml-64" : "md:ml-[84px]"
      }`}>
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-[#1A1A1A]/95 backdrop-blur-xl border-b border-gray-800/50 flex items-center justify-between px-6 fixed top-0 left-0 right-0 z-30 pt-safe-area-inset-top">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2">
              <img src={inticDarkSvg} alt="intic.id" className="h-8 w-auto" />
            </a>
            {/* EO Mode Badge - Mobile */}
            {isEOMode && (
              <span className="px-2 py-1 bg-gradient-to-r from-[#d548ec] to-purple-600 text-white text-xs font-bold rounded-full">
                EO
              </span>
            )}
          </div>
          
          {/* Right Side: Avatar + Wallet */}
          <div className="flex items-center gap-4">
            {/* Wallet Button - Mobile */}
            <PushUniversalAccountButton />
            
            {/* Profile Avatar with Dropdown */}
            <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => {

                setIsDropdownOpen(!isDropdownOpen);

              }}
              className="flex items-center relative p-1"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#d548ec] to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg overflow-hidden">
                {userProfile?.avatar ? (
                  <img 
                    src={getAvatarUrl(userProfile.avatar)} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      console.error('❌ Mobile avatar image failed to load:', {
                        src: e.currentTarget.src,
                        originalAvatar: userProfile.avatar,
                        error: e
                      });
                      // Try fallback: load without cache busting
                      if (e.currentTarget.src !== userProfile.avatar) {

                        e.currentTarget.src = userProfile.avatar;
                      }
                    }}
                  />
                ) : isWalletConnected && wallet?.address ? (
                  wallet.address.slice(0, 2).toUpperCase()
                ) : (
                  'A'
                )}
              </div>
              {isWalletConnected && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-[#1A1A1A] shadow-sm"></div>
              )}
            </button>

            {/* Dropdown Menu - Mobile */}
            {isDropdownOpen && (
              <div 
                className="absolute top-full right-0 mt-2 w-64 bg-[#1A1A1A] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                data-dropdown-container="true"
              >
                {(() => {

                  return null;
                })()}
                {/* User Info */}
                <div className="px-4 py-3 border-b border-gray-800 bg-gradient-to-br from-[#d548ec]/10 to-purple-600/10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#d548ec] to-purple-600 flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
                      {userProfile?.avatar ? (
                        <img 
                          src={getAvatarUrl(userProfile.avatar)} 
                          alt="Avatar" 
                          className="w-full h-full object-cover" 
                        />
                      ) : isWalletConnected && wallet?.address ? (
                        wallet.address.slice(0, 2).toUpperCase()
                      ) : (
                        'A'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate flex items-center gap-1">
                        {userProfile?.username || (isWalletConnected ? `${wallet?.address?.slice(0, 6)}...${wallet?.address?.slice(-4)}` : 'Anonymous')}
                        {userProfile?.isVerified && (
                          <svg className="w-3.5 h-3.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        {isWalletConnected ? (
                          userProfile?.isEventOrganizer ? (
                            <span className="flex items-center gap-1">
                              <span className="inline-block w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                              Event Organizer
                            </span>
                          ) : (
                            'Connected'
                          )
                        ) : (
                          'Not Connected'
                        )}
                      </p>
                    </div>
                    {isWalletConnected && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(wallet?.address || '');
                          toast.success('Address copied to clipboard!');
                        }}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                        title="Copy address"
                      >
                        <Copy className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>

                {/* EO Mode Toggle - Mobile */}
                <div className="px-4 py-3 border-b border-gray-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-400">Event Organizer Mode</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleEOMode();
                      }}
                      className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                        isEOMode ? 'bg-gradient-to-r from-[#d548ec] to-purple-600' : 'bg-gray-700'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${
                          isEOMode ? 'left-[26px]' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {isEOMode ? 'You can create and manage events' : 'Switch to access EO features'}
                  </p>
                </div>

                {/* Menu Items - Mobile handling - Clean design */}
                {profileMenuItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        setIsDropdownOpen(false);
                        
                        setTimeout(() => {
                          try {
                            navigate(item.path);
                          } catch (error) {
                            window.location.href = item.path;
                          }
                        }, 100);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-800 active:bg-gray-700 transition-colors text-gray-300 hover:text-white border-b border-gray-800 last:border-b-0 cursor-pointer text-left"
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        </header>

        {/* Realtime Activity Badges - Always visible on all /app pages */}
        <div className="md:mt-16 mt-0">
          <RealtimeBadges />
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-auto md:pb-0 pb-20 md:pt-0 pt-0">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1A1A1A]/95 backdrop-blur-xl border-t border-gray-800/50 z-30 pb-safe-area-inset-bottom">
          <div className="flex items-center justify-around h-20 px-2">
            {/* Browse Events */}
            <NavLink
              to="/app"
              end
              className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-200 rounded-xl mx-1 active:scale-95"
            >
              {({ isActive }) => (
                <>
                  <div className={`p-2.5 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? "bg-gradient-to-br from-[#d548ec]/20 to-purple-600/20 shadow-lg shadow-[#d548ec]/10" 
                      : ""
                  }`}>
                    <Home className={`w-6 h-6 transition-colors ${isActive ? "text-[#d548ec]" : "text-gray-400"}`} />
                  </div>
                  <span className={`text-xs font-medium transition-colors ${isActive ? "text-[#d548ec]" : "text-gray-400"}`}>
                    Browse
                  </span>
                </>
              )}
            </NavLink>

            {/* My Tickets */}
            <NavLink
              to="/app/my-tickets"
              className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-200 rounded-xl mx-1 active:scale-95"
            >
              {({ isActive }) => (
                <>
                  <div className={`p-2.5 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? "bg-gradient-to-br from-[#d548ec]/20 to-purple-600/20 shadow-lg shadow-[#d548ec]/10" 
                      : ""
                  }`}>
                    <Ticket className={`w-6 h-6 transition-colors ${isActive ? "text-[#d548ec]" : "text-gray-400"}`} />
                  </div>
                  <span className={`text-xs font-medium transition-colors ${isActive ? "text-[#d548ec]" : "text-gray-400"}`}>
                    Tickets
                  </span>
                </>
              )}
            </NavLink>
            
            {/* Center Button - Scan (User Mode) or Create (EO Mode) */}
            <NavLink
              to={isEOMode ? "/app/create-event" : "/app/scan"}
              className="flex flex-col items-center justify-center flex-1 h-full gap-1 active:scale-95"
            >
              {({ isActive }) => (
                <>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center -mt-8 shadow-2xl border-4 border-[#0A0A0A] transition-all duration-200 ${
                    isActive
                      ? isEOMode 
                        ? "bg-gradient-to-br from-[#d548ec] to-purple-600 shadow-[#d548ec]/50 scale-105" 
                        : "bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/50 scale-105"
                      : isEOMode 
                        ? "bg-gradient-to-br from-[#d548ec]/80 to-purple-600/80 shadow-[#d548ec]/30" 
                        : "bg-gradient-to-br from-blue-500/80 to-blue-600/80 shadow-blue-500/30"
                  }`}>
                    {isEOMode ? (
                      <PlusCircle className="w-7 h-7 text-white" />
                    ) : (
                      <ScanLine className="w-7 h-7 text-white" />
                    )}
                  </div>
                  <span className={`text-xs font-semibold mt-1 transition-colors ${
                    isActive
                      ? isEOMode ? "text-[#d548ec]" : "text-blue-500"
                      : isEOMode ? "text-[#d548ec]/60" : "text-blue-500/60"
                  }`}>
                    {isEOMode ? "Create" : "Scan"}
                  </span>
                </>
              )}
            </NavLink>

            {/* Check-In - Only visible in EO Mode on Mobile */}
            {isEOMode && (
              <NavLink
                to="/app/my-events"
                className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-200 rounded-xl mx-1 active:scale-95"
              >
                {({ isActive }) => (
                  <>
                    <div className={`p-2.5 rounded-xl transition-all duration-200 ${
                      isActive 
                        ? "bg-gradient-to-br from-[#d548ec]/20 to-purple-600/20 shadow-lg shadow-[#d548ec]/10" 
                        : ""
                    }`}>
                      <Calendar className={`w-6 h-6 transition-colors ${isActive ? "text-[#d548ec]" : "text-gray-400"}`} />
                    </div>
                    <span className={`text-xs font-medium transition-colors ${isActive ? "text-[#d548ec]" : "text-gray-400"}`}>
                      My Events
                    </span>
                  </>
                )}
              </NavLink>
            )}

            {/* Staking */}
            <NavLink
              to="/app/staking"
              className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-200 rounded-xl mx-1 active:scale-95"
            >
              {({ isActive }) => (
                <>
                  <div className={`p-2.5 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? "bg-gradient-to-br from-[#d548ec]/20 to-purple-600/20 shadow-lg shadow-[#d548ec]/10" 
                      : ""
                  }`}>
                    <TrendingUp className={`w-6 h-6 transition-colors ${isActive ? "text-[#d548ec]" : "text-gray-400"}`} />
                  </div>
                  <span className={`text-xs font-medium transition-colors ${isActive ? "text-[#d548ec]" : "text-gray-400"}`}>
                    Staking
                  </span>
                </>
              )}
            </NavLink>

            {/* Governance */}
            <NavLink
              to="/app/governance"
              className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-200 rounded-xl mx-1 active:scale-95"
            >
              {({ isActive }) => (
                <>
                  <div className={`p-2.5 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? "bg-gradient-to-br from-[#d548ec]/20 to-purple-600/20 shadow-lg shadow-[#d548ec]/10" 
                      : ""
                  }`}>
                    <Vote className={`w-6 h-6 transition-colors ${isActive ? "text-[#d548ec]" : "text-gray-400"}`} />
                  </div>
                  <span className={`text-xs font-medium transition-colors ${isActive ? "text-[#d548ec]" : "text-gray-400"}`}>
                    Vote
                  </span>
                </>
              )}
            </NavLink>
          </div>
        </nav>
      </div>
    </div>

    {/* Wallet Connect Modal */}
    <WalletConnectModal
      isOpen={showWalletModal}
      onClose={() => setShowWalletModal(false)}
    />
  </>

);

};

export default AppLayout;
