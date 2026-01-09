import { Link } from 'react-router-dom';
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Marquee from '@/components/Marquee';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/store';

const Cart = () => {
  const { items, removeItem, updateQuantity, getTotal, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Marquee />
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center pt-32 pb-20">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            Seu carrinho está vazio
          </h1>
          <p className="text-muted-foreground mb-6">
            Adicione produtos incríveis ao seu carrinho!
          </p>
          <Link to="/produtos">
            <Button className="bellavia-gradient gap-2">
              Explorar calças
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
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
        <div className="container py-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-8">
            Seu <span className="bellavia-text-gradient">Carrinho</span>
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div
                  key={`${item.id}-${item.size}-${item.color}`}
                  className="flex gap-4 p-4 bg-card rounded-xl bellavia-card"
                >
                  <div className="h-24 w-24 rounded-lg overflow-hidden bg-secondary/30 flex-shrink-0">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.size && `Tamanho: ${item.size}`}
                      {item.color && ` • Cor: ${item.color}`}
                    </p>
                    <p className="text-lg font-semibold text-primary mt-1">
                      R$ {item.price.toFixed(2).replace('.', ',')}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeItem(item.id, item.size, item.color)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateQuantity(
                            item.id,
                            item.size,
                            item.color,
                            Math.max(1, item.quantity - 1)
                          )
                        }
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateQuantity(item.id, item.size, item.color, item.quantity + 1)
                        }
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              <Button variant="outline" className="text-destructive" onClick={clearCart}>
                Limpar Carrinho
              </Button>
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-xl p-6 bellavia-card sticky top-24">
                <h2 className="font-display text-xl font-bold text-foreground mb-4">
                  Resumo do Pedido
                </h2>

                <div className="space-y-3 border-b border-border pb-4 mb-4">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>R$ {getTotal().toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Frete</span>
                    <span className="text-primary">Grátis</span>
                  </div>
                </div>

                <div className="flex justify-between text-lg font-bold text-foreground mb-6">
                  <span>Total</span>
                  <span className="text-primary">
                    R$ {getTotal().toFixed(2).replace('.', ',')}
                  </span>
                </div>

                <Link to="/checkout">
                  <Button className="w-full gap-2 bellavia-gradient" size="lg">
                    Finalizar Compra
                    <ArrowRight className="h-4 w-4" />
                  </Button>
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

export default Cart;
