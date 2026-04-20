import { STATUS_NOTA_FISCAL_LABELS, type StatusNotaFiscal } from '@/types/enums';

interface StatusFiscalBadgeProps {
  status: StatusNotaFiscal;
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
  const label = STATUS_NOTA_FISCAL_LABELS[status] || status;

  return (
    <span className={`status-badge ${cls}`}>
      {label}
    </span>
  );
}
