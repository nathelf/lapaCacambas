import type { StatusCacamba } from '../../../../shared/enums';

// ─── Tipo/Modelo de caçamba (ex: "Caçamba 5m³") ──────────────────────────────

export type CacambaRow = {
  id: number;
  descricao: string;
  capacidade: string | null;
  preco_dia: number;
  preco_semana: number;
  preco_quinzena: number;
  preco_mes: number;
  imagem: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type CacambaDto = {
  id: number;
  descricao: string;
  capacidade: string | null;
  precoDia: number;
  precoSemana: number;
  precoQuinzena: number;
  precoMes: number;
  imagem: string | null;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateCacambaDto = {
  descricao: string;
  capacidade?: string;
  precoDia: number;
  precoSemana: number;
  precoQuinzena: number;
  precoMes: number;
  imagem?: string;
};

export type UpdateCacambaDto = Partial<CreateCacambaDto> & {
  ativo?: boolean;
};

// ─── Unidade física individual (ex: patrimônio "CAC-001") ────────────────────

export type UnidadeCacambaRow = {
  id: number;
  cacamba_id: number;
  patrimonio: string;
  status: StatusCacamba;
  pedido_atual_id: number | null;
  cliente_atual: string | null;
  observacao: string | null;
  created_at: string;
  updated_at: string;
  cacambas?: { id: number; descricao: string } | null;
};

export type UnidadeCacambaDto = {
  id: number;
  cacambaId: number;
  patrimonio: string;
  status: StatusCacamba;
  pedidoAtualId: number | null;
  clienteAtual: string | null;
  observacao: string | null;
  createdAt: string;
  updatedAt: string;
  cacamba?: { id: number; descricao: string } | null;
};

export type CreateUnidadeDto = {
  cacambaId: number;
  patrimonio: string;
  observacao?: string;
};

export type UpdateUnidadeDto = {
  status?: StatusCacamba;
  pedidoAtualId?: number | null;
  clienteAtual?: string | null;
  observacao?: string;
};

// ─── Filtros ──────────────────────────────────────────────────────────────────

export type ListUnidadesQuery = {
  status?: StatusCacamba;
  cacambaId?: number;
};
