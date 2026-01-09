import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Minus, Plus, Sparkles } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Marquee from '@/components/Marquee';
import { useCart } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import heroBanner from '@/assets/hero-bellavia.jpg';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  ironpay_product_hash?: string | null;
  ironpay_offer_hash?: string | null;
  sizes: string[];
  colors: string[];
}

const defaultProducts: Record<string, Product> = {
  '1': { id: '1', name: 'Calça Essential Black', description: 'Caimento premium. O básico elevado para o dia a dia.', price: 189.90, image_url: heroBanner, sizes: ['P', 'M', 'G', 'GG'], colors: ['Preto'] },
  '2': { id: '2', name: 'Calça Urban Grey', description: 'Conforto com estética urbana. Versátil e pronta pra rotina.', price: 199.90, image_url: heroBanner, sizes: ['P', 'M', 'G', 'GG'], colors: ['Cinza'] },
  '3': { id: '3', name: 'Calça Cargo Tactical', description: 'Utilitária e resistente. Bolsos e estrutura pra presença.', price: 219.90, image_url: heroBanner, sizes: ['P', 'M', 'G', 'GG'], colors: ['Preto', 'Grafite'] },
  '4': { id: '4', name: 'Calça Tailored Premium', description: 'Corte alinhado com acabamento premium. Presença imediata.', price: 239.90, image_url: heroBanner, sizes: ['P', 'M', 'G', 'GG'], colors: ['Bege'] },
};

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const addItem = useCart((state) => state.addItem);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;

      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (data) {
        setProduct({
          ...data,
          image_url: data.image_url || heroBanner,
          sizes: data.sizes || ['P', 'M', 'G', 'GG'],
          colors: data.colors || [],
          description: data.description || '',
        });
      } else if (defaultProducts[id]) {
        setProduct(defaultProducts[id]);
      }
    };

    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (product) {
      if (product.sizes.length > 0 && !selectedSize) {
        setSelectedSize(product.sizes[0]);
      }
      if (product.colors.length > 0 && !selectedColor) {
        setSelectedColor(product.colors[0]);
      }
    }
  }, [product, selectedSize, selectedColor]);

  const handleAddToCart = () => {
    if (!product) return;
    
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        ironpay_product_hash: product.ironpay_product_hash ?? null,
        ironpay_offer_hash: product.ironpay_offer_hash ?? null,
        size: selectedSize,
        color: selectedColor,
      });
    }
    toast.success(`${quantity}x ${product.name} adicionado ao carrinho!`);
  };

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Marquee />
        <Header />
        <main className="flex-1 flex items-center justify-center pt-32">
          <p className="text-muted-foreground">Produto não encontrado.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Marquee />
      <Header />
      
      <main className="flex-1 pt-32">
        <div className="container py-12">
          {/* Breadcrumb */}
          <Link 
            to="/produtos" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-10"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para a loja
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Image */}
            <div className="bg-secondary aspect-[3/4] overflow-hidden">
              <img
                src={product.image_url}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            </div>

            {/* Details */}
            <div className="space-y-8">
              <div>
                <h1 className="font-display text-4xl md:text-5xl font-bold uppercase tracking-tight text-foreground">
                  {product.name}
                </h1>
                <p className="font-display text-3xl font-bold mt-4 text-primary">
                  R$ {product.price.toFixed(2).replace('.', ',')}
                </p>
              </div>

              <p className="text-muted-foreground leading-relaxed text-base">
                {product.description}
              </p>

              {/* Size Selection */}
              {product.sizes.length > 0 && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-foreground mb-4 block">
                    Tamanho
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-8 py-4 text-sm font-bold uppercase tracking-wide border-2 transition-all ${
                          selectedSize === size
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-transparent text-foreground border-border hover:border-primary'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Color Selection */}
              {product.colors.length > 0 && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-foreground mb-4 block">
                    Cor
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {product.colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`px-8 py-4 text-sm font-bold uppercase tracking-wide border-2 transition-all ${
                          selectedColor === color
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-transparent text-foreground border-border hover:border-primary'
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-foreground mb-4 block">
                  Quantidade
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-14 h-14 flex items-center justify-center border-2 border-border hover:border-primary transition-colors"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <span className="text-xl font-bold w-10 text-center font-display">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-14 h-14 flex items-center justify-center border-2 border-border hover:border-primary transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 flex items-center justify-center gap-3 bg-primary text-primary-foreground px-10 py-5 font-display font-bold uppercase tracking-widest text-sm transition-all hover:bg-primary/90"
                >
                  <ShoppingBag className="h-5 w-5" />
                  Adicionar ao carrinho
                </button>
                <Link to="/provador" className="flex-1">
                  <button className="w-full flex items-center justify-center gap-3 border-2 border-foreground text-foreground px-10 py-5 font-display font-bold uppercase tracking-widest text-sm transition-all hover:bg-foreground hover:text-background">
                    <Sparkles className="h-5 w-5" />
                    Provador IA
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ProductDetail;
