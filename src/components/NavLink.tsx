import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface NavLinkProps {
  href: string;
  label: string;
  icon?: LucideIcon;
  external?: boolean;
  onClick?: () => void;
  className?: string;
}

const NavLink = ({ 
  href, 
  label, 
  icon: Icon, 
  external, 
  onClick, 
  className = "text-sm font-medium text-muted-foreground transition-colors hover:text-primary flex items-center gap-1.5" 
}: NavLinkProps) => {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className={className}
      >
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </a>
    );
  }

  return (
    <Link
      to={href}
      onClick={onClick}
      className={className}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {label}
    </Link>
  );
};

export default NavLink;
