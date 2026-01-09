import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import Marquee from '@/components/Marquee';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import heroBanner from '@/assets/hero-bellavia.jpg';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category: string;
  ironpay_product_hash?: string | null;
  ironpay_offer_hash?: string | null;
  sizes: string[];
  colors: string[];
  description?: string;
}

const defaultProducts: Product[] = [
  { id: '1', name: 'Calça Essential Black', price: 189.90, image_url: heroBanner, category: 'outros', sizes: ['P', 'M', 'G', 'GG'], colors: ['Preto'], description: 'Caimento premium / Versátil' },
  { id: '2', name: 'Calça Urban Grey', price: 199.90, image_url: heroBanner, category: 'outros', sizes: ['P', 'M', 'G', 'GG'], colors: ['Cinza'], description: 'Conforto / Estilo urbano' },
  { id: '3', name: 'Calça Cargo Tactical', price: 219.90, image_url: heroBanner, category: 'outros', sizes: ['P', 'M', 'G', 'GG'], colors: ['Preto', 'Grafite'], description: 'Bolsos utilitários / Resistência' },
  { id: '4', name: 'Calça Tailored Premium', price: 239.90, image_url: heroBanner, category: 'outros', sizes: ['P', 'M', 'G', 'GG'], colors: ['Bege'], description: 'Corte alinhado / Presença' },
];

const Products = () => {
  const [products, setProducts] = useState<Product[]>(defaultProducts);
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    const fetchProducts = async () => {
      const query = supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .eq('category', 'outros');

      const { data } = await query;

      if (data && data.length > 0) {
        setProducts(data.map(p => ({
          ...p,
          image_url: p.image_url || heroBanner,
          sizes: p.sizes || ['P', 'M', 'G', 'GG'],
          colors: p.colors || [],
        })));
      } else {
        setProducts(defaultProducts);
      }
    };

    fetchProducts();
  }, []);

  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Marquee />
      <Header />
      
      <main className="flex-1 pt-32">
        {/* Hero */}
        <section className="py-16 bg-accent/30">
          <div className="container text-center">
            <h1 className="font-display text-5xl md:text-6xl font-bold uppercase tracking-tight text-foreground">
              Calças
            </h1>
            <p className="text-muted-foreground mt-4 text-sm">
              Escolha sua próxima calça.
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="py-6 border-b border-border">
          <div className="container flex flex-col sm:flex-row gap-4 justify-end items-start sm:items-center">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] border-border bg-background">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nome</SelectItem>
                <SelectItem value="price-asc">Preço: menor para maior</SelectItem>
                <SelectItem value="price-desc">Preço: maior para menor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* Products Grid */}
        <section className="py-16">
          <div className="container">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
              {sortedProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <ProductCard 
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
                </div>
              ))}
            </div>

            {sortedProducts.length === 0 && (
              <div className="text-center py-16">
                <p className="text-muted-foreground">Nenhuma calça encontrada.</p>
              </div>
            )}
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Products;
