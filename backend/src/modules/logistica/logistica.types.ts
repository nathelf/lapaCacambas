// ─── Tipos brutos do banco ────────────────────────────────────────────────────

export interface ExecucaoRow {
  id: number;
  pedido_id: number;
  rota_parada_id: number | null;
  motorista_id: number | null;
  veiculo_id: number | null;
  tipo: string;
  status: StatusExecucao;
  data_inicio: string | null;
  data_fim: string | null;
  latitude: number | null;
  longitude: number | null;
  observacao: string | null;
  evidencia_url: string | null;
  created_at: string;
  updated_at: string;
  // joins
  pedidos?: {
    numero: string;
    tipo: string;
    data_programada: string | null;
    hora_programada: string | null;
    data_desejada: string | null;
    observacao: string | null;
    clientes?: { nome: string; telefone: string | null };
    obras?: { nome: string };
    enderecos_entrega?: { logradouro: string; numero: string; bairro: string; cidade: string };
    cacambas?: { numero: string };
  };
  motoristas?: { id: number; nome: string; celular: string | null } | null;
  veiculos?: { id: number; placa: string; modelo: string | null } | null;
}

export interface RotaRow {
  id: number;
  data: string;
  motorista_id: number;
  veiculo_id: number;
  status: StatusRota;
  observacao: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joins
  motoristas?: { nome: string; celular: string | null };
  veiculos?: { placa: string; modelo: string | null };
  rota_paradas?: RotaParadaRow[];
}

export interface RotaParadaRow {
  id: number;
  rota_id: number;
  pedido_id: number | null;
  ordem: number;
  endereco: string | null;
  latitude: number | null;
  longitude: number | null;
  tipo: string | null;
  status: StatusExecucao;
  hora_chegada: string | null;
  hora_saida: string | null;
  observacao: string | null;
  created_at: string;
  pedidos?: {
    numero: string;
    tipo: string;
    clientes?: { nome: string };
    obras?: { nome: string };
  };
}

// ─── Status enums ─────────────────────────────────────────────────────────────

export type StatusExecucao = 'pendente' | 'em_rota' | 'no_local' | 'executando' | 'concluida' | 'cancelada';
export type StatusRota = 'planejada' | 'em_andamento' | 'concluida' | 'cancelada';

// ─── DTOs de saída ────────────────────────────────────────────────────────────

export interface ExecucaoDto {
  id: number;
  pedidoId: number;
  pedidoNumero: string | null;
  pedidoTipo: string | null;
  dataProgramada: string | null;
  horaProgramada: string | null;
  dataDesejada: string | null;
  clienteNome: string | null;
  clienteTelefone: string | null;
  obraNome: string | null;
  enderecoEntrega: string | null;
  cacambaNumero: string | null;
  rotaParadaId: number | null;
  motoristaId: number | null;
  motoristaNome: string | null;
  veiculoId: number | null;
  veiculoPlaca: string | null;
  tipo: string;
  status: StatusExecucao;
  dataInicio: string | null;
  dataFim: string | null;
  observacao: string | null;
  evidenciaUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RotaParadaDto {
  id: number;
  rotaId: number;
  pedidoId: number | null;
  pedidoNumero: string | null;
  pedidoTipo: string | null;
  clienteNome: string | null;
  obraNome: string | null;
  ordem: number;
  endereco: string | null;
  tipo: string | null;
  status: StatusExecucao;
  horaChegada: string | null;
  horaSaida: string | null;
  observacao: string | null;
}

export interface RotaDto {
  id: number;
  data: string;
  motoristaId: number;
  motoristaNome: string | null;
  veiculoId: number;
  veiculoPlaca: string | null;
  status: StatusRota;
  observacao: string | null;
  paradas: RotaParadaDto[];
  createdAt: string;
  updatedAt: string;
}

// ─── DTOs de entrada ──────────────────────────────────────────────────────────

export interface ListExecucoesQuery {
  status?: StatusExecucao;
  data?: string;           // filtro por data_programada exata (YYYY-MM-DD) — usado pela logística
  dataInicio?: string;     // filtro por período (YYYY-MM-DD) — usado pela OS page
  dataFim?: string;
  semAtribuicao?: boolean;
  page?: number;
  limit?: number;
}

export interface ListExecucoesResult {
  data: ExecucaoDto[];
  total: number;
}

export interface AtribuirExecucaoDto {
  motoristaId: number;
  veiculoId: number;
}

export interface UpdateStatusExecucaoDto {
  status: StatusExecucao;
  observacao?: string;
  evidenciaUrl?: string;
  latitude?: number;
  longitude?: number;
}

export interface ListRotasQuery {
  data?: string;
  motoristaId?: number;
  status?: StatusRota;
}

export interface CreateRotaDto {
  data: string;
  motoristaId: number;
  veiculoId: number;
  observacao?: string;
}

export interface CreateParadaDto {
  pedidoId?: number;
  ordem: number;
  endereco?: string;
  tipo?: string;
  observacao?: string;
  latitude?: number;
  longitude?: number;
}
