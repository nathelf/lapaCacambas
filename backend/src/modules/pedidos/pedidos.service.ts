import { supabaseAdmin } from '../../lib/supabase';
import type {
  PedidoRow,
  PedidoDto,
  CreatePedidoDto,
  UpdatePedidoDto,
  UpdateStatusPedidoDto,
  ListPedidosQuery,
  StatusPedido,
} from './pedidos.types';

// ─── Transições de status permitidas ─────────────────────────────────────────
// Define quais mudanças de status são válidas (não pode pular etapas)
const TRANSICOES_VALIDAS: Record<StatusPedido, StatusPedido[]> = {
  orcamento:               ['aguardando_aprovacao', 'cancelado'],
  aguardando_aprovacao:    ['aprovado', 'cancelado'],
  aprovado:                ['pendente_programacao', 'cancelado'],
  pendente_programacao:    ['programado', 'cancelado'],
  programado:              ['em_rota', 'cancelado'],
  em_rota:                 ['em_execucao', 'cancelado'],
  em_execucao:             ['concluido', 'cancelado'],
  concluido:               ['faturado'],
  faturado:                [],
  cancelado:               [],
};

// ─── Converte linha do banco para DTO ─────────────────────────────────────────
function toDto(row: PedidoRow): PedidoDto {
  return {
    id: row.id,
    numero: row.numero,
    clienteId: row.cliente_id,
    clienteNome: row.clientes?.nome ?? null,
    obraId: row.obra_id,
    obraNome: row.obras?.nome ?? null,
    enderecoEntregaId: row.endereco_entrega_id,
    servicoId: row.servico_id,
    servicoDescricao: row.servicos?.descricao ?? null,
    cacambaId: row.cacamba_id,
    cacambaNumero: row.cacambas?.numero ?? null,
    unidadeCacambaId: row.unidade_cacamba_id,
    maquinaId: row.maquina_id,
    tipo: row.tipo,
    tipoLocacao: row.tipo_locacao,
    status: row.status,
    quantidade: row.quantidade,
    valorUnitario: row.valor_unitario,
    valorDesconto: row.valor_desconto,
    valorTotal: row.valor_total,
    dataPedido: row.data_pedido,
    dataDesejada: row.data_desejada,
    dataRetiradaPrevista: row.data_retirada_prevista,
    janelaAtendimento: row.janela_atendimento,
    prioridade: row.prioridade,
    observacao: row.observacao,
    observacaoOperacional: row.observacao_operacional,
    motoristaColocacaoId: row.motorista_colocacao_id,
    veiculoColocacaoId: row.veiculo_colocacao_id,
    dataProgramada: row.data_programada,
    horaProgramada: row.hora_programada,
    dataColocacao: row.data_colocacao,
    obsColocacao: row.obs_colocacao,
    motoristaRetiradaId: row.motorista_retirada_id,
    veiculoRetiradaId: row.veiculo_retirada_id,
    dataRetirada: row.data_retirada,
    obsRetirada: row.obs_retirada,
    aterroDestino: row.aterro_destino,
    faturado: row.faturado,
    dataFaturamento: row.data_faturamento,
    statusFiscal: row.status_fiscal,
    notaFiscalId: row.nota_fiscal_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Listar pedidos ───────────────────────────────────────────────────────────
export async function listar(query: ListPedidosQuery): Promise<{ data: PedidoDto[]; total: number }> {
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? 50, 100);
  const offset = (page - 1) * limit;

  let q = supabaseAdmin
    .from('pedidos')
    .select('*, clientes(nome, fantasia, status), obras(nome), servicos(descricao, codigo_fiscal, aliquota), cacambas(numero)', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (query.status)    q = q.eq('status', query.status);
  if (query.clienteId) q = q.eq('cliente_id', query.clienteId);
  if (query.dataInicio) q = q.gte('data_pedido', query.dataInicio);
  if (query.dataFim)    q = q.lte('data_pedido', query.dataFim);
  if (query.busca) {
    q = q.or(`numero.ilike.%${query.busca}%,observacao.ilike.%${query.busca}%`);
  }

  const { data, error, count } = await q;
  if (error) throw new Error('Falha ao buscar pedidos.');

  return { data: (data as PedidoRow[]).map(toDto), total: count ?? 0 };
}

// ─── Buscar por ID ────────────────────────────────────────────────────────────
export async function buscarPorId(id: number): Promise<PedidoDto> {
  const { data, error } = await supabaseAdmin
    .from('pedidos')
    .select('*, clientes(nome, fantasia, status), obras(nome), servicos(descricao, codigo_fiscal, aliquota), cacambas(numero)')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !data) throw new Error('Pedido não encontrado.');
  return toDto(data as PedidoRow);
}

// ─── Criar pedido ─────────────────────────────────────────────────────────────
export async function criar(dto: CreatePedidoDto, userId: string): Promise<PedidoDto> {
  // Regra: cliente inadimplente não pode ter novo pedido
  const { data: cliente } = await supabaseAdmin
    .from('clientes')
    .select('status')
    .eq('id', dto.clienteId)
    .single();

  if (cliente?.status === 'inadimplente') {
    throw new Error('Cliente inadimplente. Pedido bloqueado.');
  }

  // Regra: caçamba não pode estar em dois pedidos ativos ao mesmo tempo
  if (dto.cacambaId) {
    const { data: conflito } = await supabaseAdmin
      .from('pedidos')
      .select('id')
      .eq('cacamba_id', dto.cacambaId)
      .not('status', 'in', '("concluido","cancelado","faturado")')
      .is('deleted_at', null)
      .limit(1);

    if (conflito && conflito.length > 0) {
      throw new Error('Caçamba já está alocada em outro pedido ativo.');
    }
  }

  const valorTotal = ((dto.valorUnitario ?? 0) * (dto.quantidade ?? 1)) - (dto.valorDesconto ?? 0);

  const { data, error } = await supabaseAdmin
    .from('pedidos')
    .insert({
      cliente_id: dto.clienteId,
      obra_id: dto.obraId ?? null,
      endereco_entrega_id: dto.enderecoEntregaId ?? null,
      servico_id: dto.servicoId ?? null,
      cacamba_id: dto.cacambaId ?? null,
      unidade_cacamba_id: dto.unidadeCacambaId ?? null,
      maquina_id: dto.maquinaId ?? null,
      tipo: dto.tipo,
      tipo_locacao: dto.tipoLocacao ?? 'dia',
      quantidade: dto.quantidade ?? 1,
      valor_unitario: dto.valorUnitario ?? 0,
      valor_desconto: dto.valorDesconto ?? 0,
      valor_total: valorTotal,
      data_desejada: dto.dataDesejada ?? null,
      data_retirada_prevista: dto.dataRetiradaPrevista ?? null,
      janela_atendimento: dto.janelaAtendimento ?? null,
      prioridade: dto.prioridade ?? 0,
      observacao: dto.observacao ?? null,
      observacao_operacional: dto.observacaoOperacional ?? null,
      status: 'orcamento',
      created_by: userId,
      updated_by: userId,
    })
    .select('*, clientes(nome, fantasia, status), obras(nome), servicos(descricao, codigo_fiscal, aliquota), cacambas(numero)')
    .single();

  if (error || !data) throw new Error('Falha ao criar pedido.');
  return toDto(data as PedidoRow);
}

// ─── Atualizar pedido ─────────────────────────────────────────────────────────
export async function atualizar(id: number, dto: UpdatePedidoDto, userId: string): Promise<PedidoDto> {
  const updates: Record<string, unknown> = {
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  if (dto.obraId !== undefined)               updates.obra_id = dto.obraId;
  if (dto.enderecoEntregaId !== undefined)     updates.endereco_entrega_id = dto.enderecoEntregaId;
  if (dto.servicoId !== undefined)            updates.servico_id = dto.servicoId;
  if (dto.cacambaId !== undefined)            updates.cacamba_id = dto.cacambaId;
  if (dto.unidadeCacambaId !== undefined)     updates.unidade_cacamba_id = dto.unidadeCacambaId;
  if (dto.maquinaId !== undefined)            updates.maquina_id = dto.maquinaId;
  if (dto.tipo !== undefined)                 updates.tipo = dto.tipo;
  if (dto.tipoLocacao !== undefined)          updates.tipo_locacao = dto.tipoLocacao;
  if (dto.quantidade !== undefined)           updates.quantidade = dto.quantidade;
  if (dto.valorUnitario !== undefined)        updates.valor_unitario = dto.valorUnitario;
  if (dto.valorDesconto !== undefined)        updates.valor_desconto = dto.valorDesconto;
  if (dto.dataDesejada !== undefined)         updates.data_desejada = dto.dataDesejada;
  if (dto.dataRetiradaPrevista !== undefined) updates.data_retirada_prevista = dto.dataRetiradaPrevista;
  if (dto.janelaAtendimento !== undefined)    updates.janela_atendimento = dto.janelaAtendimento;
  if (dto.prioridade !== undefined)           updates.prioridade = dto.prioridade;
  if (dto.observacao !== undefined)           updates.observacao = dto.observacao;
  if (dto.observacaoOperacional !== undefined) updates.observacao_operacional = dto.observacaoOperacional;

  // Recalcula valor_total se algum dos componentes foi alterado
  if (dto.valorUnitario !== undefined || dto.valorDesconto !== undefined || dto.quantidade !== undefined) {
    const { data: atual } = await supabaseAdmin.from('pedidos').select('valor_unitario, valor_desconto, quantidade').eq('id', id).single();
    if (atual) {
      const vu = dto.valorUnitario ?? atual.valor_unitario;
      const vd = dto.valorDesconto ?? atual.valor_desconto;
      const qt = dto.quantidade ?? atual.quantidade;
      updates.valor_total = (vu * qt) - vd;
    }
  }

  const { data, error } = await supabaseAdmin
    .from('pedidos')
    .update(updates)
    .eq('id', id)
    .is('deleted_at', null)
    .select('*, clientes(nome, fantasia, status), obras(nome), servicos(descricao, codigo_fiscal, aliquota), cacambas(numero)')
    .single();

  if (error || !data) throw new Error('Pedido não encontrado.');
  return toDto(data as PedidoRow);
}

// ─── Mudar status ─────────────────────────────────────────────────────────────
export async function mudarStatus(id: number, dto: UpdateStatusPedidoDto, userId: string): Promise<PedidoDto> {
  const { data: atual, error: fetchErr } = await supabaseAdmin
    .from('pedidos')
    .select('status, faturado')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (fetchErr || !atual) throw new Error('Pedido não encontrado.');

  const statusAtual = atual.status as StatusPedido;
  const novoStatus = dto.status;

  // Valida se a transição é permitida
  const permitidos = TRANSICOES_VALIDAS[statusAtual] ?? [];
  if (!permitidos.includes(novoStatus)) {
    throw new Error(`Transição de "${statusAtual}" para "${novoStatus}" não é permitida.`);
  }

  const updates: Record<string, unknown> = {
    status: novoStatus,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  // Quando pedido é faturado, registra a data
  if (novoStatus === 'faturado') {
    updates.faturado = true;
    updates.data_faturamento = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from('pedidos')
    .update(updates)
    .eq('id', id)
    .select('*, clientes(nome, fantasia, status), obras(nome), servicos(descricao, codigo_fiscal, aliquota), cacambas(numero)')
    .single();

  if (error || !data) throw new Error('Falha ao atualizar status.');

  // Quando pedido vai para "programado", cria execução automaticamente
  // A execução fica com status "pendente" aguardando logística atribuir motorista/veículo
  if (novoStatus === 'programado') {
    const pedido = data as PedidoRow;
    await supabaseAdmin.from('execucoes').insert({
      pedido_id: id,
      tipo: pedido.tipo,
      status: 'pendente',
      motorista_id: null,
      veiculo_id: null,
    });
  }

  return toDto(data as PedidoRow);
}

// ─── Soft delete ──────────────────────────────────────────────────────────────
export async function deletar(id: number, userId: string): Promise<void> {
  // Apenas pedidos em status inicial podem ser deletados
  const { data: atual } = await supabaseAdmin
    .from('pedidos')
    .select('status')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (!atual) throw new Error('Pedido não encontrado.');

  if (['em_rota', 'em_execucao', 'concluido', 'faturado'].includes(atual.status)) {
    throw new Error('Pedido em andamento ou concluído não pode ser removido.');
  }

  const { error } = await supabaseAdmin
    .from('pedidos')
    .update({ deleted_at: new Date().toISOString(), updated_by: userId })
    .eq('id', id);

  if (error) throw new Error('Falha ao remover pedido.');
}
