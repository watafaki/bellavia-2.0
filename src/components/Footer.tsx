import { Link } from 'react-router-dom';
import { Instagram, Video } from 'lucide-react';
import logoImage from '@/assets/logo-bellavia.png';

const Footer = () => {
  return (
    <footer className="bg-foreground text-background mt-20">
      <div className="container py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center bg-background/95 rounded-md p-2">
                <img src={logoImage} alt="BELLAVIA" className="h-10 w-auto" />
              </span>
              <span className="font-display text-2xl font-bold tracking-tight">BELLAVIA</span>
            </div>
            <p className="text-background/60 text-sm leading-relaxed max-w-xs">
              Imperatriz, Maranhão, Brasil.
              <br />
              Calças premium para o seu estilo.
            </p>
          </div>

          {/* Support */}
          <div className="space-y-6">
            <h4 className="font-display text-sm font-bold uppercase tracking-widest">Suporte</h4>
            <ul className="space-y-4">
              <li>
                <Link to="#" className="text-sm text-background/60 hover:text-background transition-colors">
                  Acompanhar pedido
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-background/60 hover:text-background transition-colors">
                  Trocas e devoluções
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-background/60 hover:text-background transition-colors">
                  Guia de medidas
                </Link>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div className="space-y-6">
            <h4 className="font-display text-sm font-bold uppercase tracking-widest">Redes</h4>
            <ul className="space-y-4">
              <li>
                <a 
                  href="https://www.instagram.com/bellavia.ofc/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-background/60 hover:text-background transition-colors"
                >
                  <Instagram className="h-4 w-4" />
                  Instagram
                </a>
              </li>
              <li>
                <a 
                  href="https://tiktok.com/@bellaviaofc" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-background/60 hover:text-background transition-colors"
                >
                  <Video className="h-4 w-4" />
                  TikTok
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-background/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-background/40">
            2026 Bellavia. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-8 text-xs text-background/40">
            <Link to="#" className="hover:text-background transition-colors">
              Termos
            </Link>
            <Link to="#" className="hover:text-background transition-colors">
              Privacidade
            </Link>
            <Link to="/admin" className="hover:text-background transition-colors">
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
