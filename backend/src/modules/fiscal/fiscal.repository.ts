import { supabaseAdmin } from '../../lib/supabase';

export class FiscalRepository {
  async getPedidosByIds(ids: number[]) {
    const { data, error } = await supabaseAdmin
      .from('pedidos')
      .select(`
        *,
        clientes(*),
        servicos(id, descricao, codigo_fiscal, aliquota)
      `)
      .in('id', ids);
    if (error) throw error;
    return data ?? [];
  }

  async getFaturaById(id: number) {
    const { data, error } = await supabaseAdmin.from('faturas').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  async getConfiguracaoFiscalAtiva(empresaId: string | null) {
    let query = supabaseAdmin
      .from('configuracoes_fiscais_empresa')
      .select('*')
      .eq('ativo', true)
      .limit(1);
    if (empresaId) query = query.eq('empresa_id', empresaId);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  }

  async findNotaByIdempotencyKey(idempotencyKey: string) {
    const { data, error } = await supabaseAdmin
      .from('notas_fiscais')
      .select('*')
      .eq('external_id', idempotencyKey)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async createNotaFiscal(payload: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin.from('notas_fiscais').insert(payload).select('*').single();
    if (error) throw error;
    return data;
  }

  async linkNotaPedidos(notaFiscalId: number, pedidoIds: number[], valorTotal: number) {
    const valorPorPedido = pedidoIds.length > 0 ? valorTotal / pedidoIds.length : 0;
    const rows = pedidoIds.map((pedidoId) => ({
      nota_fiscal_id: notaFiscalId,
      pedido_id: pedidoId,
      valor: valorPorPedido,
      valor_vinculado: valorPorPedido,
    }));
    const { error } = await supabaseAdmin.from('nota_fiscal_pedidos').insert(rows);
    if (error) throw error;
  }

  async updatePedidosAposEmissao(pedidoIds: number[], notaFiscalId: number, status: string) {
    const { error } = await supabaseAdmin
      .from('pedidos')
      .update({
        nota_fiscal_id: notaFiscalId,
        status_fiscal: status,
        nota_fiscal_status: status,
        tem_nota_fiscal: status === 'emitida',
      })
      .in('id', pedidoIds);
    if (error) throw error;
  }

  async updateFaturaNota(faturaId: number, notaFiscalId: number | null) {
    const { error } = await supabaseAdmin.from('faturas').update({ nota_fiscal_id: notaFiscalId }).eq('id', faturaId);
    if (error) throw error;
  }

  async saveFiscalLog(payload: Record<string, unknown>) {
    const { error } = await supabaseAdmin.from('fiscal_integracao_logs').insert(payload);
    if (error) throw error;
  }

  async saveAuditLog(payload: Record<string, unknown>) {
    const { error } = await supabaseAdmin.from('logs_auditoria').insert(payload);
    if (error) throw error;
  }

  async updateConfiguracaoFiscalToken(id: number, tokenAtual: string, tokenExpiraEm: string | null) {
    const { error } = await supabaseAdmin
      .from('configuracoes_fiscais_empresa')
      .update({ token_atual: tokenAtual, token_expira_em: tokenExpiraEm })
      .eq('id', id);
    if (error) throw error;
  }

  async listNotas(filters: {
    status?: string;
    clienteId?: number;
    pedidoId?: number;
    faturaId?: number;
    limit: number;
    offset: number;
  }) {
    let query = supabaseAdmin
      .from('notas_fiscais')
      .select('*, clientes(id, nome), nota_fiscal_pedidos(pedido_id, pedidos(numero))')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(filters.offset, filters.offset + filters.limit - 1);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.clienteId) query = query.eq('cliente_id', filters.clienteId);
    if (filters.faturaId) query = query.eq('fatura_id', filters.faturaId);
    if (filters.pedidoId) query = query.eq('pedido_id', filters.pedidoId);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async getNotaById(id: number) {
    const { data, error } = await supabaseAdmin
      .from('notas_fiscais')
      .select('*, clientes(*), nota_fiscal_pedidos(pedido_id, pedidos(*))')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async cancelNota(id: number, mensagem: string, userId: string) {
    const { data, error } = await supabaseAdmin
      .from('notas_fiscais')
      .update({ status: 'cancelada', mensagem_erro: mensagem, updated_by: userId })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }
}

