import { supabase } from '@/integrations/supabase/client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3333';

async function backendRequest<T = any>(path: string, init?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sessão inválida para chamada ao backend.');
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...(init?.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as any)?.message || `Erro backend (${res.status})`);
  return json as T;
}

// ===== AUDIT LOG =====
export async function logAuditoria(acao: string, entidade: string, entidadeId?: number, dadosAnteriores?: any, dadosNovos?: any) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('logs_auditoria').insert({
    usuario_id: user?.id,
    acao,
    entidade,
    entidade_id: entidadeId,
    dados_anteriores: dadosAnteriores,
    dados_novos: dadosNovos,
  } as any);
}

// ===== CLIENTES =====
export async function fetchClientes(search?: string, page = 1, limit = 20) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('clientes')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('nome')
    .range(from, to);

  if (search) query = query.or(`nome.ilike.%${search}%,fantasia.ilike.%${search}%,cpf.ilike.%${search}%,cnpj.ilike.%${search}%`);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0 };
}

export async function fetchCliente(id: number) {
  const { data, error } = await supabase.from('clientes').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createCliente(cliente: any) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('clientes').insert({ ...cliente, created_by: user?.id } as any).select().single();
  if (error) throw error;
  await logAuditoria('criacao', 'clientes', data.id, null, data);
  return data;
}

export async function updateCliente(id: number, cliente: any) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: old } = await supabase.from('clientes').select('*').eq('id', id).single();
  const { data, error } = await supabase.from('clientes').update({ ...cliente, updated_by: user?.id } as any).eq('id', id).select().single();
  if (error) throw error;
  await logAuditoria('edicao', 'clientes', id, old, data);
  return data;
}

// ===== CONTATOS =====
export async function fetchContatos(clienteId: number) {
  const { data, error } = await supabase.from('contatos_cliente').select('*').eq('cliente_id', clienteId).order('nome');
  if (error) throw error;
  return data;
}

export async function createContato(contato: any) {
  const { data, error } = await supabase.from('contatos_cliente').insert(contato as any).select().single();
  if (error) throw error;
  return data;
}

// ===== OBRAS =====
export async function fetchObras(clienteId?: number) {
  let query = supabase.from('obras').select('*').is('deleted_at', null).order('nome');
  if (clienteId) query = query.eq('cliente_id', clienteId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createObra(obra: any) {
  const { data, error } = await supabase.from('obras').insert(obra as any).select().single();
  if (error) throw error;
  return data;
}

// ===== ENDERECOS ENTREGA =====
export async function fetchEnderecosEntrega(clienteId: number) {
  const { data, error } = await supabase.from('enderecos_entrega').select('*').eq('cliente_id', clienteId);
  if (error) throw error;
  return data;
}

export async function createEnderecoEntrega(endereco: any) {
  const { data, error } = await supabase.from('enderecos_entrega').insert(endereco as any).select().single();
  if (error) throw error;
  return data;
}

// ===== CACAMBAS =====
export async function fetchCacambas() {
  const { data, error } = await supabase.from('cacambas').select('*').eq('ativo', true).order('descricao');
  if (error) throw error;
  return data;
}

// ===== SERVICOS =====
export async function fetchServicos() {
  const { data, error } = await supabase.from('servicos').select('*').eq('ativo', true).order('descricao');
  if (error) throw error;
  return data;
}

export async function fetchServicosAll() {
  return backendRequest<any[]>('/api/servicos');
}

export async function createServico(dto: { descricao: string; codigoFiscal?: string; aliquota?: number }) {
  return backendRequest<any>('/api/servicos', { method: 'POST', body: JSON.stringify(dto) });
}

export async function updateServico(id: number, dto: { descricao?: string; codigoFiscal?: string; aliquota?: number; ativo?: boolean }) {
  return backendRequest<any>(`/api/servicos/${id}`, { method: 'PUT', body: JSON.stringify(dto) });
}

export async function toggleServico(id: number) {
  return backendRequest<any>(`/api/servicos/${id}/toggle`, { method: 'PATCH' });
}

// ===== MOTORISTAS =====
export async function fetchMotoristas() {
  const { data, error } = await supabase.from('motoristas').select('*').eq('status', 'ativo').order('nome');
  if (error) throw error;
  return data;
}

export async function fetchMotoristasAll() {
  const { data, error } = await supabase.from('motoristas').select('*').order('nome');
  if (error) throw error;
  return data;
}

// ===== VEICULOS =====
export async function fetchVeiculos() {
  const { data, error } = await supabase.from('veiculos').select('*').in('status', ['disponivel', 'em_operacao']).order('placa');
  if (error) throw error;
  return data;
}

export async function fetchVeiculosAll() {
  const { data, error } = await supabase.from('veiculos').select('*').order('placa');
  if (error) throw error;
  return data;
}

// ===== PEDIDOS =====
export async function fetchPedidos(filters?: { status?: string; clienteId?: number; search?: string }) {
  let query = supabase.from('pedidos').select('*, clientes!inner(nome, fantasia)').is('deleted_at', null).order('created_at', { ascending: false });
  if (filters?.status)    query = query.eq('status', filters.status as any);
  if (filters?.clienteId) query = query.eq('cliente_id', filters.clienteId);
  if (filters?.search)    query = query.or(`numero.ilike.%${filters.search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchPedido(id: number) {
  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      *,
      clientes(nome, fantasia, cpf, cnpj, inscricao_municipal, inscricao_estadual,
               endereco, numero, complemento, bairro, cidade, estado, cep, email, telefone),
      enderecos_entrega(endereco, numero, bairro, cidade, estado, cep, contato, referencia),
      cacambas(descricao, capacidade),
      servicos(descricao, codigo_fiscal, aliquota),
      motoristas_colocacao:motoristas!motorista_colocacao_id(id, nome),
      veiculos_colocacao:veiculos!veiculo_colocacao_id(id, placa, modelo)
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  const [faturaVinc, boletosVinc] = await Promise.all([
    supabase
      .from('fatura_pedidos')
      .select('fatura_id, valor, faturas(id, numero, status, valor_total, data_vencimento)')
      .eq('pedido_id', id),
    (supabase as any)
      .from('boletos')
      .select('id, status, valor, data_vencimento, linha_digitavel, fatura_id, nosso_numero')
      .eq('pedido_id', id)
      .order('created_at', { ascending: false }),
  ]);
  return {
    ...data,
    faturas_vinculadas: faturaVinc.data || [],
    boletos_vinculados: boletosVinc.data || [],
  };
}

export async function createPedido(pedido: any) {
  return backendRequest<any>('/api/pedidos', {
    method: 'POST',
    body: JSON.stringify(pedido),
  });
}

export async function updatePedidoStatus(id: number, statusNovo: string, observacao?: string, extraFields?: any) {
  return backendRequest<any>(`/api/pedidos/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: statusNovo, motivo: observacao, ...extraFields }),
  });
}

export async function fetchPedidoHistorico(pedidoId: number) {
  const { data, error } = await supabase
    .from('pedido_historico')
    .select('*, profiles:usuario_id(nome)')
    .eq('pedido_id', pedidoId)
    .order('created_at');
  if (error) throw error;
  return data;
}

// ===== FATURAS =====
export async function fetchFaturas(filters?: { status?: string; clienteId?: number }) {
  let query = supabase.from('faturas').select('*, clientes(nome)').order('created_at', { ascending: false });
  if (filters?.status) query = query.eq('status', filters.status as any);
  if (filters?.clienteId) query = query.eq('cliente_id', filters.clienteId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createFatura(fatura: any, pedidoIds: number[]) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!pedidoIds.length) throw new Error('Selecione ao menos um pedido para faturar.');
  const { data: pedidos, error: pedErr } = await (supabase as any)
    .from('pedidos')
    .select('id, numero, status, faturavel, valor_total')
    .in('id', pedidoIds);
  if (pedErr) throw pedErr;
  const invalidos = (pedidos || []).filter((p: any) => p.status === 'cancelado' || (!['concluido', 'faturado'].includes(p.status) && !p.faturavel));
  if (invalidos.length) {
    throw new Error(`Pedidos não faturáveis/cancelados: ${invalidos.map((p: any) => p.numero).join(', ')}`);
  }

  const { data, error } = await supabase.from('faturas').insert({ ...fatura, created_by: user?.id } as any).select().single();
  if (error) throw error;

  if (pedidoIds.length > 0) {
    const vincs = pedidoIds.map(pid => ({
      fatura_id: data.id,
      pedido_id: pid,
      valor: Number((pedidos || []).find((p: any) => p.id === pid)?.valor_total || 0),
    }));
    await supabase.from('fatura_pedidos').insert(vincs as any);
    for (const pid of pedidoIds) {
      await supabase.from('pedidos').update({
        fatura_id: data.id,
        financeiro_status: 'faturado',
      } as any).eq('id', pid);
      await updatePedidoStatus(pid, 'faturado', `Faturado na fatura ${data.numero || data.id}`);
    }
  }

  await logAuditoria('criacao', 'faturas', data.id, null, data);
  return data;
}

// ===== NOTAS FISCAIS =====
export async function fetchNotasFiscais(filters?: { status?: string; search?: string }) {
  let query = supabase
    .from('notas_fiscais')
    .select('*, clientes(nome), nota_fiscal_pedidos(pedido_id, pedidos(numero))')
    .order('created_at', { ascending: false });
  if (filters?.status) query = query.eq('status', filters.status as any);
  if (filters?.search) query = query.or(`numero.ilike.%${filters.search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createNotaFiscal(nota: any, pedidoIds: number[]) {
  const result = await backendRequest<any>('/api/fiscal/emitir', {
    method: 'POST',
    body: JSON.stringify({
      pedidoIds,
      faturaId: nota?.fatura_id ?? null,
      forcarEmissao: false,
      observacoesFiscais: nota?.observacao_fiscal || null,
    }),
  });
  if (!result?.ok) {
    const errs = (result?.validation?.erros || []).map((e: any) => e.message).join('; ');
    throw new Error(errs || 'Pedido não apto para emissão fiscal.');
  }
  const notaEmitida = result?.nota;
  if (!notaEmitida?.id) throw new Error('Backend fiscal não retornou nota emitida.');
  await logAuditoria('emissao_nf_backend', 'notas_fiscais', notaEmitida.id, null, notaEmitida);
  return notaEmitida;
}

export async function cancelarNotaFiscal(id: number) {
  const data = await backendRequest<any>(`/api/fiscal/notas/${id}/cancelar`, {
    method: 'POST',
    body: JSON.stringify({ reason: 'Cancelamento solicitado pelo usuário' }),
  });
  await supabase.from('pedidos').update({
    status_fiscal: 'nao_emitida',
    nota_fiscal_status: 'cancelada',
    tem_nota_fiscal: false,
    nota_fiscal_id: null,
  } as any).eq('nota_fiscal_id', id);
  await logAuditoria('cancelamento_nf_backend', 'notas_fiscais', id, null, data);
  return data;
}

// ===== BOLETOS =====
export async function fetchBoletos(filters?: { status?: string; clienteId?: number }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.clienteId) params.set('clienteId', String(filters.clienteId));
  return backendRequest<any[]>(`/api/boletos${params.toString() ? `?${params.toString()}` : ''}`);
}

export async function createBoleto(boleto: any) {
  const created = await backendRequest<any>('/api/boletos', {
    method: 'POST',
    body: JSON.stringify({
      cliente_id: Number(boleto.cliente_id),
      pedido_id: boleto.pedido_id ? Number(boleto.pedido_id) : null,
      fatura_id: boleto.fatura_id ? Number(boleto.fatura_id) : null,
      banco: boleto.banco || null,
      valor: Number(boleto.valor),
      data_vencimento: boleto.data_vencimento,
      descricao: boleto.descricao || null,
      valor_multa: Number(boleto.valor_multa || 0),
      valor_juros: Number(boleto.valor_juros || 0),
      observacao: boleto.observacao || null,
    }),
  });

  if (!created?.ok || !created?.boleto?.id) {
    const errs = (created?.validation?.erros || []).map((e: any) => e.message).join('; ');
    throw new Error(errs || 'Falha ao criar boleto.');
  }

  const emitted = await backendRequest<any>(`/api/boletos/${created.boleto.id}/emitir`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!emitted?.ok) throw new Error(emitted?.message || 'Falha na emissão do boleto.');
  await logAuditoria('emissao_boleto_backend', 'boletos', emitted?.boleto?.id, null, emitted?.boleto);
  return emitted?.boleto;
}

export async function updateBoletoStatus(id: number, status: string, extraFields?: any) {
  if (status === 'cancelado') {
    const data = await backendRequest<any>(`/api/boletos/${id}/cancelar`, {
      method: 'POST',
      body: JSON.stringify({ reason: extraFields?.reason || 'Cancelamento solicitado no sistema' }),
    });
    await logAuditoria('cancelamento_boleto_backend', 'boletos', id, null, { status });
    return data;
  }
  const data = await backendRequest<any>(`/api/boletos/${id}/status`, { method: 'GET' });
  await logAuditoria('consulta_status_boleto_backend', 'boletos', id, null, { status });
  return data;
}

// Verificar se já existe boleto ativo para uma fatura
export async function checkBoletoDuplicado(faturaId?: number, pedidoId?: number): Promise<boolean> {
  if (!faturaId && !pedidoId) return false;
  const params = new URLSearchParams();
  params.set('limit', '20');
  if (faturaId) params.set('faturaId', String(faturaId));
  if (pedidoId) params.set('pedidoId', String(pedidoId));
  const list = await backendRequest<any[]>(`/api/boletos?${params.toString()}`);
  return list.some((b: any) => !['cancelado', 'renegociado', 'erro'].includes(String(b.status || '')));
}

// ===== FORNECEDORES =====
export async function fetchFornecedores(search?: string) {
  let query = supabase.from('fornecedores').select('*').is('deleted_at', null).order('nome');
  if (search) query = query.ilike('nome', `%${search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// ===== MATERIAIS =====
export async function fetchMateriais() {
  const { data, error } = await supabase.from('materiais').select('*').order('descricao');
  if (error) throw error;
  return data;
}

// ===== UNIDADES CACAMBA =====
export async function fetchUnidadesCacamba() {
  const { data, error } = await supabase
    .from('unidades_cacamba')
    .select('*, cacambas(descricao)')
    .order('patrimonio');
  if (error) throw error;
  return data;
}

// ===== CONTAS A PAGAR =====
export async function fetchContasPagar(filters?: { status?: string }) {
  let query = supabase.from('contas_pagar').select('*').order('data_vencimento');
  if (filters?.status) query = query.eq('status', filters.status as any);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// ===== DASHBOARD STATS =====
export async function fetchDashboardStats() {
  const today = new Date().toISOString().split('T')[0];
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [pedidosHoje, programados, emRota, concluidos, cacambasTotal, cacambasCampo, faturasVencidas] = await Promise.all([
    supabase.from('pedidos').select('id', { count: 'exact', head: true }).eq('data_pedido', today).is('deleted_at', null),
    supabase.from('pedidos').select('id', { count: 'exact', head: true }).eq('status', 'programado').is('deleted_at', null),
    supabase.from('pedidos').select('id', { count: 'exact', head: true }).eq('status', 'em_rota').is('deleted_at', null),
    supabase.from('pedidos').select('id', { count: 'exact', head: true }).eq('status', 'concluido').gte('data_pedido', startOfMonth).is('deleted_at', null),
    supabase.from('unidades_cacamba').select('id', { count: 'exact', head: true }),
    supabase.from('unidades_cacamba').select('id', { count: 'exact', head: true }).eq('status', 'em_uso'),
    supabase.from('faturas').select('id', { count: 'exact', head: true }).eq('status', 'vencida'),
  ]);

  return {
    pedidosHoje: pedidosHoje.count || 0,
    programados: programados.count || 0,
    emRota: emRota.count || 0,
    concluidos: concluidos.count || 0,
    cacambasTotal: cacambasTotal.count || 0,
    cacambasCampo: cacambasCampo.count || 0,
    faturasVencidas: faturasVencidas.count || 0,
  };
}

// ===== RELATÓRIOS =====

export interface FiltrosRelatorio {
  dataInicio?: string;
  dataFim?: string;
  clienteId?: number;
  status?: string;
  statusFiscal?: string;
}

export async function fetchRelatorioOperacional(filtros: FiltrosRelatorio) {
  let query = supabase
    .from('pedidos')
    .select(`
      id, numero, status, tipo, tipo_locacao, quantidade, valor_total,
      data_pedido, data_retirada_prevista, observacao,
      clientes(nome, fantasia),
      enderecos_entrega(endereco, numero, bairro, cidade, estado),
      cacambas(descricao),
      servicos(descricao),
      motoristas_colocacao:motoristas!motorista_colocacao_id(nome),
      veiculos_colocacao:veiculos!veiculo_colocacao_id(placa, modelo)
    `)
    .is('deleted_at', null)
    .order('data_pedido', { ascending: false });

  if (filtros.dataInicio) query = query.gte('data_pedido', filtros.dataInicio);
  if (filtros.dataFim)    query = query.lte('data_pedido', filtros.dataFim);
  if (filtros.clienteId)  query = query.eq('cliente_id', filtros.clienteId);
  if (filtros.status)     query = query.eq('status', filtros.status as any);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchRelatorioFinanceiro(filtros: FiltrosRelatorio) {
  let query = supabase
    .from('faturas')
    .select(`
      id, numero, status, forma_cobranca,
      data_emissao, data_vencimento, data_baixa,
      valor_bruto, valor_desconto, valor_juros, valor_multa, valor_liquido, valor_baixa,
      observacao,
      clientes(nome, fantasia)
    `)
    .order('data_emissao', { ascending: false });

  if (filtros.dataInicio) query = query.gte('data_emissao', filtros.dataInicio);
  if (filtros.dataFim)    query = query.lte('data_emissao', filtros.dataFim);
  if (filtros.clienteId)  query = query.eq('cliente_id', filtros.clienteId);
  if (filtros.status)     query = query.eq('status', filtros.status as any);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchRelatorioBoletosEmitidos(filtros: FiltrosRelatorio) {
  let query = supabase
    .from('boletos')
    .select(`
      id, nosso_numero, numero_documento, banco,
      data_emissao, data_vencimento, data_pagamento,
      valor, valor_multa, valor_juros, valor_pago,
      status, linha_digitavel, observacao,
      clientes(nome),
      faturas(numero),
      pedidos(numero)
    `)
    .order('data_emissao', { ascending: false });

  if (filtros.dataInicio) query = query.gte('data_emissao', filtros.dataInicio);
  if (filtros.dataFim)    query = query.lte('data_emissao', filtros.dataFim);
  if (filtros.clienteId)  query = query.eq('cliente_id', filtros.clienteId);
  if (filtros.status)     query = query.eq('status', filtros.status as any);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchRelatorioInadimplencia(filtros: FiltrosRelatorio) {
  const hoje = new Date().toISOString().split('T')[0];
  let query = supabase
    .from('faturas')
    .select(`
      id, numero, status, data_vencimento, valor_liquido,
      clientes(id, nome, fantasia, telefone, celular, email)
    `)
    .in('status', ['aberta', 'vencida', 'protesto'])
    .lte('data_vencimento', hoje)
    .order('data_vencimento');

  if (filtros.clienteId) query = query.eq('cliente_id', filtros.clienteId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
