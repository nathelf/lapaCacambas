import { supabaseAdmin } from '../../lib/supabase';

export class BoletoRepository {
  async getConfiguracaoAtiva(empresaId: string | null) {
    let q = supabaseAdmin
      .from('configuracoes_bancarias_empresa')
      .select('*')
      .eq('ativo', true)
      .limit(1);
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q.maybeSingle();
    if (error) throw error;
    return data;
  }

  async updateConfiguracaoToken(id: number, token: string, expiraEm: string | null) {
    const { error } = await supabaseAdmin
      .from('configuracoes_bancarias_empresa')
      .update({ token_atual: token, token_expira_em: expiraEm })
      .eq('id', id);
    if (error) throw error;
  }

  async getCliente(id: number) {
    const { data, error } = await supabaseAdmin.from('clientes').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  async getPedido(id: number) {
    const { data, error } = await supabaseAdmin.from('pedidos').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  async getFatura(id: number) {
    const { data, error } = await supabaseAdmin.from('faturas').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  async existsBoletoAtivoByRef(ref: { pedidoId?: number | null; faturaId?: number | null }) {
    if (!ref.pedidoId && !ref.faturaId) return false;
    let q = supabaseAdmin
      .from('boletos')
      .select('id', { count: 'exact', head: true })
      .not('status', 'in', '(cancelado,renegociado,erro)');
    if (ref.pedidoId) q = q.eq('pedido_id', ref.pedidoId);
    else if (ref.faturaId) q = q.eq('fatura_id', ref.faturaId);
    const { count, error } = await q;
    if (error) throw error;
    return (count || 0) > 0;
  }

  async createBoleto(payload: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin.from('boletos').insert(payload).select('*').single();
    if (error) throw error;
    return data;
  }

  async getBoleto(id: number) {
    const { data, error } = await supabaseAdmin
      .from('boletos')
      .select('*, clientes(*), pedidos(*), faturas(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async listBoletos(filters: {
    status?: string;
    clienteId?: number;
    pedidoId?: number;
    faturaId?: number;
    limit: number;
    offset: number;
  }) {
    let q = supabaseAdmin
      .from('boletos')
      .select('*, clientes(nome), pedidos(numero), faturas(numero)')
      .order('created_at', { ascending: false })
      .range(filters.offset, filters.offset + filters.limit - 1);
    if (filters.status) q = q.eq('status', filters.status as any);
    if (filters.clienteId) q = q.eq('cliente_id', filters.clienteId);
    if (filters.pedidoId) q = q.eq('pedido_id', filters.pedidoId);
    if (filters.faturaId) q = q.eq('fatura_id', filters.faturaId);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  }

  async getBoletoByExternalId(externalId: string) {
    const { data, error } = await supabaseAdmin
      .from('boletos')
      .select('*')
      .eq('external_id', externalId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async updateBoleto(id: number, payload: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin.from('boletos').update(payload).eq('id', id).select('*').single();
    if (error) throw error;
    return data;
  }

  async updateFaturaByBoleto(boleto: any, statusFatura: 'aberta' | 'paga' | 'vencida' | 'cancelada') {
    if (!boleto.fatura_id) return;
    const payload: any = { status: statusFatura, boleto_id: boleto.id };
    if (statusFatura === 'paga') payload.data_baixa = new Date().toISOString();
    const { error } = await supabaseAdmin.from('faturas').update(payload).eq('id', boleto.fatura_id);
    if (error) throw error;
  }

  async updatePedidoFinanceiroStatus(pedidoId: number | null, status: string) {
    if (!pedidoId) return;
    const { error } = await supabaseAdmin.from('pedidos').update({ financeiro_status: status, tem_boleto: true }).eq('id', pedidoId);
    if (error) throw error;
  }

  async saveBancoLog(payload: Record<string, unknown>) {
    const { error } = await supabaseAdmin.from('banco_integracao_logs').insert(payload);
    if (error) throw error;
  }

  async saveAuditLog(payload: Record<string, unknown>) {
    const { error } = await supabaseAdmin.from('logs_auditoria').insert(payload);
    if (error) throw error;
  }
}

