import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Menu, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useCart } from '@/lib/store';
import logoImage from '@/assets/logo-bellavia.png';

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const itemCount = useCart((state) => state.getItemCount());

  const navLinks = [
    { href: '/', label: 'Início' },
    { href: '/produtos', label: 'Loja' },
    { href: '/provador', label: 'Provador IA' },
  ];

  return (
    <header className="fixed top-9 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border shadow-[0_18px_40px_-26px_rgba(0,0,0,0.55)]">
      <div className="container flex h-20 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <img src={logoImage} alt="BELLAVIA" className="h-10 w-auto" />
          <span className="font-display text-xl font-bold tracking-tight text-foreground">
            BELLAVIA
          </span>
        </Link>

        {/* Desktop Navigation - Centered */}
        <nav className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors relative after:absolute after:left-0 after:-bottom-1 after:h-px after:w-0 after:bg-foreground/60 after:transition-all after:duration-300 hover:after:w-full"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Icons */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="hidden md:flex hover:bg-accent hover:text-accent-foreground">
            <User className="h-5 w-5" />
          </Button>
          
          <Link to="/carrinho" className="relative">
            <Button variant="ghost" size="icon" className="hover:bg-accent hover:text-accent-foreground">
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center bg-primary text-primary-foreground text-xs font-bold rounded-full">
                  {itemCount}
                </span>
              )}
            </Button>
          </Link>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="hover:bg-accent">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-[400px] p-0 bg-background">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-6 border-b border-border">
                  <div className="flex items-center gap-3">
                    <img src={logoImage} alt="BELLAVIA" className="h-8 w-auto" />
                    <span className="font-display text-lg font-bold">BELLAVIA</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <nav className="flex flex-col p-8 gap-8">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => setIsOpen(false)}
                      className="text-2xl font-display font-bold tracking-tight text-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
