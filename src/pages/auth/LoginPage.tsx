import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Container, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message === 'Invalid login credentials' ? 'Email ou senha incorretos' : error.message);
      } else {
        toast.success('Login realizado com sucesso!');
        navigate('/');
      }
    } else {
      if (!nome.trim()) { toast.error('Informe seu nome'); setLoading(false); return; }
      const { error } = await signUp(email, password, nome);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Conta criada! Verifique seu email para confirmar.');
        setMode('login');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center bg-primary">
            <Container className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold">LAPA Locações</h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'login' ? 'Acesse sua conta' : 'Criar nova conta'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-lg border p-6 space-y-4">
          {mode === 'register' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Nome completo</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Senha</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </Button>
        </form>

        <div className="text-center text-sm">
          {mode === 'login' ? (
            <span>Não tem conta? <button onClick={() => setMode('register')} className="text-primary font-medium hover:underline">Criar conta</button></span>
          ) : (
            <span>Já tem conta? <button onClick={() => setMode('login')} className="text-primary font-medium hover:underline">Entrar</button></span>
          )}
        </div>
      </div>
    </div>
  );
}
