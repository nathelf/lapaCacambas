import { supabaseAdmin } from '../../lib/supabase';
import { FiscalNotFoundError, FiscalConflictError } from './fiscal.errors';
import { NotaFiscalStatus } from './fiscal.constants';

export class FiscalRepository {

  // ─── Pedidos ──────────────────────────────────────────────────────────────

  async getPedidosByIds(ids: number[]) {
    const { data, error } = await supabaseAdmin
      .from('pedidos')
      .select('*, clientes(*), servicos(id, descricao, codigo_fiscal, aliquota)')
      .in('id', ids);
    if (error) throw error;
    return data ?? [];
  }

  // ─── Faturas ──────────────────────────────────────────────────────────────

  async getFaturaById(id: number) {
    const { data, error } = await supabaseAdmin
      .from('faturas')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  // ─── Configuração fiscal ──────────────────────────────────────────────────

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

  async updateConfiguracaoFiscalToken(id: number, tokenAtual: string, tokenExpiraEm: string | null) {
    const { error } = await supabaseAdmin
      .from('configuracoes_fiscais_empresa')
      .update({ token_atual: tokenAtual, token_expira_em: tokenExpiraEm })
      .eq('id', id);
    if (error) throw error;
  }

  // ─── Idempotência ─────────────────────────────────────────────────────────

  /**
   * Busca nota pelo external_id (chave de idempotência).
   * Usa o índice único uq_notas_fiscais_idempotency_key.
   */
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

  // ─── Emissão atômica via RPC ──────────────────────────────────────────────

  /**
   * Chama a função Postgres `emitir_nota_fiscal_atomica` que executa em
   * uma única transação: INSERT nota + INSERT vínculos + UPDATE pedidos + INSERT evento.
   *
   * Em caso de unique_violation (idempotência), captura o erro e retorna null —
   * o caller deve usar findNotaByIdempotencyKey para obter a nota existente.
   */
  async emitirNotaAtomico(params: {
    notaData: Record<string, unknown>;
    pedidoIds: number[];
    valorTotal: number;
    usuarioId: string;
    correlationId: string;
  }): Promise<Record<string, unknown>> {
    const { data, error } = await supabaseAdmin.rpc('emitir_nota_fiscal_atomica', {
      p_nota_data:      params.notaData,
      p_pedido_ids:     params.pedidoIds,
      p_valor_total:    params.valorTotal,
      p_usuario_id:     params.usuarioId,
      p_correlation_id: params.correlationId,
    });

    if (error) {
      // Unique violation = outra requisição criou a nota simultaneamente
      if (error.code === '23505' || error.message.includes('IDEMPOTENCY_CONFLICT')) {
        throw new FiscalConflictError(
          'Nota fiscal com esta chave de idempotência já foi criada por outra requisição simultânea.',
          { idempotencyKey: params.notaData['external_id'], errorCode: error.code },
        );
      }
      throw error;
    }

    return data as Record<string, unknown>;
  }

  /**
   * Fallback: cria nota diretamente sem RPC (compatibilidade com ambientes
   * onde a função não foi instalada).
   * NÃO é atômico — usar apenas em desenvolvimento.
   */
  async createNotaFiscalSimples(payload: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin
      .from('notas_fiscais')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async linkNotaPedidos(notaFiscalId: number, pedidoIds: number[], valorTotal: number) {
    const valorPorPedido = pedidoIds.length > 0 ? valorTotal / pedidoIds.length : 0;
    const rows = pedidoIds.map((pedidoId) => ({
      nota_fiscal_id:   notaFiscalId,
      pedido_id:        pedidoId,
      valor:            valorPorPedido,
      valor_vinculado:  valorPorPedido,
    }));
    const { error } = await supabaseAdmin.from('nota_fiscal_pedidos').insert(rows);
    if (error) throw error;
  }

  async updatePedidosAposEmissao(pedidoIds: number[], notaFiscalId: number, status: string) {
    const { error } = await supabaseAdmin
      .from('pedidos')
      .update({
        nota_fiscal_id:    notaFiscalId,
        status_fiscal:     status === NotaFiscalStatus.EMITIDA ? 'emitida' : undefined,
        nota_fiscal_status: status,
        tem_nota_fiscal:   status === NotaFiscalStatus.EMITIDA,
      })
      .in('id', pedidoIds);
    if (error) throw error;
  }

  async updateFaturaNota(faturaId: number, notaFiscalId: number | null) {
    const { error } = await supabaseAdmin
      .from('faturas')
      .update({ nota_fiscal_id: notaFiscalId })
      .eq('id', faturaId);
    if (error) throw error;
  }

  // ─── Atualização de status ────────────────────────────────────────────────

  async updateNotaStatus(
    id: number,
    status: string,
    extra?: Record<string, unknown>,
  ) {
    const { data, error } = await supabaseAdmin
      .from('notas_fiscais')
      .update({ status, updated_at: new Date().toISOString(), ...extra })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async cancelNota(id: number, mensagem: string, userId: string) {
    const { data, error } = await supabaseAdmin
      .from('notas_fiscais')
      .update({
        status:        NotaFiscalStatus.CANCELADA,
        mensagem_erro: mensagem,
        updated_by:    userId,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  // ─── Logs e auditoria ─────────────────────────────────────────────────────

  async saveFiscalLog(payload: Record<string, unknown>) {
    const { error } = await supabaseAdmin.from('fiscal_integracao_logs').insert(payload);
    if (error) throw error;
  }

  async saveAuditLog(payload: Record<string, unknown>) {
    const { error } = await supabaseAdmin.from('logs_auditoria').insert(payload);
    if (error) throw error;
  }

  // ─── Listagem e consulta ──────────────────────────────────────────────────

  async listNotas(filters: {
    status?: string;
    clienteId?: number;
    pedidoId?: number;
    faturaId?: number;
    search?: string;
    limit: number;
    offset: number;
  }) {
    let query = supabaseAdmin
      .from('notas_fiscais')
      .select('*, clientes(id, nome), nota_fiscal_pedidos(pedido_id, pedidos(numero))')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(filters.offset, filters.offset + filters.limit - 1);

    if (filters.status)    query = query.eq('status', filters.status);
    if (filters.clienteId) query = query.eq('cliente_id', filters.clienteId);
    if (filters.faturaId)  query = query.eq('fatura_id', filters.faturaId);
    if (filters.pedidoId)  query = query.eq('pedido_id', filters.pedidoId);
    if (filters.search) {
      const term = filters.search.trim();
      query = query.or(`numero_nota.ilike.%${term}%,numero.ilike.%${term}%`);
    }

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
    if (error) throw new FiscalNotFoundError('Nota fiscal', id);
    return data;
  }

  async getEventosByNotaId(notaId: number) {
    const { data, error } = await supabaseAdmin
      .from('nota_fiscal_eventos')
      .select('*')
      .eq('nota_fiscal_id', notaId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async getKpis() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [{ data: notasMes }, { data: todasNotas }] = await Promise.all([
      supabaseAdmin
        .from('notas_fiscais')
        .select('status, valor_total')
        .gte('created_at', startOfMonth)
        .is('deleted_at', null),
      supabaseAdmin
        .from('notas_fiscais')
        .select('status')
        .is('deleted_at', null),
    ]);

    const mes   = notasMes   ?? [];
    const todas = todasNotas ?? [];

    const emitidas      = mes.length;
    const valorMes      = mes.reduce((s, n) => s + Number(n.valor_total || 0), 0);
    const autorizadas   = todas.filter(n => n.status === 'emitida').length;
    const pendentes     = todas.filter(n => ['pendente', 'processando'].includes(n.status)).length;
    const rejeitadas    = todas.filter(n => ['erro', 'cancelada'].includes(n.status)).length;
    const total         = todas.length;

    return {
      emitidas,
      valorMes,
      autorizadas,
      autorizadas_pct: total > 0 ? Math.round((autorizadas / total) * 100) : 0,
      pendentes,
      rejeitadas,
      total,
    };
  }

  async updateConfiguracaoFiscal(id: number, fields: Record<string, any>) {
    const { data, error } = await supabaseAdmin
      .from('configuracoes_fiscais_empresa')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
