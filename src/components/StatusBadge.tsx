import { cn } from '@/lib/utils';
import { STATUS_META, statusEfetivo, type CacambaStatus } from '@/lib/status';

interface StatusBadgeProps {
  status: CacambaStatus | string;
  ultimaAtualizacao?: string | null;
  className?: string;
}

export function StatusBadge({ status, ultimaAtualizacao, className }: StatusBadgeProps) {
  const eff = statusEfetivo(status, ultimaAtualizacao);
  const meta = STATUS_META[eff] ?? STATUS_META.disponivel;

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
      meta.bgClass, meta.textClass, className,
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dotClass)} />
      {meta.label}
    </span>
  );
}
