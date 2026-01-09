import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ProductCard from './ProductCard';
import { supabase } from '@/integrations/supabase/client';
import heroBanner from '@/assets/hero-bellavia.jpg';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  ironpay_product_hash?: string | null;
  ironpay_offer_hash?: string | null;
  sizes?: string[];
  colors?: string[];
  description?: string;
}

const defaultProducts: Product[] = [
  {
    id: '1',
    name: 'Calça Essential Black',
    price: 189.90,
    image_url: heroBanner,
    sizes: ['P', 'M', 'G', 'GG'],
    description: 'Caimento premium / Versátil',
  },
  {
    id: '2',
    name: 'Calça Urban Grey',
    price: 199.90,
    image_url: heroBanner,
    sizes: ['P', 'M', 'G', 'GG'],
    description: 'Conforto / Estilo urbano',
  },
  {
    id: '3',
    name: 'Calça Cargo Tactical',
    price: 219.90,
    image_url: heroBanner,
    sizes: ['P', 'M', 'G', 'GG'],
    description: 'Bolsos utilitários / Resistência',
  },
  {
    id: '4',
    name: 'Calça Tailored Premium',
    price: 239.90,
    image_url: heroBanner,
    sizes: ['P', 'M', 'G', 'GG'],
    description: 'Corte alinhado / Presença',
  },
];

const FeaturedProducts = () => {
  const [products, setProducts] = useState<Product[]>(defaultProducts);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .eq('category', 'outros')
        .limit(4);

      if (data && data.length > 0) {
        setProducts(data.map(p => ({
          ...p,
          image_url: p.image_url || heroBanner,
        })));
      }
    };

    fetchProducts();
  }, []);

  return (
    <section className="py-24">
      <div className="container">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-5xl font-bold uppercase tracking-tight text-foreground">
            Novidades
          </h2>
          <p className="text-muted-foreground mt-4 text-sm">
            A nova coleção. Quantidades limitadas.
          </p>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price}
              image_url={product.image_url}
              ironpay_product_hash={product.ironpay_product_hash}
              ironpay_offer_hash={product.ironpay_offer_hash}
              sizes={product.sizes}
              colors={product.colors}
              description={product.description}
            />
          ))}
        </div>

        {/* View All Link */}
        <div className="text-center mt-16">
          <Link 
            to="/produtos" 
            className="inline-flex items-center gap-3 text-sm font-display font-bold uppercase tracking-widest text-foreground hover:text-primary transition-colors group"
          >
            Ver coleção completa
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
