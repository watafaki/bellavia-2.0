import { Link } from 'react-router-dom';
import heroBanner from '@/assets/hero-bellavia.jpg';

const BannerSplit = () => {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">
      {/* Image Side */}
      <div 
        className="bg-secondary bg-cover bg-center min-h-[400px] lg:min-h-full"
        style={{
          backgroundImage: `url('${heroBanner}')`,
        }}
      />

      {/* Text Side */}
      <div className="bg-primary text-primary-foreground flex flex-col justify-center p-12 lg:p-20">
        <div className="max-w-md">
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tight mb-8 leading-[0.9]">
            Vista sua
            <br />
            melhor versão.
          </h2>
          <p className="text-primary-foreground/80 text-base leading-relaxed mb-10">
            A BELLAVIA não é só roupa. É presença no dia a dia.
            Peças selecionadas para quem sabe onde quer chegar.
          </p>
          <Link
            to="/produtos"
            className="inline-block bg-primary-foreground text-primary px-12 py-5 font-display font-bold uppercase tracking-[0.15em] text-sm transition-all duration-300 hover:bg-transparent hover:text-primary-foreground border-2 border-primary-foreground"
          >
            Ver coleção
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BannerSplit;
