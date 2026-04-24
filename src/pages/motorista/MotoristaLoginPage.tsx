import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Loader2, Truck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

/**
 * Login dedicado ao app motorista (mesma sessão Supabase do escritório).
 * Aceita e-mail no campo principal; CPF como login exigiria endpoint de resolução.
 */
export default function MotoristaLoginPage() {
  const navigate = useNavigate();
  const { user, signIn, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate('/motorista', { replace: true });
  }, [loading, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    if (error) {
      toast.error(
        error.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos'
          : error.message,
      );
    } else {
      navigate('/motorista', { replace: true });
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-10 max-w-md mx-auto w-full">
        <div className="flex items-center gap-3 mb-10">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <Truck className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400/90 font-semibold">SensoriAI</p>
            <h1 className="text-xl font-bold">App Motorista</h1>
            <p className="text-xs text-slate-500 mt-0.5">Lapa Caçambas · campo</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="m-email" className="text-slate-300">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                id="m-email"
                type="email"
                autoComplete="username"
                placeholder="seu@email.com"
                className="pl-10 min-h-[48px] bg-slate-900 border-slate-700 text-white placeholder:text-slate-600"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <p className="text-[11px] text-slate-500">Use o mesmo e-mail do seu cadastro no sistema.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-pass" className="text-slate-300">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                id="m-pass"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="pl-10 min-h-[48px] bg-slate-900 border-slate-700 text-white placeholder:text-slate-600"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[48px] text-base font-semibold bg-emerald-600 hover:bg-emerald-500 rounded-xl"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar'}
          </Button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-8">
          Acesso administrativo?{' '}
          <Link to="/login" className="text-emerald-400 hover:underline">Entrar no escritório</Link>
        </p>
      </div>

      <footer className="px-6 py-6 border-t border-slate-800/80 text-center">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Logística e reciclagem com precisão de elite.
        </p>
        <p className="text-[10px] text-slate-600 mt-1">SensoriAI</p>
      </footer>
    </div>
  );
}
