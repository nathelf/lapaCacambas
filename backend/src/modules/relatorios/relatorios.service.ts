import { supabaseAdmin } from '../../lib/supabase';
import type { FiltrosRelatorioQuery } from './relatorios.types';

export async function relatorioOperacional(f: FiltrosRelatorioQuery) {
  let q = supabaseAdmin
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

  if (f.dataInicio) q = q.gte('data_pedido', f.dataInicio);
  if (f.dataFim)    q = q.lte('data_pedido', f.dataFim);
  if (f.clienteId)  q = q.eq('cliente_id', f.clienteId);
  if (f.status)     q = q.eq('status', f.status as any);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function relatorioFinanceiro(f: FiltrosRelatorioQuery) {
  let q = supabaseAdmin
    .from('faturas')
    .select(`
      id, numero, status, forma_cobranca,
      data_emissao, data_vencimento, data_baixa,
      valor_bruto, valor_desconto, valor_juros, valor_multa, valor_liquido, valor_baixa,
      observacao,
      clientes(nome, fantasia)
    `)
    .order('data_emissao', { ascending: false });

  if (f.dataInicio) q = q.gte('data_emissao', f.dataInicio);
  if (f.dataFim)    q = q.lte('data_emissao', f.dataFim);
  if (f.clienteId)  q = q.eq('cliente_id', f.clienteId);
  if (f.status)     q = q.eq('status', f.status as any);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function relatorioBoletos(f: FiltrosRelatorioQuery) {
  let q = supabaseAdmin
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

  if (f.dataInicio) q = q.gte('data_emissao', f.dataInicio);
  if (f.dataFim)    q = q.lte('data_emissao', f.dataFim);
  if (f.clienteId)  q = q.eq('cliente_id', f.clienteId);
  if (f.status)     q = q.eq('status', f.status as any);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function relatorioInadimplencia(f: FiltrosRelatorioQuery) {
  const hoje = new Date().toISOString().split('T')[0];

  let q = supabaseAdmin
    .from('faturas')
    .select(`
      id, numero, status, data_vencimento, valor_liquido,
      clientes(id, nome, fantasia, telefone, celular, email)
    `)
    .in('status', ['aberta', 'vencida', 'protesto'])
    .lte('data_vencimento', hoje)
    .order('data_vencimento');

  if (f.clienteId) q = q.eq('cliente_id', f.clienteId);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}
