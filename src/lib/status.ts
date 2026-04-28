/**
 * Mapeamento de status de caçamba com metadados visuais.
 * Inclui `atrasada` como status derivado (>15 dias no cliente).
 */

export type CacambaStatus =
  | 'disponivel'
  | 'em_rota'
  | 'no_cliente'
  | 'atrasada'
  | 'manutencao'
  | 'indisponivel';

export interface StatusMeta {
  label: string;
  pinColor: string;
  bgClass: string;
  textClass: string;
  dotClass: string;
}

export const STATUS_META: Record<CacambaStatus, StatusMeta> = {
  disponivel:   { label: 'Disponível',   pinColor: '#22c55e', bgClass: 'bg-green-100',   textClass: 'text-green-700',   dotClass: 'bg-green-500' },
  em_rota:      { label: 'Em rota',      pinColor: '#3b82f6', bgClass: 'bg-blue-100',    textClass: 'text-blue-700',    dotClass: 'bg-blue-500' },
  no_cliente:   { label: 'No cliente',   pinColor: '#8b5cf6', bgClass: 'bg-purple-100',  textClass: 'text-purple-700',  dotClass: 'bg-purple-500' },
  atrasada:     { label: 'Atrasada',     pinColor: '#ef4444', bgClass: 'bg-red-100',     textClass: 'text-red-700',     dotClass: 'bg-red-500' },
  manutencao:   { label: 'Manutenção',   pinColor: '#f59e0b', bgClass: 'bg-amber-100',   textClass: 'text-amber-700',   dotClass: 'bg-amber-500' },
  indisponivel: { label: 'Indisponível', pinColor: '#6b7280', bgClass: 'bg-gray-100',    textClass: 'text-gray-600',    dotClass: 'bg-gray-400' },
};

/** Retorna o status efetivo: `no_cliente` vira `atrasada` após 15 dias. */
export function statusEfetivo(
  status: string,
  ultimaAtualizacao?: string | null,
): CacambaStatus {
  if (status === 'em_uso') return 'no_cliente';  // alias do banco
  if ((status === 'no_cliente' || status === 'em_uso') && ultimaAtualizacao) {
    if (diasParado(ultimaAtualizacao) > 15) return 'atrasada';
  }
  return (status as CacambaStatus) ?? 'disponivel';
}

/** Dias desde a última atualização de posição. */
export function diasParado(ultimaAtualizacao?: string | null): number {
  if (!ultimaAtualizacao) return 0;
  return Math.floor((Date.now() - new Date(ultimaAtualizacao).getTime()) / 86_400_000);
}
