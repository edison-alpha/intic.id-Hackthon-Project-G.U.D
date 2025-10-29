import React from "react";
import { cn } from "@/lib/utils";
import stacksImg from '../assets/stacks.png';
import inticImg from '../assets/logointic.png';
import ippImg from '../assets/ipp.png';

const LogoSlider = () => {
  // Array of logos - duplicate for seamless infinite scroll
  const logos = [
    { src: stacksImg, name: "Stacks" },
    { src: inticImg, name: "Intic" },
    { src: ippImg, name: "IPP" },
    { src: stacksImg, name: "Stacks" },
    { src: inticImg, name: "Intic" },
    { src: ippImg, name: "IPP" },
  ];

  return (
    <section className="py-16 sm:py-20 overflow-hidden bg-gradient-to-b from-[#1A1A1A] via-[#2A1810] to-[#1A1A1A]">
      <div className="container mx-auto px-4 mb-8">
        <h3 className="text-center text-xl sm:text-2xl font-semibold text-white/70">
          Built With
        </h3>
      </div>
      
      <div className="relative">
        {/* Gradient overlays for smooth fade effect */}
        <div className="absolute left-0 top-0 bottom-0 w-24 sm:w-32 bg-gradient-to-r from-[#1A1A1A] via-[#2A1810]/80 to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-24 sm:w-32 bg-gradient-to-l from-[#1A1A1A] via-[#2A1810]/80 to-transparent z-10 pointer-events-none"></div>

        <div className="flex items-center animate-infinite-scroll hover:pause-animation">
          {/* First set of logos */}
          {logos.map((logo, index) => (
            <div
              key={`logo-1-${index}`}
              className="inline-flex items-center justify-center flex-shrink-0 transition-all duration-300 opacity-70 hover:opacity-100 mx-8 sm:mx-12 md:mx-16 lg:mx-20"
            >
              <img
                src={logo.src}
                alt={logo.name}
                className={cn(
                  "w-auto object-contain brightness-0 invert filter drop-shadow-lg",
                  logo.name === "Intic" ? "h-12 sm:h-16 md:h-20" : "h-10 sm:h-12 md:h-16"
                )}
              />
            </div>
          ))}

          {/* Duplicate set for seamless loop */}
          {logos.map((logo, index) => (
            <div
              key={`logo-2-${index}`}
              className="inline-flex items-center justify-center flex-shrink-0 transition-all duration-300 opacity-70 hover:opacity-100 mx-8 sm:mx-12 md:mx-16 lg:mx-20"
            >
              <img
                src={logo.src}
                alt={logo.name}
                className={cn(
                  "w-auto object-contain brightness-0 invert filter drop-shadow-lg",
                  logo.name === "Intic" ? "h-12 sm:h-16 md:h-20" : "h-10 sm:h-12 md:h-16"
                )}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LogoSlider;
