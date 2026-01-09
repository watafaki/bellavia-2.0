import { Link } from 'react-router-dom';
import heroBanner from '@/assets/hero-bellavia.jpg';

const HeroSection = () => {
  return (
    <section className="relative min-h-[72vh] sm:min-h-[82vh] md:min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img
          src={heroBanner}
          alt="BELLAVIA"
          className="h-full w-full object-cover object-[50%_18%]"
        />
      </div>
      
      {/* Overlay */}
      <div className="absolute inset-0 z-[1]">
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),transparent_55%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* Logo/Brand Watermark */}
        <div className="mb-8 opacity-90">
          <span className="font-display text-white/40 text-6xl md:text-8xl italic tracking-tighter">
            Bellavia
          </span>
        </div>

        <Link
          to="/produtos"
          className="inline-flex items-center justify-center bg-background text-foreground px-10 py-3.5 font-medium tracking-[0.08em] text-xs transition-colors duration-300 hover:bg-foreground hover:text-background border border-background/80"
        >
          Ver coleção
        </Link>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-[2]" />
    </section>
  );
};

export default HeroSection;
