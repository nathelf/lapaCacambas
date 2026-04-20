import { Bell, PanelLeftClose, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function AppHeader() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  // Pega as iniciais do nome para exibir na bolinha
  const initials = profile?.nome
    ? profile.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : '?';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header
      className="fixed top-0 right-0 z-30 flex items-center justify-between px-6 border-b bg-card"
      style={{
        left: 'var(--sidebar-width)',
        height: 'var(--header-height)',
      }}
    >
      <div className="flex items-center gap-3">
        <button className="p-1.5 rounded-md hover:bg-muted transition-colors">
          <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-1.5 rounded-md hover:bg-muted transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">3</span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center hover:opacity-90 transition-opacity">
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <p className="font-medium text-sm">{profile?.nome ?? 'Usuário'}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
