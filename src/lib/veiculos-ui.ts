import { StatusVeiculo, STATUS_VEICULO_LABELS } from '@/types/enums';

/** Sugestões de tipo exibidas no cadastro (valor livre também permitido via combobox). */
export const TIPOS_VEICULO_SUGESTOES = [
  'Roll-on/off',
  'Poliguindaste',
  'Utilitário',
  'Basculante',
  'Carga seca',
  'Outro',
] as const;

export type VeiculoListaItem = {
  id: number;
  placa: string;
  marca: string | null;
  modelo: string;
  tipo: string | null;
  anoFabricacao: number | null;
  kmAtual: number;
  dataLicenciamento: string | null;
  status: StatusVeiculo | string;
};

export function normalizeVeiculoFromApi(raw: unknown): VeiculoListaItem {
  const r = raw as Record<string, unknown>;
  return {
    id: Number(r.id),
    placa: String(r.placa ?? ''),
    marca: r.marca != null && r.marca !== '' ? String(r.marca) : null,
    modelo: String(r.modelo ?? ''),
    tipo: (r.tipo as string) ?? null,
    anoFabricacao:
      r.anoFabricacao != null
        ? Number(r.anoFabricacao)
        : r.ano_fabricacao != null
          ? Number(r.ano_fabricacao)
          : null,
    kmAtual: Number(r.kmAtual ?? r.km_atual ?? 0),
    dataLicenciamento:
      (r.dataLicenciamento as string) ?? (r.data_licenciamento as string) ?? null,
    status: String(r.status ?? 'disponivel'),
  };
}

export function labelStatusVeiculo(status: string): string {
  return STATUS_VEICULO_LABELS[status as StatusVeiculo] ?? status.replace(/_/g, ' ');
}

/** vencido: data < hoje | proximo: ≤30 dias | ok */
export function alertaLicenciamento(isoDate: string | null): 'vencido' | 'proximo' | 'ok' {
  if (!isoDate || !String(isoDate).trim()) return 'ok';
  const part = String(isoDate).slice(0, 10);
  const alvo = new Date(`${part}T12:00:00`);
  if (Number.isNaN(alvo.getTime())) return 'ok';
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);
  const diffMs = alvo.getTime() - hoje.getTime();
  const dias = Math.ceil(diffMs / 86400000);
  if (dias < 0) return 'vencido';
  if (dias <= 30) return 'proximo';
  return 'ok';
}

export function formatKmBr(n: number): string {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  return `${v.toLocaleString('pt-BR')} km`;
}

/** Mantém só dígitos e limita a um inteiro razoável. */
export function parseKmDigits(input: string): number {
  const d = input.replace(/\D/g, '');
  if (!d) return 0;
  return Math.min(Number(d), 999999999);
}
