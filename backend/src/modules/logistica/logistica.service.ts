import { supabaseAdmin } from '../../lib/supabase';
import type {
  ExecucaoRow, ExecucaoDto, ListExecucoesResult,
  RotaRow, RotaDto, RotaParadaDto, RotaParadaRow,
  ListExecucoesQuery, AtribuirExecucaoDto, UpdateStatusExecucaoDto,
  ListRotasQuery, CreateRotaDto, CreateParadaDto,
} from './logistica.types';

// ─── Helpers de conversão ─────────────────────────────────────────────────────


function execucaoToDto(row: ExecucaoRow): ExecucaoDto {
  const p = row.pedidos;
  const end = p?.enderecos_entrega;
  return {
    id: row.id,
    pedidoId: row.pedido_id,
    pedidoNumero: p?.numero ?? null,
    pedidoTipo: p?.tipo ?? null,
    dataProgramada: p?.data_programada ?? null,
    horaProgramada: p?.hora_programada ?? null,
    dataDesejada: p?.data_desejada ?? null,
    clienteNome: p?.clientes?.nome ?? null,
    clienteTelefone: p?.clientes?.telefone ?? null,
    obraNome: p?.obras?.nome ?? null,
    enderecoEntrega: end ? [end.endereco, end.numero, end.bairro, end.cidade].filter(Boolean).join(', ') : null,
    cacambaNumero: p?.cacambas?.descricao ?? null,
    rotaParadaId: row.rota_parada_id,
    motoristaId: row.motorista_id,
    motoristaNome: row.motoristas?.nome ?? null,
    veiculoId: row.veiculo_id,
    veiculoPlaca: row.veiculos?.placa ?? null,
    tipo: row.tipo,
    status: row.status,
    dataInicio: row.data_inicio,
    dataFim: row.data_fim,
    observacao: row.observacao,
    evidenciaUrl: row.evidencia_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function paradaToDto(row: RotaParadaRow): RotaParadaDto {
  return {
    id: row.id,
    rotaId: row.rota_id,
    pedidoId: row.pedido_id,
    pedidoNumero: row.pedidos?.numero ?? null,
    pedidoTipo: row.pedidos?.tipo ?? null,
    clienteNome: row.pedidos?.clientes?.nome ?? null,
    obraNome: row.pedidos?.obras?.nome ?? null,
    ordem: row.ordem,
    endereco: row.endereco,
    tipo: row.tipo,
    status: row.status,
    horaChegada: row.hora_chegada,
    horaSaida: row.hora_saida,
    observacao: row.observacao,
  };
}

function rotaToDto(row: RotaRow): RotaDto {
  return {
    id: row.id,
    data: row.data,
    motoristaId: row.motorista_id,
    motoristaNome: row.motoristas?.nome ?? null,
    veiculoId: row.veiculo_id,
    veiculoPlaca: row.veiculos?.placa ?? null,
    status: row.status as RotaDto['status'],
    observacao: row.observacao,
    paradas: (row.rota_paradas ?? []).map(paradaToDto),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const EXECUCAO_SELECT = `
  *,
  pedidos(numero, tipo, data_programada, hora_programada, data_desejada, observacao,
    clientes(nome, telefone),
    obras(nome),
    enderecos_entrega:enderecos_entrega(endereco, numero, bairro, cidade),
    cacambas(descricao)
  ),
  motoristas(id, nome, celular),
  veiculos(id, placa, modelo)
`;

// ─── Execuções ────────────────────────────────────────────────────────────────

export async function listarExecucoes(query: ListExecucoesQuery): Promise<ExecucaoDto[] | ListExecucoesResult> {
  const isPaginado = query.page !== undefined;
  const limit = query.limit ?? 20;
  const page  = query.page  ?? 1;
  const from  = (page - 1) * limit;

  let q = supabaseAdmin
    .from('execucoes')
    .select(EXECUCAO_SELECT, isPaginado ? { count: 'exact' } : undefined)
    .order('created_at', { ascending: false });

  if (query.status)        q = q.eq('status', query.status);
  if (query.semAtribuicao) q = q.is('motorista_id', null);
  if (query.dataInicio)    q = (q as any).gte('created_at', `${query.dataInicio}T00:00:00`);
  if (query.dataFim)       q = (q as any).lte('created_at', `${query.dataFim}T23:59:59`);
  if (isPaginado)          q = (q as any).range(from, from + limit - 1);

  const { data, error, count } = await q as any;
  if (error) throw new Error('Falha ao buscar execuções.');

  let rows = data as ExecucaoRow[];

  // filtro por data_programada exata (usado pela logística — feito em memória pois é join)
  if (query.data) {
    rows = rows.filter(r => r.pedidos?.data_programada?.startsWith(query.data!));
  }

  if (isPaginado) {
    return { data: rows.map(execucaoToDto), total: count ?? 0 };
  }
  return rows.map(execucaoToDto);
}

export async function buscarExecucaoPorId(id: number): Promise<ExecucaoDto> {
  const { data, error } = await supabaseAdmin
    .from('execucoes')
    .select(EXECUCAO_SELECT)
    .eq('id', id)
    .single();

  if (error || !data) throw new Error('Execução não encontrada.');
  return execucaoToDto(data as ExecucaoRow);
}

export async function criarExecucao(
  pedidoId: number,
  tipo: string,
  motoristaId?: number,
  veiculoId?: number,
): Promise<ExecucaoDto> {
  const { data: pedido, error: pedidoErr } = await supabaseAdmin
    .from('pedidos')
    .select('id')
    .eq('id', pedidoId)
    .is('deleted_at', null)
    .single();
  if (pedidoErr || !pedido) throw new Error('Pedido não encontrado.');

  const { data: existing } = await supabaseAdmin
    .from('execucoes')
    .select('id')
    .eq('pedido_id', pedidoId)
    .eq('tipo', tipo)
    .in('status', ['pendente', 'em_rota', 'no_local', 'executando'])
    .maybeSingle();
  if (existing) throw new Error('Já existe uma OS ativa para este pedido e tipo de serviço.');

  const { data, error } = await supabaseAdmin
    .from('execucoes')
    .insert({
      pedido_id:    pedidoId,
      tipo,
      status:       'pendente',
      motorista_id: motoristaId ?? null,
      veiculo_id:   veiculoId   ?? null,
    })
    .select(EXECUCAO_SELECT)
    .single();

  if (error || !data) {
    console.error('[criarExecucao] supabase error:', error);
    throw new Error('Falha ao criar OS.');
  }
  return execucaoToDto(data as ExecucaoRow);
}

export async function atribuirExecucao(id: number, dto: AtribuirExecucaoDto): Promise<ExecucaoDto> {
  // Verifica se o motorista não está bloqueado
  const { data: motorista } = await supabaseAdmin
    .from('motoristas')
    .select('status')
    .eq('id', dto.motoristaId)
    .single();

  if (motorista?.status === 'bloqueado' || motorista?.status === 'inativo') {
    throw new Error('Motorista bloqueado ou inativo não pode ser escalado.');
  }

  // Verifica se o veículo não está em manutenção
  const { data: veiculo } = await supabaseAdmin
    .from('veiculos')
    .select('status')
    .eq('id', dto.veiculoId)
    .single();

  if (veiculo?.status === 'manutencao' || veiculo?.status === 'inativo') {
    throw new Error('Veículo em manutenção ou inativo não pode receber rota.');
  }

  const { data, error } = await supabaseAdmin
    .from('execucoes')
    .update({
      motorista_id: dto.motoristaId,
      veiculo_id: dto.veiculoId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(EXECUCAO_SELECT)
    .single();

  if (error || !data) throw new Error('Falha ao atribuir execução.');
  return execucaoToDto(data as ExecucaoRow);
}

export async function atualizarStatusExecucao(id: number, dto: UpdateStatusExecucaoDto): Promise<ExecucaoDto> {
  const updates: Record<string, unknown> = {
    status: dto.status,
    updated_at: new Date().toISOString(),
  };

  if (dto.observacao !== undefined) updates.observacao = dto.observacao;
  if (dto.evidenciaUrl !== undefined) updates.evidencia_url = dto.evidenciaUrl;
  if (dto.latitude !== undefined)    updates.latitude = dto.latitude;
  if (dto.longitude !== undefined)   updates.longitude = dto.longitude;

  if (dto.status === 'em_rota' || dto.status === 'executando') {
    updates.data_inicio = updates.data_inicio ?? new Date().toISOString();
  }
  if (dto.status === 'concluida' || dto.status === 'cancelada') {
    updates.data_fim = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from('execucoes')
    .update(updates)
    .eq('id', id)
    .select(EXECUCAO_SELECT)
    .single();

  if (error || !data) throw new Error('Falha ao atualizar status da execução.');

  // Se concluída, atualiza o pedido para "em_execucao" ou "concluido"
  if (dto.status === 'concluida') {
    await supabaseAdmin
      .from('pedidos')
      .update({ status: 'concluido', updated_at: new Date().toISOString() })
      .eq('id', (data as ExecucaoRow).pedido_id)
      .in('status', ['programado', 'em_rota', 'em_execucao']);
  }

  return execucaoToDto(data as ExecucaoRow);
}

// ─── Rotas ────────────────────────────────────────────────────────────────────

export async function listarRotas(query: ListRotasQuery): Promise<RotaDto[]> {
  let q = supabaseAdmin
    .from('rotas')
    .select(`
      *,
      motoristas(nome, celular),
      veiculos(placa, modelo),
      rota_paradas(*, pedidos(numero, tipo, clientes(nome), obras(nome)))
    `)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false });

  if (query.data)        q = q.eq('data', query.data);
  if (query.motoristaId) q = q.eq('motorista_id', query.motoristaId);
  if (query.status)      q = q.eq('status', query.status);

  const { data, error } = await q;
  if (error) throw new Error('Falha ao buscar rotas.');
  return (data as RotaRow[]).map(rotaToDto);
}

export async function buscarRotaPorId(id: number): Promise<RotaDto> {
  const { data, error } = await supabaseAdmin
    .from('rotas')
    .select(`
      *,
      motoristas(nome, celular),
      veiculos(placa, modelo),
      rota_paradas(*, pedidos(numero, tipo, clientes(nome), obras(nome)))
    `)
    .eq('id', id)
    .single();

  if (error || !data) throw new Error('Rota não encontrada.');
  return rotaToDto(data as RotaRow);
}

export async function criarRota(dto: CreateRotaDto, userId: string): Promise<RotaDto> {
  const { data, error } = await supabaseAdmin
    .from('rotas')
    .insert({
      data: dto.data,
      motorista_id: dto.motoristaId,
      veiculo_id: dto.veiculoId,
      observacao: dto.observacao ?? null,
      status: 'planejada',
      created_by: userId,
    })
    .select(`
      *,
      motoristas(nome, celular),
      veiculos(placa, modelo),
      rota_paradas(*)
    `)
    .single();

  if (error || !data) throw new Error('Falha ao criar rota.');
  return rotaToDto(data as RotaRow);
}

export async function adicionarParada(rotaId: number, dto: CreateParadaDto): Promise<RotaParadaDto> {
  const { data, error } = await supabaseAdmin
    .from('rota_paradas')
    .insert({
      rota_id: rotaId,
      pedido_id: dto.pedidoId ?? null,
      ordem: dto.ordem,
      endereco: dto.endereco ?? null,
      tipo: dto.tipo ?? null,
      observacao: dto.observacao ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      status: 'pendente',
    })
    .select('*, pedidos(numero, tipo, clientes(nome), obras(nome))')
    .single();

  if (error || !data) throw new Error('Falha ao adicionar parada.');

  // Vincula a execução do pedido a esta parada
  if (dto.pedidoId) {
    await supabaseAdmin
      .from('execucoes')
      .update({ rota_parada_id: (data as RotaParadaRow).id, updated_at: new Date().toISOString() })
      .eq('pedido_id', dto.pedidoId)
      .eq('status', 'pendente');
  }

  return paradaToDto(data as RotaParadaRow);
}

export async function atualizarStatusRota(id: number, status: RotaDto['status']): Promise<RotaDto> {
  const { data, error } = await supabaseAdmin
    .from('rotas')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(`
      *,
      motoristas(nome, celular),
      veiculos(placa, modelo),
      rota_paradas(*, pedidos(numero, tipo, clientes(nome), obras(nome)))
    `)
    .single();

  if (error || !data) throw new Error('Falha ao atualizar status da rota.');
  return rotaToDto(data as RotaRow);
}

export async function removerParada(rotaId: number, paradaId: number): Promise<void> {
  // Desvincula execução antes de remover
  await supabaseAdmin
    .from('execucoes')
    .update({ rota_parada_id: null, updated_at: new Date().toISOString() })
    .eq('rota_parada_id', paradaId);

  const { error } = await supabaseAdmin
    .from('rota_paradas')
    .delete()
    .eq('id', paradaId)
    .eq('rota_id', rotaId);

  if (error) throw new Error('Falha ao remover parada.');
}
