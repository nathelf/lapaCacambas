import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <AppHeader />
      <main
        className="pt-[var(--header-height)] min-h-screen"
        style={{ marginLeft: 'var(--sidebar-width)' }}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
