
import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface StepCardProps {
  number: string;
  title: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
}

const StepCard = ({ number, title, description, isActive, onClick }: StepCardProps) => {
  return (
    <div 
      className={cn(
        "rounded-xl p-6 cursor-pointer transition-all duration-500 border",
        isActive 
          ? "bg-white shadow-elegant border-pulse-200" 
          : "bg-white/50 hover:bg-white/80 border-transparent"
      )}
      onClick={onClick}
    >
      <div className="flex items-start">
        <div className={cn(
          "flex items-center justify-center rounded-full w-10 h-10 mr-4 flex-shrink-0 transition-colors duration-300",
          isActive ? "bg-pulse-500 text-white" : "bg-gray-100 text-gray-500"
        )}>
          {number}
        </div>
        <div>
          <h3 className={cn(
            "text-lg font-semibold mb-2 transition-colors duration-300",
            isActive ? "text-pulse-600" : "text-gray-800"
          )}>
            {title}
          </h3>
          <p className="text-gray-600 text-sm">{description}</p>
        </div>
      </div>
    </div>
  );
};

const HowItWorks = () => {
  const [activeStep, setActiveStep] = React.useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const stepsData = [
    {
      number: "01",
      title: "Connect Your Wallet",
      description: "Sign in securely with your PushChain wallet or create a new one using email authentication.",
      image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=800&q=80"
    },
    {
      number: "02",
      title: "Browse Events",
      description: "Explore upcoming concerts, sports, conferences, and exclusive events. Filter by category, date, or location.",
      image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=800&q=80"
    },
    {
      number: "03",
      title: "Purchase NFT Tickets",
      description: "Buy tickets using PUSH tokens on PushChain. Each ticket is minted as a unique NFT directly to your wallet.",
      image: "https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&w=800&q=80"
    },
    {
      number: "04",
      title: "Own, Trade, or Attend",
      description: "Your NFT ticket is yours forever. Attend the event, trade it on the marketplace, or keep it as a digital collectible.",
      image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80"
    }
  ];

  useEffect(() => {
    // Auto-cycle through steps
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % stepsData.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [stepsData.length]);
  
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
    
    const elements = document.querySelectorAll(".fade-in-stagger");
    elements.forEach((el, index) => {
      (el as HTMLElement).style.animationDelay = `${0.1 * (index + 1)}s`;
      observer.observe(el);
    });
    
    return () => {
      elements.forEach((el) => {
        observer.unobserve(el);
      });
    };
  }, []);
  
  return (
    <section className="py-20 bg-white relative" id="how-it-works" ref={sectionRef}>
      {/* Background decorative elements */}
      <div className="absolute -top-20 right-0 w-72 h-72 bg-pulse-50 rounded-full opacity-60 blur-3xl -z-10"></div>
      <div className="absolute bottom-0 left-10 w-64 h-64 bg-gray-50 rounded-full opacity-70 blur-3xl -z-10"></div>
      
      <div className="section-container">
        <div className="text-center mb-16 opacity-0 fade-in-stagger">
          <div className="pulse-chip mx-auto mb-4">
            <span>How It Works</span>
          </div>
          <h2 className="section-title mb-4">Get Started in 4 Simple Steps</h2>
          <p className="section-subtitle mx-auto">
            From wallet connection to event attendance, experience seamless blockchain ticketing.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-4 order-2 lg:order-1 opacity-0 fade-in-stagger">
            {stepsData.map((step, index) => (
              <StepCard
                key={step.number}
                number={step.number}
                title={step.title}
                description={step.description}
                isActive={activeStep === index}
                onClick={() => setActiveStep(index)}
              />
            ))}
          </div>
          
          <div className="relative rounded-3xl overflow-hidden h-[400px] shadow-elegant order-1 lg:order-2 opacity-0 fade-in-stagger">
            {stepsData.map((step, index) => (
              <div
                key={index}
                className={cn(
                  "absolute inset-0 transition-opacity duration-1000",
                  activeStep === index ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
              >
                <img
                  src={step.image}
                  alt={step.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-dark-900/70 to-transparent">
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <span className="text-pulse-400 font-medium mb-2 block">{step.number}</span>
                    <h3 className="text-2xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-white/80">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
