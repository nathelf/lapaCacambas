/**
 * Wrapper sobre useFrota que expõe os tipos usados no CacambasPage.
 * `Unidade` é compatível com FrotaUnidade do api.ts.
 */
import { useFrota } from '@/hooks/useQuery';
import { useCacambas } from '@/hooks/useQuery';
import type { FrotaUnidade } from '@/lib/api';

export type Unidade = FrotaUnidade;

export interface TipoCacamba {
  id: number;
  descricao: string;
  capacidade_m3: number;
  preco_dia: number;
  preco_semana: number;
  preco_quinzena: number;
  preco_mes: number;
}

export function useUnidades() {
  const { data = [], isLoading } = useFrota();
  return { unidades: data as Unidade[], loading: isLoading };
}

export function useTipos(): TipoCacamba[] {
  const { data = [] } = useCacambas();
  return (data as any[]).map((c: any) => ({
    id:             c.id,
    descricao:      c.descricao,
    capacidade_m3:  parseFloat(c.capacidade ?? '0') || 0,
    preco_dia:      c.precoDia      ?? c.preco_dia      ?? 0,
    preco_semana:   c.precoSemana   ?? c.preco_semana   ?? 0,
    preco_quinzena: c.precoQuinzena ?? c.preco_quinzena ?? 0,
    preco_mes:      c.precoMes      ?? c.preco_mes      ?? 0,
  }));
}
