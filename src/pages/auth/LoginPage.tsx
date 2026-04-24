import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { tenant } = useTenant();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const theme = tenant?.theme_config ?? {};
  const heroUrl = theme.hero_url;
  const headline = theme.headline ?? 'Gestão Inteligente de Resíduos';
  const subtitle = theme.subtitle ?? 'Acompanhe suas caçambas e coletas sem burocracia.';
  const loginTag = theme.login_tag ?? (tenant ? `${tenant.name} · Acesso` : 'Acesso');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast.error(
        error.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos'
          : error.message,
      );
    } else {
      navigate('/');
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error('Informe seu e-mail antes de recuperar a senha.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
    }
  };

  return (
    <main className="min-h-screen w-full grid lg:grid-cols-2 bg-background">

      {/* LEFT — Hero */}
      <aside className="relative hidden lg:flex items-center justify-center overflow-hidden">
        {heroUrl ? (
          <img
            src={heroUrl}
            alt={tenant?.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(215_60%_15%)] to-[hsl(210_80%_25%)]" />
        )}

        {/* escurecimento sobre a imagem */}
        <div className="absolute inset-0 bg-gradient-overlay" />

        {/* grade decorativa */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center px-12 animate-fade-in-up">
          {tenant?.logo_url && (
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary-glow/40 blur-3xl rounded-full animate-pulse-glow" />
              <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-glow">
                <img
                  src={tenant.logo_url}
                  alt={tenant.name}
                  className="w-44 h-44 object-contain"
                />
              </div>
            </div>
          )}

          <h2 className="text-4xl font-bold text-white tracking-tight max-w-md leading-tight">
            {headline}
          </h2>
          <p className="mt-4 text-white/75 max-w-md text-lg">{subtitle}</p>

          <div className="mt-10 flex items-center gap-2 text-white/60 text-sm uppercase tracking-[0.2em]">
            <ShieldCheck className="w-4 h-4" />
            <span>Plataforma certificada</span>
          </div>
        </div>
      </aside>

      {/* RIGHT — Form */}
      <section className="flex items-center justify-center px-6 py-12 sm:px-10 bg-gradient-to-br from-background to-muted/40">
        <div className="w-full max-w-md animate-fade-in-up">

          {/* Logo mobile */}
          {tenant?.logo_url && (
            <div className="lg:hidden flex justify-center mb-8">
              <img src={tenant.logo_url} alt={tenant.name} className="w-20 h-20 object-contain" />
            </div>
          )}

          <div className="mb-8">
            <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-primary mb-3">
              {loginTag}
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight">
              {theme.welcome_msg ?? 'Bem-vindo de volta'}
            </h1>
            <p className="mt-3 text-muted-foreground">
              Acesse sua plataforma de gestão operacional.
            </p>
          </div>

          <div className="bg-card/80 backdrop-blur-xl border border-border/60 rounded-2xl p-8 shadow-card">
            <form onSubmit={handleSubmit} className="space-y-5">

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  E-mail corporativo
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="E-mail corporativo cadastrado"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-muted/40 border-border focus-visible:ring-primary"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Senha
                  </Label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs font-medium text-primary hover:text-primary-deep transition-colors"
                  >
                    Recuperar Senha
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 bg-muted/40 border-border focus-visible:ring-primary"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                style={{ backgroundImage: 'var(--gradient-primary)' }}
                className="w-full h-12 text-base font-semibold hover:brightness-110 hover:shadow-glow transition-all duration-300 group"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Entrando...
                  </span>
                ) : (
                  <>
                    Acessar Painel de Controle
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border/60 text-center">
              <p className="text-sm text-muted-foreground">
                Ainda não tem uma conta? Fale com o suporte!{' '}
                <a
                  href="https://www.sensoriai.com.br"
                  className="font-semibold text-primary hover:text-primary-deep transition-colors"
                >
                  Solicitar acesso
                </a>
              </p>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} {tenant?.name ?? 'SensoriAI'} · Não entregamos apenas tecnologia.
            Entregamos Inteligência Operacional Estratégica.
          </p>
        </div>
      </section>
    </main>
  );
}
