import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { toast } from 'sonner';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

const AdminLogin = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading, signIn, signUp } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user && isAdmin) {
      navigate('/admin/dashboard');
    }
  }, [user, isAdmin, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setSubmitting(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('Este e-mail já está cadastrado');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Conta criada! Faça login para continuar.');
          toast.info('Nota: Você precisará de permissão de admin para acessar o painel.');
          setIsSignUp(false);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error('Credenciais inválidas');
        } else {
          toast.success('Login realizado com sucesso!');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (user && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/30 p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl p-8 bellavia-card text-center">
            <div className="h-16 w-16 rounded-full bg-amber-500 flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">
              Acesso Restrito
            </h1>
            <p className="text-muted-foreground mb-6">
              Sua conta não possui permissões de administrador.
            </p>
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="w-full"
            >
              Voltar para a Loja
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/30 p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl p-8 bellavia-card">
          <div className="text-center mb-8">
            <div className="h-16 w-16 rounded-full bellavia-gradient flex items-center justify-center mx-auto mb-4">
              {isSignUp ? (
                <UserPlus className="h-8 w-8 text-primary-foreground" />
              ) : (
                <Lock className="h-8 w-8 text-primary-foreground" />
              )}
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Admin <span className="bellavia-text-gradient">Bellavia</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {isSignUp ? 'Criar nova conta' : 'Acesso restrito à administração'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@bellavia.com"
                required
                disabled={submitting}
              />
            </div>

            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                disabled={submitting}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bellavia-gradient" 
              size="lg"
              disabled={submitting}
            >
              {submitting ? 'Carregando...' : (isSignUp ? 'Criar Conta' : 'Entrar')}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? 'Já tem conta? Fazer login' : 'Não tem conta? Criar uma'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
