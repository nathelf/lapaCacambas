import { STATUS_PEDIDO_LABELS, STATUS_NOTA_FISCAL_LABELS, type StatusPedido, type StatusNotaFiscal } from '@/types/enums';

interface StatusBadgeProps {
  status: string;
  labels?: Record<string, string>;
}

const statusClassMap: Record<string, string> = {
  orcamento: 'status-orcamento',
  programado: 'status-programado',
  em_rota: 'status-em-rota',
  em_execucao: 'status-execucao',
  concluido: 'status-concluido',
  faturado: 'status-faturado',
  cancelado: 'status-cancelado',
  pendente: 'status-pendente',
  // generic
  ativo: 'status-concluido',
  inativo: 'status-orcamento',
  bloqueado: 'status-cancelado',
  disponivel: 'status-concluido',
  manutencao: 'status-execucao',
  indisponivel: 'status-cancelado',
  em_uso: 'status-em-rota',
  reservada: 'status-programado',
  aberta: 'status-programado',
  paga: 'status-concluido',
  paga_parcial: 'status-execucao',
  vencida: 'status-cancelado',
  protesto: 'status-cancelado',
  emitido: 'status-programado',
  pago: 'status-concluido',
  vencido: 'status-cancelado',
  baixado: 'status-concluido',
  // fiscal
  nao_emitida: 'status-orcamento',
  emitida: 'status-concluido',
  erro: 'status-cancelado',
};

export function StatusBadge({ status, labels }: StatusBadgeProps) {
  const cls = statusClassMap[status] || 'status-orcamento';
  const label = labels?.[status] || STATUS_PEDIDO_LABELS[status as StatusPedido] || STATUS_NOTA_FISCAL_LABELS[status as StatusNotaFiscal] || status.replace(/_/g, ' ');

  return (
    <span className={`status-badge ${cls}`}>
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </span>
  );
}
