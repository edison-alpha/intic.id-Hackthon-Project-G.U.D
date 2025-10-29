
import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  index: number;
}

const FeatureCard = ({ icon, title, description, index }: FeatureCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    
    if (cardRef.current) {
      observer.observe(cardRef.current);
    }
    
    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);
  
  return (
    <div 
      ref={cardRef}
      className={cn(
        "feature-card opacity-0 bg-white rounded-2xl p-8 shadow-sm border border-gray-100",
        "hover:shadow-lg transition-all duration-300"
      )}
      style={{ animationDelay: `${0.1 * index}s` }}
    >
      <div className="rounded-xl bg-black w-14 h-14 flex items-center justify-center text-white mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3 text-gray-900">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
};

const Features = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const elements = entry.target.querySelectorAll(".fade-in-element");
            elements.forEach((el, index) => {
              setTimeout(() => {
                el.classList.add("animate-fade-in");
              }, index * 100);
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    
    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }
    
    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);
  
  return (
    <section className="py-20 md:py-32 relative bg-white" id="features" ref={sectionRef}>
      <div className="section-container">
        <div className="text-center mb-16">
          <div className="pulse-chip mx-auto mb-4 opacity-0 fade-in-element">
            <span>Platform Features</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 opacity-0 fade-in-element">
            Universal NFT Ticketing Platform
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto opacity-0 fade-in-element">
            Built on Push Chain's universal infrastructure. Deploy once, reach users from any blockchain with wallet abstraction and cross-chain compatibility.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* Large feature card - top left */}
          <div className="md:row-span-2">
            <div className="bg-black text-white rounded-2xl p-12 h-full flex flex-col justify-center shadow-xl">
              <h3 className="text-4xl font-bold mb-6 leading-tight">
                Deploy Once,<br />Reach Everyone
              </h3>
              <p className="text-gray-300 text-lg leading-relaxed">
                Built on Push Chain's universal layer. Create events once and let users from any blockchain participate with their existing wallets and tokens - no bridges needed.
              </p>
            </div>
          </div>

          {/* Top right card */}
          <FeatureCard
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path></svg>}
            title="Universal Chain Compatibility"
            description="Users from Ethereum, Solana, BNB Chain, and more can interact with your events seamlessly. Push Chain handles cross-chain complexity automatically."
            index={0}
          />

          {/* Bottom left card */}
          <FeatureCard
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><path d="M3 3h18v18H3zM3 9h18M9 21V9"></path></svg>}
            title="Instant Transactions & Low Fees"
            description="Experience sub-second finality and ultra-low gas fees. Users can pay in any token from any chain without bridging or complicated swaps."
            index={1}
          />

          {/* Bottom right card */}
          <FeatureCard
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>}
            title="True NFT Ownership"
            description="Each ticket is a unique EVM-compatible NFT. Trade on secondary markets, transfer to friends, or collect as digital memorabilia - you own it completely."
            index={2}
          />
        </div>
      </div>
    </section>
  );
};

export default Features;
