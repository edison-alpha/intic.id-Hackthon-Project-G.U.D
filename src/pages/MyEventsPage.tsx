import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import ContractManagement from "@/components/ContractManagement";
import { useEOMode } from "@/contexts/EOContext";

const MyEventsPage = () => {
  const navigate = useNavigate();
  const { isEOMode, isTransitioning } = useEOMode();

  // Redirect to home if not in EO mode
  useEffect(() => {
    if (!isEOMode && !isTransitioning) {
      // Delay navigation to avoid React error
      const timer = setTimeout(() => {
        navigate('/app');
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isEOMode, isTransitioning, navigate]);

  // Don't render anything if not in EO mode
  if (!isEOMode) {
    return null;
  }

  return (
    <AppLayout>
      <div className="px-6 pb-8 md:px-6 md:pb-6">
        {/* Header */}
        <div className="mb-8 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">My Events</h1>
                <span className="px-3 py-1 bg-gradient-to-r from-[#d548ec] to-purple-600 text-white text-xs font-bold rounded-full">
                  EVENT ORGANIZER
                </span>
              </div>
              <p className="text-base md:text-base text-gray-400 leading-relaxed">Manage your events and smart contracts on Push Chain</p>
            </div>
          </div>
        </div>

        {/* Contract Management Component */}
        <ContractManagement />
      </div>
    </AppLayout>
  );
};

export default MyEventsPage;
