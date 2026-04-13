// ─── Enums (espelham os tipos do banco) ──────────────────────────────────────

export type TipoPedido =
  | 'entrega_cacamba'
  | 'retirada_cacamba'
  | 'troca_cacamba'
  | 'locacao_maquina'
  | 'transporte'
  | 'servico_avulso';

export type TipoLocacao = 'dia' | 'semana' | 'quinzena' | 'mes';

export type StatusPedido =
  | 'orcamento'
  | 'aguardando_aprovacao'
  | 'aprovado'
  | 'pendente_programacao'
  | 'programado'
  | 'em_rota'
  | 'em_execucao'
  | 'concluido'
  | 'faturado'
  | 'cancelado';

export type StatusNotaFiscal = 'nao_emitida' | 'emitida' | 'cancelada';

// ─── Row (colunas exatas da tabela pedidos) ───────────────────────────────────

export type PedidoRow = {
  id: number;
  numero: string;
  cliente_id: number;
  obra_id: number | null;
  endereco_entrega_id: number | null;
  servico_id: number | null;
  cacamba_id: number | null;
  unidade_cacamba_id: number | null;
  maquina_id: number | null;
  tipo: TipoPedido;
  tipo_locacao: TipoLocacao;
  status: StatusPedido;
  quantidade: number;
  valor_unitario: number;
  valor_desconto: number;
  valor_total: number;
  data_pedido: string;
  data_desejada: string | null;
  data_retirada_prevista: string | null;
  janela_atendimento: string | null;
  prioridade: number;
  observacao: string | null;
  observacao_operacional: string | null;
  motorista_colocacao_id: number | null;
  veiculo_colocacao_id: number | null;
  data_programada: string | null;
  hora_programada: string | null;
  data_colocacao: string | null;
  obs_colocacao: string | null;
  motorista_retirada_id: number | null;
  veiculo_retirada_id: number | null;
  data_retirada: string | null;
  obs_retirada: string | null;
  aterro_destino: string | null;
  faturado: boolean;
  data_faturamento: string | null;
  status_fiscal: StatusNotaFiscal;
  nota_fiscal_id: number | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // joins opcionais (quando o select traz dados relacionados)
  clientes?: { nome: string; fantasia: string | null; status: string } | null;
  servicos?: { descricao: string; codigo_fiscal: string | null; aliquota: number } | null;
  cacambas?: { descricao: string } | null;
  obras?: { nome: string } | null;
  enderecos_entrega?: {
    endereco: string | null;
    numero: string | null;
    bairro: string | null;
    cidade: string | null;
    estado: string | null;
    contato: string | null;
    referencia: string | null;
  } | null;
};

// ─── Dto (o que o frontend recebe — camelCase) ────────────────────────────────

export type PedidoDto = {
  id: number;
  numero: string;
  clienteId: number;
  clienteNome: string | null;
  obraId: number | null;
  obraNome: string | null;
  enderecoEntregaId: number | null;
  servicoId: number | null;
  servicoDescricao: string | null;
  cacambaId: number | null;
  cacambaDescricao: string | null;
  unidadeCacambaId: number | null;
  maquinaId: number | null;
  tipo: TipoPedido;
  tipoLocacao: TipoLocacao;
  status: StatusPedido;
  quantidade: number;
  valorUnitario: number;
  valorDesconto: number;
  valorTotal: number;
  dataPedido: string;
  dataDesejada: string | null;
  dataRetiradaPrevista: string | null;
  janelaAtendimento: string | null;
  prioridade: number;
  observacao: string | null;
  observacaoOperacional: string | null;
  motoristaColocacaoId: number | null;
  veiculoColocacaoId: number | null;
  dataProgramada: string | null;
  horaProgramada: string | null;
  dataColocacao: string | null;
  obsColocacao: string | null;
  motoristaRetiradaId: number | null;
  veiculoRetiradaId: number | null;
  dataRetirada: string | null;
  obsRetirada: string | null;
  aterroDestino: string | null;
  faturado: boolean;
  dataFaturamento: string | null;
  statusFiscal: StatusNotaFiscal;
  notaFiscalId: number | null;
  enderecoEntrega?: {
    endereco: string | null;
    numero: string | null;
    bairro: string | null;
    cidade: string | null;
    estado: string | null;
    contato: string | null;
    referencia: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

// ─── DTOs de entrada ──────────────────────────────────────────────────────────

export type CreatePedidoDto = {
  clienteId: number;
  obraId?: number;
  enderecoEntregaId?: number;
  servicoId?: number;
  cacambaId?: number;
  unidadeCacambaId?: number;
  maquinaId?: number;
  tipo: TipoPedido;
  tipoLocacao?: TipoLocacao;
  quantidade?: number;
  valorUnitario?: number;
  valorDesconto?: number;
  dataDesejada?: string;
  dataRetiradaPrevista?: string;
  janelaAtendimento?: string;
  prioridade?: number;
  observacao?: string;
  observacaoOperacional?: string;
};

export type UpdatePedidoDto = Partial<Omit<CreatePedidoDto, 'clienteId'>>;

export type UpdateStatusPedidoDto = {
  status: StatusPedido;
  motivo?: string;
  // Campos extras por transição de status
  motoristaColocacaoId?: number;
  veiculoColocacaoId?: number;
  dataProgramada?: string;
  horaProgramada?: string | null;
  dataColocacao?: string;
  obsColocacao?: string | null;
  dataRetirada?: string;
  obsRetirada?: string | null;
  aterroDestino?: string | null;
};

export type ListPedidosQuery = {
  busca?: string;
  status?: StatusPedido;
  clienteId?: number;
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  limit?: number;
};
