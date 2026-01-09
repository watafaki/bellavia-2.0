import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroSection from '@/components/HeroSection';
import Features from '@/components/Features';
import FeaturedProducts from '@/components/FeaturedProducts';
import Marquee from '@/components/Marquee';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Marquee at very top */}
      <Marquee />
      
      <Header />
      
      <main className="flex-1">
        <HeroSection />
        <Features />
        <FeaturedProducts />
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
