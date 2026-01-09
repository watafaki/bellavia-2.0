import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/store';
import { toast } from 'sonner';

interface ProductCardProps {
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

const ProductCard = ({ id, name, price, image_url, ironpay_product_hash, ironpay_offer_hash, sizes = ['M'], colors = [''], description }: ProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const addItem = useCart((state) => state.addItem);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id,
      name,
      price,
      image_url,
      ironpay_product_hash,
      ironpay_offer_hash,
      size: sizes[0] || 'M',
      color: colors[0] || '',
    });
    toast.success('Adicionado ao carrinho!');
  };

  return (
    <Link to={`/produto/${id}`}>
      <div
        className="group cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Product Image */}
        <div className="bg-secondary aspect-[3/4] relative overflow-hidden mb-5">
          <img
            src={image_url}
            alt={name}
            className={`h-full w-full object-cover transition-transform duration-700 ease-out ${
              isHovered ? 'scale-110' : 'scale-100'
            }`}
          />
          
          {/* Quick Add Button */}
          <button
            onClick={handleQuickAdd}
            className={`absolute bottom-5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-6 py-3 flex items-center gap-2 text-xs font-display font-bold uppercase tracking-wider transition-all duration-300 ${
              isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            Adicionar ao carrinho
          </button>
        </div>

        {/* Product Info */}
        <div className="text-center">
          <h3 className="font-display text-sm font-bold uppercase tracking-tight text-foreground group-hover:text-primary transition-colors">
            {name}
          </h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">
              {description}
            </p>
          )}
          <p className="font-display font-bold text-base mt-2 text-foreground">
            R$ {price.toFixed(2).replace('.', ',')}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
