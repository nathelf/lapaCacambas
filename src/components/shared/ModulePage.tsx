import { PageHeader } from './PageHeader';
import { Button } from '@/components/ui/button';
import { Plus, Search, Filter } from 'lucide-react';

interface ModulePageProps {
  title: string;
  subtitle?: string;
  showCreate?: boolean;
  createLabel?: string;
  children?: React.ReactNode;
}

export function ModulePage({ title, subtitle, showCreate = true, createLabel = 'Novo', children }: ModulePageProps) {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          showCreate ? (
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              {createLabel}
            </Button>
          ) : undefined
        }
      />

      {/* Filters bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full h-9 pl-9 pr-3 rounded-md border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4 mr-1" />
          Filtros
        </Button>
      </div>

      {children || (
        <div className="bg-card rounded-lg border p-12 text-center">
          <p className="text-muted-foreground text-sm">Módulo em desenvolvimento. Os dados serão carregados da API.</p>
        </div>
      )}
    </div>
  );
}
