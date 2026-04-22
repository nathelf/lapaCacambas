import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  message: string;
  description?: string;
  searchTerm?: string;
  hasFilters?: boolean;
  onClearFilters?: () => void;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  message,
  description,
  searchTerm,
  hasFilters,
  onClearFilters,
  action,
}: EmptyStateProps) {
  const showClear = (searchTerm || hasFilters) && onClearFilters;

  return (
    <div className="text-center py-12 text-muted-foreground">
      {icon && <div className="flex justify-center mb-3 opacity-30">{icon}</div>}

      <p className="text-sm font-medium text-foreground/70">
        {searchTerm
          ? `Nenhum resultado para "${searchTerm}"`
          : message}
      </p>

      {description && !searchTerm && (
        <p className="text-xs mt-1">{description}</p>
      )}

      <div className="flex justify-center gap-2 mt-4">
        {showClear && (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            <X className="w-3.5 h-3.5 mr-1" /> Limpar filtros
          </Button>
        )}
        {!showClear && action}
      </div>
    </div>
  );
}
