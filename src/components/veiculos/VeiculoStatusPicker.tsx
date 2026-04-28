import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Settings2 } from 'lucide-react';
import { StatusVeiculo, STATUS_VEICULO_LABELS } from '@/types/enums';
import { cn } from '@/lib/utils';

const ORDEM_STATUS: StatusVeiculo[] = [
  StatusVeiculo.DISPONIVEL,
  StatusVeiculo.EM_OPERACAO,
  StatusVeiculo.MANUTENCAO,
  StatusVeiculo.INDISPONIVEL,
];

const TRIGGER_BADGE: Record<string, string> = {
  disponivel:
    'border-green-400/70 bg-green-50 text-green-900 shadow-sm hover:bg-green-100/90 dark:bg-green-950/40 dark:text-green-100 dark:border-green-700',
  em_operacao:
    'border-blue-400/70 bg-blue-50 text-blue-900 shadow-sm hover:bg-blue-100/90 dark:bg-blue-950/40 dark:text-blue-100 dark:border-blue-700',
  manutencao:
    'border-amber-400/80 bg-amber-50 text-amber-950 shadow-sm hover:bg-amber-100/90 dark:bg-amber-950/35 dark:text-amber-100 dark:border-amber-700',
  indisponivel:
    'border-slate-300 bg-slate-100 text-slate-800 shadow-sm hover:bg-slate-200/90 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600',
};

export interface VeiculoStatusPickerProps {
  status: string;
  disabled?: boolean;
  /** Badge clicável na coluna Status ou ícone na coluna Ações */
  variant: 'badge' | 'icon';
  onSelect: (next: StatusVeiculo) => void;
}

export function VeiculoStatusPicker({ status, disabled, variant, onSelect }: VeiculoStatusPickerProps) {
  const tone = TRIGGER_BADGE[status] ?? TRIGGER_BADGE.indisponivel;
  const label = STATUS_VEICULO_LABELS[status as StatusVeiculo] ?? status.replace(/_/g, ' ');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        {variant === 'badge' ? (
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              tone,
            )}
          >
            {label}
            <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
          </button>
        ) : (
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Alterar status">
            <Settings2 className="h-4 w-4" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {ORDEM_STATUS.map(s => (
          <DropdownMenuItem
            key={s}
            disabled={s === status}
            className="cursor-pointer"
            onClick={() => onSelect(s)}
          >
            {STATUS_VEICULO_LABELS[s]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
