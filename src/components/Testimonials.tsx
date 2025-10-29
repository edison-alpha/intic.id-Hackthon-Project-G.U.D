
import React, { useRef } from "react";

interface TestimonialProps {
  content: string;
  author: string;
  role: string;
  gradient: string;
  backgroundImage?: string;
}

const testimonials: TestimonialProps[] = [{
  content: "Push Chain's universal blockchain infrastructure eliminated all our ticketing fraud issues. Cross-chain verification is instant and our attendees can use any wallet they prefer.",
  author: "Sarah Chen",
  role: "Event Director, Global Music Festivals",
  gradient: "from-blue-700 via-indigo-800 to-purple-900",
  backgroundImage: "/background-section1.png"
}, {
  content: "The ability to let users from any blockchain participate seamlessly is game-changing. No more bridging, no friction - just instant NFT ticket purchases with any token.",
  author: "Michael Torres",
  role: "CEO, Sports & Entertainment Venues",
  gradient: "from-indigo-900 via-purple-800 to-[#e7a4fd]",
  backgroundImage: "/background-section2.png"
}, {
  content: "Push Chain's sub-second finality means instant ticket transfers. Our secondary marketplace runs smoothly with ultra-low gas fees, making trading accessible to everyone.",
  author: "Alex Rodriguez",
  role: "Head of Operations, Concert Promotions Ltd",
  gradient: "from-purple-800 via-pink-700 to-red-500",
  backgroundImage: "/background-section3.png"
}, {
  content: "Deploying on Push Chain reduced our costs by 70% while enabling cross-chain compatibility. Users love the wallet abstraction - they can even use social logins now.",
  author: "Jennifer Wang",
  role: "CTO, Live Events Technology Group",
  gradient: "from-[#e7a4fd] via-red-500 to-purple-600",
  backgroundImage: "/background-section1.png"
}];

const TestimonialCard = ({
  content,
  author,
  role,
  backgroundImage = "/background-section1.png"
}: TestimonialProps) => {
  return <div className="bg-cover bg-center rounded-lg p-8 h-full flex flex-col justify-between text-white transform transition-transform duration-300 hover:-translate-y-2 relative overflow-hidden" style={{
    backgroundImage: `url('${backgroundImage}')`
  }}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-white z-10"></div>
      
      <div className="relative z-0">
        <p className="text-xl mb-8 font-medium leading-relaxed pr-20">{`"${content}"`}</p>
        <div>
          <h4 className="font-semibold text-xl">{author}</h4>
          <p className="text-white/80">{role}</p>
        </div>
      </div>
    </div>;
};

const Testimonials = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  return <section className="py-12 bg-white relative" id="testimonials" ref={sectionRef}> {/* Reduced from py-20 */}
      <div className="section-container opacity-0 animate-on-scroll">
        <div className="flex items-center gap-4 mb-6">
          <div className="pulse-chip">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-pulse-500 text-white mr-2">04</span>
            <span>Success Stories</span>
          </div>
        </div>
        
        <h2 className="text-5xl font-display font-bold mb-12 text-left">Trusted by Event Organizers</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => <TestimonialCard key={index} content={testimonial.content} author={testimonial.author} role={testimonial.role} gradient={testimonial.gradient} backgroundImage={testimonial.backgroundImage} />)}
        </div>
      </div>
    </section>;
};

export default Testimonials;
