/**
 * State machine atômica para o ciclo de vida das caçambas.
 *
 * Cada função:
 *  1. Valida o estado atual (falha rápida e clara)
 *  2. Atualiza unidades_cacamba atomicamente (WHERE status = X previne conflito)
 *  3. Atualiza execucoes
 *  4. Registra log imutável em movimentacoes_cacamba
 */

import { supabaseAdmin } from '../../lib/supabase';

export interface MovimentacaoExtra {
  lat?: number;
  lng?: number;
  fotoUrl?: string;
  observacao?: string;
}

// ── helpers ────────────────────────────────────────────────────────────────────

async function registrarMovimentacao(
  unidadeCacambaId: number,
  execucaoId: number | null,
  motoristaId: number | null,
  usuarioId: string,
  tipo: string,
  statusAnterior: string,
  statusNovo: string,
  extra: MovimentacaoExtra,
  tenantId: string,
) {
  await supabaseAdmin.from('movimentacoes_cacamba').insert({
    unidade_cacamba_id: unidadeCacambaId,
    execucao_id:        execucaoId,
    motorista_id:       motoristaId,
    usuario_id:         usuarioId,
    tipo,
    status_anterior:    statusAnterior,
    status_novo:        statusNovo,
    latitude:           extra.lat    ?? null,
    longitude:          extra.lng    ?? null,
    foto_url:           extra.fotoUrl ?? null,
    observacao:         extra.observacao ?? null,
    tenant_id:          tenantId,
  });
}

async function getExecucao(execucaoId: number) {
  const { data, error } = await supabaseAdmin
    .from('execucoes')
    .select('id, status, motorista_id, unidade_cacamba_id, pedido_id, pedidos(tenant_id)')
    .eq('id', execucaoId)
    .single();
  if (error || !data) throw new Error('Execução não encontrada.');
  // tenant_id vem via join em pedidos (execucoes não tem a coluna diretamente)
  const tenant_id: string = (data.pedidos as any)?.tenant_id ?? null;
  return { ...data, tenant_id };
}

// ── 1. RETIRAR DO PÁTIO ────────────────────────────────────────────────────────
// Motorista seleciona a caçamba física e sai para entrega.
// Transição:  unidade: disponivel → em_rota
//             execucao: pendente  → em_rota
// Proteção: WHERE status = 'disponivel' é atômica — previne dupla reserva.

export async function retirarDoPatio(
  execucaoId: number,
  unidadeCacambaId: number,
  usuarioId: string,
  extra: MovimentacaoExtra = {},
) {
  const exec = await getExecucao(execucaoId);

  if (!['pendente', 'em_rota'].includes(exec.status)) {
    throw new Error(`Execução em status '${exec.status}' não pode iniciar retirada.`);
  }

  // Atualização atômica: só sucede se ainda estiver 'disponivel'
  const { data: unidade, error: uErr } = await supabaseAdmin
    .from('unidades_cacamba')
    .update({ status: 'em_rota', updated_at: new Date().toISOString() })
    .eq('id', unidadeCacambaId)
    .eq('status', 'disponivel')     // guarda de conflito
    .select('id, status, patrimonio')
    .single();

  if (uErr || !unidade) {
    throw new Error('Caçamba indisponível ou já reservada por outro motorista. Escolha outra unidade.');
  }

  await supabaseAdmin
    .from('execucoes')
    .update({
      status:             'em_rota',
      unidade_cacamba_id: unidadeCacambaId,
      data_inicio:        new Date().toISOString(),
      latitude:           extra.lat ?? null,
      longitude:          extra.lng ?? null,
      updated_at:         new Date().toISOString(),
    })
    .eq('id', execucaoId);

  await registrarMovimentacao(
    unidadeCacambaId, execucaoId, exec.motorista_id, usuarioId,
    'retirada_patio', 'disponivel', 'em_rota',
    { ...extra, observacao: extra.observacao ?? `Retirada ${unidade.patrimonio} para OS-${execucaoId}` },
    exec.tenant_id,
  );
}

// ── 2. ENTREGAR NO CLIENTE ────────────────────────────────────────────────────
// Motorista confirma que a caçamba foi descarregada na obra.
// Transição:  unidade: em_rota → em_uso
//             execucao: em_rota → no_local (concluída para tipo entrega)

export async function entregarNoCliente(
  execucaoId: number,
  usuarioId: string,
  extra: MovimentacaoExtra = {},
) {
  const exec = await getExecucao(execucaoId);

  if (exec.status !== 'em_rota') {
    throw new Error(`Execução em status '${exec.status}' não pode ser entregue.`);
  }
  if (!exec.unidade_cacamba_id) {
    throw new Error('Nenhuma caçamba vinculada a esta OS. Confirme a retirada no pátio primeiro.');
  }

  await supabaseAdmin
    .from('unidades_cacamba')
    .update({
      status:          'em_uso',
      pedido_atual_id: exec.pedido_id,
      updated_at:      new Date().toISOString(),
    })
    .eq('id', exec.unidade_cacamba_id);

  await supabaseAdmin
    .from('execucoes')
    .update({
      status:        'no_local',
      evidencia_url: extra.fotoUrl  ?? null,
      latitude:      extra.lat      ?? null,
      longitude:     extra.lng      ?? null,
      updated_at:    new Date().toISOString(),
    })
    .eq('id', execucaoId);

  await registrarMovimentacao(
    exec.unidade_cacamba_id, execucaoId, exec.motorista_id, usuarioId,
    'entrega_cliente', 'em_rota', 'em_uso', extra,
    exec.tenant_id,
  );
}

// ── 3. COLETAR DO CLIENTE ─────────────────────────────────────────────────────
// Motorista chegou na obra para recolher a caçamba cheia.
// Transição:  unidade: em_uso → em_rota
//             execucao: pendente|no_local → em_rota

export async function coletarDoCliente(
  execucaoId: number,
  usuarioId: string,
  extra: MovimentacaoExtra = {},
) {
  const exec = await getExecucao(execucaoId);

  if (!['pendente', 'em_rota', 'no_local'].includes(exec.status)) {
    throw new Error(`Execução em status '${exec.status}' não pode iniciar coleta.`);
  }

  // Para OS de coleta, a unidade pode já estar vinculada (via pedido) ou
  // ser informada nesta etapa via extra.unidadeCacambaId (tratado pelo controller).
  const unidadeId = exec.unidade_cacamba_id;
  if (!unidadeId) {
    throw new Error('Nenhuma caçamba vinculada a esta OS de coleta.');
  }

  await supabaseAdmin
    .from('unidades_cacamba')
    .update({ status: 'em_rota', updated_at: new Date().toISOString() })
    .eq('id', unidadeId)
    .in('status', ['em_uso', 'em_rota']);

  await supabaseAdmin
    .from('execucoes')
    .update({
      status:    'em_rota',
      latitude:  extra.lat ?? null,
      longitude: extra.lng ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', execucaoId);

  await registrarMovimentacao(
    unidadeId, execucaoId, exec.motorista_id, usuarioId,
    'coleta_cliente', 'em_uso', 'em_rota', extra,
    exec.tenant_id,
  );
}

// ── 4. CHEGOU NO PÁTIO ────────────────────────────────────────────────────────
// Motorista descarregou na usina/pátio. Ciclo completo.
// Transição:  unidade: em_rota → disponivel
//             execucao: em_rota → concluida

export async function chegarNoPatio(
  execucaoId: number,
  usuarioId: string,
  extra: MovimentacaoExtra = {},
) {
  const exec = await getExecucao(execucaoId);

  if (exec.status !== 'em_rota') {
    throw new Error(`Execução em status '${exec.status}' não pode finalizar no pátio.`);
  }
  if (!exec.unidade_cacamba_id) {
    throw new Error('Nenhuma caçamba vinculada a esta OS.');
  }

  await supabaseAdmin
    .from('unidades_cacamba')
    .update({
      status:          'disponivel',
      pedido_atual_id: null,
      cliente_atual:   null,
      updated_at:      new Date().toISOString(),
    })
    .eq('id', exec.unidade_cacamba_id);

  await supabaseAdmin
    .from('execucoes')
    .update({
      status:    'concluida',
      data_fim:  new Date().toISOString(),
      latitude:  extra.lat ?? null,
      longitude: extra.lng ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', execucaoId);

  await registrarMovimentacao(
    exec.unidade_cacamba_id, execucaoId, exec.motorista_id, usuarioId,
    'chegada_patio', 'em_rota', 'disponivel', extra,
    exec.tenant_id,
  );
}

// ── 5. ENTRAR EM MANUTENÇÃO ───────────────────────────────────────────────────

export async function entrarManutencao(
  unidadeCacambaId: number,
  usuarioId: string,
  tenantId: string,
  observacao?: string,
) {
  const { data: u } = await supabaseAdmin
    .from('unidades_cacamba')
    .select('status')
    .eq('id', unidadeCacambaId)
    .single();

  const anterior = u?.status ?? 'disponivel';

  await supabaseAdmin
    .from('unidades_cacamba')
    .update({ status: 'manutencao', updated_at: new Date().toISOString() })
    .eq('id', unidadeCacambaId)
    .neq('status', 'em_rota');

  await registrarMovimentacao(
    unidadeCacambaId, null, null, usuarioId,
    'entrada_manutencao', anterior, 'manutencao',
    { observacao }, tenantId,
  );
}

// ── 6. SAIR DE MANUTENÇÃO ─────────────────────────────────────────────────────

export async function sairManutencao(
  unidadeCacambaId: number,
  usuarioId: string,
  tenantId: string,
) {
  await supabaseAdmin
    .from('unidades_cacamba')
    .update({ status: 'disponivel', updated_at: new Date().toISOString() })
    .eq('id', unidadeCacambaId)
    .eq('status', 'manutencao');

  await registrarMovimentacao(
    unidadeCacambaId, null, null, usuarioId,
    'saida_manutencao', 'manutencao', 'disponivel',
    {}, tenantId,
  );
}

// ── 7. BUSCAR TIMELINE ────────────────────────────────────────────────────────

export async function buscarTimeline(execucaoId: number) {
  const { data, error } = await supabaseAdmin
    .from('movimentacoes_cacamba')
    .select(`
      id, tipo, status_anterior, status_novo,
      latitude, longitude, foto_url, observacao, created_at,
      motoristas(nome),
      unidades_cacamba(patrimonio)
    `)
    .eq('execucao_id', execucaoId)
    .order('created_at', { ascending: true });

  if (error) throw new Error('Falha ao buscar timeline.');
  return (data ?? []).map((m: any) => ({
    id:              m.id,
    tipo:            m.tipo,
    statusAnterior:  m.status_anterior,
    statusNovo:      m.status_novo,
    patrimonio:      m.unidades_cacamba?.patrimonio ?? null,
    motoristaNome:   m.motoristas?.nome ?? null,
    latitude:        m.latitude,
    longitude:       m.longitude,
    fotoUrl:         m.foto_url,
    observacao:      m.observacao,
    createdAt:       m.created_at,
  }));
}

// ── 8b. TIMELINE DE UMA UNIDADE FÍSICA ───────────────────────────────────────

export async function buscarTimelineUnidade(unidadeCacambaId: number) {
  const { data, error } = await supabaseAdmin
    .from('movimentacoes_cacamba')
    .select(`
      id, tipo, status_anterior, status_novo,
      latitude, longitude, foto_url, observacao, created_at,
      motoristas(nome),
      execucoes(pedido_id, pedidos(numero, clientes(nome)))
    `)
    .eq('unidade_cacamba_id', unidadeCacambaId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error('Falha ao buscar timeline da unidade.');
  return (data ?? []).map((m: any) => ({
    id:             m.id,
    tipo:           m.tipo,
    statusAnterior: m.status_anterior,
    statusNovo:     m.status_novo,
    motoristaNome:  m.motoristas?.nome ?? null,
    pedidoNumero:   m.execucoes?.pedidos?.numero ?? null,
    clienteNome:    m.execucoes?.pedidos?.clientes?.nome ?? null,
    latitude:       m.latitude,
    longitude:      m.longitude,
    fotoUrl:        m.foto_url,
    observacao:     m.observacao,
    createdAt:      m.created_at,
  }));
}

// ── 8c. HISTÓRICO DO MOTORISTA HOJE ──────────────────────────────────────────

export async function historicoDoMotoristaHoje(userId: string) {
  const { data: motorista } = await supabaseAdmin
    .from('motoristas').select('id').eq('user_id', userId).single();

  if (!motorista) throw new Error('Perfil de motorista não encontrado.');

  const hoje = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabaseAdmin
    .from('movimentacoes_cacamba')
    .select(`
      id, tipo, status_novo, latitude, longitude, foto_url, observacao, created_at,
      unidades_cacamba(patrimonio)
    `)
    .eq('motorista_id', motorista.id)
    .gte('created_at', `${hoje}T00:00:00Z`)
    .lte('created_at', `${hoje}T23:59:59Z`)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Falha ao buscar histórico do dia.');
  return (data ?? []).map((m: any) => ({
    id:         m.id,
    tipo:       m.tipo,
    statusNovo: m.status_novo,
    patrimonio: m.unidades_cacamba?.patrimonio ?? null,
    latitude:   m.latitude,
    longitude:  m.longitude,
    fotoUrl:    m.foto_url,
    observacao: m.observacao,
    createdAt:  m.created_at,
  }));
}

// ── 9b. FROTA ENRIQUECIDA (admin) ─────────────────────────────────────────────

export async function listarFrota() {
  const { data: unidades, error } = await supabaseAdmin
    .from('unidades_cacamba')
    .select(`
      id, patrimonio, status, cliente_atual, observacao, updated_at,
      cacambas(descricao, capacidade)
    `)
    .order('patrimonio');

  if (error) throw new Error('Falha ao listar frota.');

  // Para cada unidade, busca última movimentação com coordenadas
  const ids = (unidades ?? []).map((u: any) => u.id);
  const { data: movs } = await supabaseAdmin
    .from('movimentacoes_cacamba')
    .select('unidade_cacamba_id, latitude, longitude, observacao, created_at')
    .in('unidade_cacamba_id', ids)
    .not('latitude', 'is', null)
    .order('created_at', { ascending: false });

  // Agrega: última coordenada por unidade
  const lastCoord: Record<number, { lat: number; lng: number; obs: string | null }> = {};
  for (const m of (movs ?? []) as any[]) {
    if (!lastCoord[m.unidade_cacamba_id]) {
      lastCoord[m.unidade_cacamba_id] = {
        lat: m.latitude, lng: m.longitude, obs: m.observacao,
      };
    }
  }

  return (unidades ?? []).map((u: any) => ({
    id:                u.id,
    codigo_patrimonio: u.patrimonio,
    status:            u.status,
    ultima_atualizacao: u.updated_at,
    cliente_atual:     u.cliente_atual ?? null,
    endereco_atual:    lastCoord[u.id]?.obs ?? null,
    lat:               lastCoord[u.id]?.lat ?? null,
    lng:               lastCoord[u.id]?.lng ?? null,
    tipo: u.cacambas ? {
      descricao:     u.cacambas.descricao,
      capacidade_m3: parseFloat(u.cacambas.capacidade ?? '0') || 0,
    } : null,
    cliente: u.cliente_atual ? { nome: u.cliente_atual } : null,
    obra:    null,
  }));
}

// ── 8. OS DO MOTORISTA (hoje) ─────────────────────────────────────────────────

export type MinhasOsResult = {
  motoristaId: number | null;
  data: unknown[];
  /** true quando o usuário tem papel motorista mas não há linha em `motoristas.user_id` */
  vinculoPendente: boolean;
  /** Dados agregados para o topo do app (primeira OS com veículo ou nome do motorista) */
  cabecalho?: {
    motoristaNome: string | null;
    veiculo: { placa: string; modelo: string; marca: string | null } | null;
  };
};

function inicioDiaAmericaSaoPauloIso(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  return `${y}-${m}-${d}T00:00:00-03:00`;
}

export async function minhasOsHoje(userId: string): Promise<MinhasOsResult> {
  const { data: motorista, error: motoErr } = await supabaseAdmin
    .from('motoristas')
    .select('id, nome')
    .eq('user_id', userId)
    .maybeSingle();

  if (motoErr) throw new Error('Falha ao resolver cadastro de motorista.');

  if (!motorista) {
    return { motoristaId: null, data: [], vinculoPendente: true };
  }

  const motoRow = motorista as { id: number; nome: string };

  const { data, error } = await supabaseAdmin
    .from('execucoes')
    .select(`
      id, tipo, status, data_inicio, data_fim, veiculo_id,
      unidade_cacamba_id,
      unidades_cacamba:unidade_cacamba_id(patrimonio, status),
      veiculos:veiculo_id(placa, modelo, marca),
      motoristas:motorista_id(nome),
      pedidos(
        numero, tipo, data_programada, hora_programada, observacao,
        clientes(nome, telefone, celular),
        obras(nome, endereco, numero, bairro, cidade),
        enderecos_entrega:enderecos_entrega(endereco, numero, bairro, cidade)
      )
    `)
    .eq('motorista_id', motoRow.id)
    .not('status', 'in', '("concluida","cancelada")')
    .order('created_at', { ascending: true });

  if (error) throw new Error('Falha ao buscar OS do motorista.');

  const rows = data ?? [];
  let veiculo: { placa: string; modelo: string; marca: string | null } | null = null;
  for (const row of rows as any[]) {
    const v = row.veiculos;
    if (v?.placa) {
      veiculo = { placa: v.placa, modelo: v.modelo ?? '', marca: v.marca ?? null };
      break;
    }
  }

  const cabecalho = {
    motoristaNome: motoRow.nome ?? (rows[0] as any)?.motoristas?.nome ?? null,
    veiculo,
  };

  return { motoristaId: motoRow.id, data: rows, vinculoPendente: false, cabecalho };
}

export type HistoricoDiaItem = {
  id: number;
  tipo: string;
  tipoLabel: string;
  horario: string;
  patrimonio: string | null;
  placaVeiculo: string | null;
  modeloVeiculo: string | null;
  motoristaNome: string | null;
  latitude: number | null;
  longitude: number | null;
  observacao: string | null;
};

const TIPO_MOV_LABEL: Record<string, string> = {
  retirada_patio:   'Retirada no pátio',
  entrega_cliente:  'Entrega no cliente',
  coleta_cliente:   'Coleta no cliente',
  chegada_patio:    'Chegada no pátio',
  entrada_manutencao: 'Entrada em manutenção',
  saida_manutencao: 'Saída de manutenção',
};

export async function historicoDiaMotorista(userId: string): Promise<HistoricoDiaItem[]> {
  const { data: motorista, error: motoErr } = await supabaseAdmin
    .from('motoristas')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (motoErr || !motorista) return [];

  const mid = (motorista as { id: number }).id;
  const inicio = inicioDiaAmericaSaoPauloIso();

  const { data, error } = await supabaseAdmin
    .from('movimentacoes_cacamba')
    .select(`
      id, tipo, latitude, longitude, observacao, created_at,
      unidades_cacamba(patrimonio),
      motoristas(nome),
      execucoes(id, veiculos:veiculo_id(placa, modelo))
    `)
    .eq('motorista_id', mid)
    .gte('created_at', inicio)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Falha ao buscar histórico do dia.');

  return (data ?? []).map((m: any) => ({
    id: m.id,
    tipo: m.tipo,
    tipoLabel: TIPO_MOV_LABEL[m.tipo] ?? m.tipo,
    horario: m.created_at,
    patrimonio: m.unidades_cacamba?.patrimonio ?? null,
    placaVeiculo: m.execucoes?.veiculos?.placa ?? null,
    modeloVeiculo: m.execucoes?.veiculos?.modelo ?? null,
    motoristaNome: m.motoristas?.nome ?? null,
    latitude: m.latitude ?? null,
    longitude: m.longitude ?? null,
    observacao: m.observacao ?? null,
  }));
}

// ── 9. UNIDADES DISPONÍVEIS ───────────────────────────────────────────────────

export async function listarUnidadesDisponiveis(_tenantId: string) {
  const { data, error } = await supabaseAdmin
    .from('unidades_cacamba')
    .select('id, patrimonio, status, observacao, cacambas(descricao, capacidade)')
    .eq('status', 'disponivel')
    .order('patrimonio');

  if (error) throw new Error('Falha ao listar unidades disponíveis.');
  return data ?? [];
}
