import { STATUS_FISCAL_LABELS, type StatusFiscal } from '@/types/enums';

interface StatusFiscalBadgeProps {
  status: StatusFiscal;
}

const fiscalClassMap: Record<string, string> = {
  nao_emitida: 'status-orcamento',
  pendente: 'status-pendente',
  emitida: 'status-concluido',
  cancelada: 'status-cancelado',
  erro: 'status-cancelado',
};

export function StatusFiscalBadge({ status }: StatusFiscalBadgeProps) {
  const cls = fiscalClassMap[status] || 'status-orcamento';
  const label = STATUS_FISCAL_LABELS[status] || status;

  return (
    <span className={`status-badge ${cls}`}>
      {label}
    </span>
  );
}
