import { Bell, PanelLeftClose } from 'lucide-react';

export function AppHeader() {
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
        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
          AL
        </div>
      </div>
    </header>
  );
}
