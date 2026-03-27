/**
 * Módulo de integração bancária / gateway de boletos
 *
 * Responsável por registrar boletos em bancos (Bradesco, Itaú, Sicoob, etc.)
 * via gateway de pagamento (ex: Gerencianet/Efi Bank, Celcoin, BoletoCloud, etc.).
 * O provider é selecionado pelo env VITE_BANCARIO_PROVIDER.
 *
 * Arquitetura:
 *  - DTOs próprios isolados do schema Supabase
 *  - Idempotência via `nosso_numero` / UUID de boleto
 *  - Logs de request/response sanitizados (sem tokens, senhas)
 *  - Retentativa com back-off exponencial
 *  - Status técnico da integração separado do status de negócio
 *  - Suporte a webhook de retorno de pagamento
 */

import { supabase } from '@/integrations/supabase/client';

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

const BANCARIO_PROVIDER = import.meta.env.VITE_BANCARIO_PROVIDER ?? 'mock';
const BANCARIO_API_URL  = import.meta.env.VITE_BANCARIO_API_URL  ?? '';
const BANCARIO_API_KEY  = import.meta.env.VITE_BANCARIO_API_KEY  ?? '';
const MAX_RETRIES       = 3;

// ---------------------------------------------------------------------------
// DTOs de entrada
// ---------------------------------------------------------------------------

export interface PagadorDTO {
  tipo:       'PF' | 'PJ';
  documento:  string;   // CPF ou CNPJ (somente dígitos)
  nome:       string;
  email?:     string;
  telefone?:  string;
  logradouro: string;
  numero:     string;
  complemento?: string;
  bairro:     string;
  municipio:  string;
  uf:         string;
  cep:        string;
}

export interface RegistrarBoletoDTO {
  /** Chave de idempotência — geralmente o UUID interno do boleto */
  chave_idempotencia: string;
  /** Nosso número (gerado internamente ou pelo banco) */
  nosso_numero:       string;
  /** Data de vencimento ISO date (YYYY-MM-DD) */
  data_vencimento:    string;
  /** Data de emissão ISO date */
  data_emissao:       string;
  /** Valor em reais */
  valor:              number;
  /** Multa percentual após vencimento (ex: 2.0 = 2%) */
  multa_percent?:     number;
  /** Juros ao mês (ex: 1.0 = 1% a.m.) */
  juros_mes?:         number;
  /** Desconto até data (ex: até vencimento -5%) */
  desconto_percent?:  number;
  /** Dias de tolerância antes de multa/juros */
  dias_tolerancia?:   number;
  /** Mensagem / instrução ao caixa */
  instrucoes?:        string;
  /** Descrição do serviço para demonstrativo */
  descricao?:         string;
  pagador:            PagadorDTO;
  /** Referência interna — armazenada no log, não enviada ao provider */
  _meta?: {
    boleto_id?:  number;
    fatura_id?:  number;
    pedido_id?:  number;
  };
}

export interface NotificarPagamentoDTO {
  nosso_numero:    string;
  valor_pago:      number;
  data_pagamento:  string;  // ISO datetime
  banco_origem?:   string;
  agencia_origem?: string;
  conta_origem?:   string;
}

// ---------------------------------------------------------------------------
// DTOs de retorno
// ---------------------------------------------------------------------------

export type StatusIntegracaoBancaria =
  | 'pendente'
  | 'registrado'
  | 'pago'
  | 'vencido'
  | 'cancelado'
  | 'erro_interno';

export interface RetornoBoletoDTO {
  status:           StatusIntegracaoBancaria;
  /** Nosso número confirmado pelo banco */
  nosso_numero?:    string;
  /** Linha digitável (47 ou 48 dígitos) */
  linha_digitavel?: string;
  /** Código de barras (44 dígitos) */
  codigo_barras?:   string;
  /** URL do PDF do boleto */
  url_pdf?:         string;
  /** QR Code Pix (se emitido junto) */
  qr_code_pix?:     string;
  /** Data de registro no banco */
  data_registro?:   string;
  mensagem?:        string;
  _raw?:            Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Log de integração
// ---------------------------------------------------------------------------

interface LogIntegracaoBancaria {
  tipo:               string;
  chave_idempotencia: string;
  boleto_id?:         number;
  fatura_id?:         number;
  status:             StatusIntegracaoBancaria;
  request_resumo:     Record<string, unknown>;
  response_resumo:    Record<string, unknown>;
  tentativa:          number;
  erro?:              string;
}

async function salvarLog(log: LogIntegracaoBancaria): Promise<void> {
  const { error } = await supabase
    .from('logs_integracao_bancaria')
    .insert({
      tipo:               log.tipo,
      chave_idempotencia: log.chave_idempotencia,
      boleto_id:          log.boleto_id ?? null,
      fatura_id:          log.fatura_id ?? null,
      status:             log.status,
      request_resumo:     log.request_resumo,
      response_resumo:    log.response_resumo,
      tentativa:          log.tentativa,
      erro:               log.erro ?? null,
      criado_em:          new Date().toISOString(),
    });

  if (error) {
    console.error('[bancario] Erro ao salvar log:', error.message);
  }
}

// ---------------------------------------------------------------------------
// Sanitização
// ---------------------------------------------------------------------------

function sanitizarRequest(dto: RegistrarBoletoDTO): Record<string, unknown> {
  return {
    chave_idempotencia: dto.chave_idempotencia,
    nosso_numero:       dto.nosso_numero,
    data_vencimento:    dto.data_vencimento,
    valor:              dto.valor,
    pagador_tipo:       dto.pagador.tipo,
    pagador_doc_hash:   hashDoc(dto.pagador.documento),
    pagador_nome:       dto.pagador.nome,
    meta:               dto._meta ?? null,
  };
}

function sanitizarResponse(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return { raw_type: typeof raw };
  const r = raw as Record<string, unknown>;
  const { token: _t, senha: _s, access_token: _at, client_secret: _cs, ...safe } = r;
  return safe as Record<string, unknown>;
}

function hashDoc(doc: string): string {
  const d = doc.replace(/\D/g, '');
  if (d.length <= 4) return '****';
  return `${d.slice(0, 2)}****${d.slice(-2)}`;
}

// ---------------------------------------------------------------------------
// Retentativa com back-off exponencial
// ---------------------------------------------------------------------------

async function comRetentativa<T>(
  fn: () => Promise<T>,
  maxTentativas = MAX_RETRIES,
): Promise<{ resultado: T; tentativas: number }> {
  let ultima: unknown;
  for (let i = 1; i <= maxTentativas; i++) {
    try {
      const resultado = await fn();
      return { resultado, tentativas: i };
    } catch (err) {
      ultima = err;
      if (i < maxTentativas) await delay(200 * Math.pow(2, i - 1));
    }
  }
  throw ultima;
}

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

// ---------------------------------------------------------------------------
// Idempotência
// ---------------------------------------------------------------------------

async function jaRegistrado(chave: string): Promise<RetornoBoletoDTO | null> {
  const { data } = await supabase
    .from('logs_integracao_bancaria')
    .select('status, response_resumo')
    .eq('chave_idempotencia', chave)
    .eq('status', 'registrado')
    .maybeSingle();

  if (!data) return null;

  return {
    status:          'registrado',
    nosso_numero:    (data.response_resumo as any)?.nosso_numero,
    linha_digitavel: (data.response_resumo as any)?.linha_digitavel,
    codigo_barras:   (data.response_resumo as any)?.codigo_barras,
    url_pdf:         (data.response_resumo as any)?.url_pdf,
    mensagem:        'Retorno de idempotência (já registrado anteriormente)',
  };
}

// ---------------------------------------------------------------------------
// Provider: Mock
// ---------------------------------------------------------------------------

async function chamarProviderMock(dto: RegistrarBoletoDTO): Promise<RetornoBoletoDTO> {
  await delay(350);

  // Gera linha digitável fictícia no formato 47 dígitos
  const linhaDigitavel = [
    '34191',
    String(dto.valor * 100).padStart(10, '0'),
    '00000000000',
    '1',
    String(Math.floor(Math.random() * 9999999)).padStart(7, '0'),
    '0000000000',
    new Date(dto.data_vencimento).toISOString().replace(/\D/g, '').slice(0, 8),
  ].join('').slice(0, 47);

  return {
    status:          'registrado',
    nosso_numero:    dto.nosso_numero,
    linha_digitavel: linhaDigitavel,
    codigo_barras:   linhaDigitavel.replace(/\s/g, '').slice(0, 44),
    url_pdf:         `https://mock.bancario/boleto/${dto.nosso_numero}.pdf`,
    qr_code_pix:     `00020126330014BR.GOV.BCB.PIX0111${dto.pagador.documento.slice(0, 11)}5204000053039865406${dto.valor.toFixed(2)}5802BR5913LAPA LOCACOES6009SAO PAULO62070503***63041234`,
    data_registro:   new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Provider: Real
// ---------------------------------------------------------------------------

async function chamarProviderReal(dto: RegistrarBoletoDTO): Promise<RetornoBoletoDTO> {
  if (!BANCARIO_API_URL || !BANCARIO_API_KEY) {
    throw new Error('VITE_BANCARIO_API_URL e VITE_BANCARIO_API_KEY não configurados.');
  }

  const payload = buildProviderPayload(dto);

  const response = await fetch(`${BANCARIO_API_URL}/boletos/registrar`, {
    method:  'POST',
    headers: {
      'Content-Type':     'application/json',
      'Authorization':    `Bearer ${BANCARIO_API_KEY}`,
      'X-Idempotency-Key': dto.chave_idempotencia,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body.slice(0, 300)}`);
  }

  const json = await response.json();
  return mapearRespostaProvider(json);
}

/**
 * Monta o payload no schema do provider.
 * Adapte para o provider escolhido (EFI/Gerencianet, BoletoCloud, Celcoin, etc.)
 */
function buildProviderPayload(dto: RegistrarBoletoDTO): Record<string, unknown> {
  return {
    // Schema genérico — adaptar por provider
    nosso_numero:    dto.nosso_numero,
    data_vencimento: dto.data_vencimento,
    data_emissao:    dto.data_emissao,
    valor:           dto.valor,
    multa: dto.multa_percent ? {
      tipo:       'percentual',
      percentual: dto.multa_percent,
    } : undefined,
    juros: dto.juros_mes ? {
      tipo:       'mensal',
      percentual: dto.juros_mes,
    } : undefined,
    desconto: dto.desconto_percent ? {
      tipo:       'percentual',
      percentual: dto.desconto_percent,
      data:       dto.data_vencimento,
    } : undefined,
    instrucoes:  dto.instrucoes,
    descricao:   dto.descricao,
    pagador: {
      cpf_cnpj:   dto.pagador.documento,
      nome:       dto.pagador.nome,
      email:      dto.pagador.email,
      telefone:   dto.pagador.telefone,
      logradouro: dto.pagador.logradouro,
      numero:     dto.pagador.numero,
      complemento: dto.pagador.complemento,
      bairro:     dto.pagador.bairro,
      municipio:  dto.pagador.municipio,
      uf:         dto.pagador.uf,
      cep:        dto.pagador.cep,
    },
  };
}

function mapearRespostaProvider(json: Record<string, unknown>): RetornoBoletoDTO {
  return {
    status:          (json.status as StatusIntegracaoBancaria) ?? 'registrado',
    nosso_numero:    (json.nosso_numero ?? json.ourNumber) as string | undefined,
    linha_digitavel: (json.linha_digitavel ?? json.digitableLine ?? json.barCode) as string | undefined,
    codigo_barras:   (json.codigo_barras ?? json.barCode) as string | undefined,
    url_pdf:         (json.url_pdf ?? json.pdfUrl ?? json.pdf) as string | undefined,
    qr_code_pix:     (json.qr_code_pix ?? json.pixQrCode) as string | undefined,
    data_registro:   (json.data_registro ?? json.registrationDate) as string | undefined,
    mensagem:        (json.mensagem ?? json.message) as string | undefined,
    _raw:            sanitizarResponse(json),
  };
}

// ---------------------------------------------------------------------------
// Atualizar boleto no banco
// ---------------------------------------------------------------------------

async function atualizarBoleto(
  boletoId: number,
  retorno: RetornoBoletoDTO,
): Promise<void> {
  const { error } = await supabase
    .from('boletos')
    .update({
      integracao_status:   retorno.status,
      linha_digitavel:     retorno.linha_digitavel ?? null,
      codigo_barras:       retorno.codigo_barras ?? null,
      url_boleto_pdf:      retorno.url_pdf ?? null,
      qr_code_pix:         retorno.qr_code_pix ?? null,
      data_registro_banco: retorno.data_registro ?? null,
      status:              retorno.status === 'registrado' ? 'emitido' : undefined,
    })
    .eq('id', boletoId);

  if (error) {
    console.error('[bancario] Erro ao atualizar boleto:', error.message);
  }
}

// ---------------------------------------------------------------------------
// API pública do módulo
// ---------------------------------------------------------------------------

/**
 * Registra um boleto no banco/gateway.
 *
 * - Verifica idempotência antes de chamar o provider
 * - Retenta até MAX_RETRIES vezes com back-off
 * - Loga request/response sanitizados
 * - Atualiza o boleto no banco se boletoId fornecido
 *
 * @example
 * ```ts
 * const retorno = await registrarBoleto({
 *   chave_idempotencia: `boleto-${boleto.id}`,
 *   nosso_numero: boleto.nosso_numero,
 *   data_vencimento: boleto.data_vencimento,
 *   data_emissao: boleto.data_emissao,
 *   valor: boleto.valor,
 *   multa_percent: 2,
 *   juros_mes: 1,
 *   pagador: { ... },
 *   _meta: { boleto_id: boleto.id, fatura_id: boleto.fatura_id },
 * });
 * ```
 */
export async function registrarBoleto(dto: RegistrarBoletoDTO): Promise<RetornoBoletoDTO> {
  const { chave_idempotencia, _meta } = dto;

  // 1. Idempotência
  const existente = await jaRegistrado(chave_idempotencia);
  if (existente) return existente;

  const reqResumo = sanitizarRequest(dto);

  let retorno: RetornoBoletoDTO;
  let tentativas = 1;

  try {
    const chamada = BANCARIO_PROVIDER === 'mock'
      ? () => chamarProviderMock(dto)
      : () => chamarProviderReal(dto);

    const r = await comRetentativa(chamada);
    retorno   = r.resultado;
    tentativas = r.tentativas;
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err);
    retorno = { status: 'erro_interno', mensagem };

    await salvarLog({
      tipo:               'registrar_boleto',
      chave_idempotencia,
      boleto_id:          _meta?.boleto_id,
      fatura_id:          _meta?.fatura_id,
      status:             'erro_interno',
      request_resumo:     reqResumo,
      response_resumo:    { mensagem },
      tentativa:          MAX_RETRIES,
      erro:               mensagem,
    });

    return retorno;
  }

  // 2. Salvar log
  await salvarLog({
    tipo:               'registrar_boleto',
    chave_idempotencia,
    boleto_id:          _meta?.boleto_id,
    fatura_id:          _meta?.fatura_id,
    status:             retorno.status,
    request_resumo:     reqResumo,
    response_resumo:    retorno._raw ?? { status: retorno.status, linha_digitavel: retorno.linha_digitavel },
    tentativa:          tentativas,
  });

  // 3. Atualizar boleto no banco
  if (_meta?.boleto_id) {
    await atualizarBoleto(_meta.boleto_id, retorno);
  }

  return retorno;
}

/**
 * Cancela / baixa um boleto no banco.
 */
export async function cancelarBoleto(params: {
  nosso_numero: string;
  motivo?:      string;
  boleto_id?:   number;
}): Promise<RetornoBoletoDTO> {
  if (BANCARIO_PROVIDER === 'mock') {
    await delay(250);

    if (params.boleto_id) {
      await supabase
        .from('boletos')
        .update({ status: 'cancelado', integracao_status: 'cancelado' })
        .eq('id', params.boleto_id);
    }

    return { status: 'cancelado', nosso_numero: params.nosso_numero, mensagem: 'Cancelamento simulado (mock).' };
  }

  const response = await fetch(`${BANCARIO_API_URL}/boletos/${params.nosso_numero}/cancelar`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${BANCARIO_API_KEY}`,
    },
    body: JSON.stringify({ motivo: params.motivo ?? 'Cancelado pelo sistema' }),
  });

  if (!response.ok) {
    const body = await response.text();
    return { status: 'erro_interno', mensagem: `HTTP ${response.status}: ${body.slice(0, 200)}` };
  }

  const json = await response.json();
  const retorno = mapearRespostaProvider(json);

  if (params.boleto_id) {
    await supabase
      .from('boletos')
      .update({ status: 'cancelado', integracao_status: retorno.status })
      .eq('id', params.boleto_id);
  }

  return retorno;
}

/**
 * Reprocessa um boleto com status de erro.
 * Remove o log de erro e chama o provider novamente.
 */
export async function reprocessarBoleto(dto: RegistrarBoletoDTO): Promise<RetornoBoletoDTO> {
  await supabase
    .from('logs_integracao_bancaria')
    .delete()
    .eq('chave_idempotencia', dto.chave_idempotencia)
    .eq('status', 'erro_interno');

  return registrarBoleto(dto);
}

/**
 * Processa retorno de pagamento recebido via webhook do banco/gateway.
 * Atualiza o boleto e a fatura correspondente.
 */
export async function processarWebhookPagamento(
  payload: NotificarPagamentoDTO,
): Promise<{ ok: boolean; mensagem: string }> {
  // Buscar boleto pelo nosso_numero
  const { data: boleto, error } = await supabase
    .from('boletos')
    .select('id, fatura_id, valor, status')
    .eq('nosso_numero', payload.nosso_numero)
    .maybeSingle();

  if (error || !boleto) {
    return { ok: false, mensagem: `Boleto não encontrado: ${payload.nosso_numero}` };
  }

  if (boleto.status === 'pago') {
    return { ok: true, mensagem: 'Boleto já estava marcado como pago (idempotente).' };
  }

  // Atualizar boleto
  await supabase
    .from('boletos')
    .update({
      status:            'pago',
      integracao_status: 'pago',
      valor_pago:        payload.valor_pago,
      data_pagamento:    payload.data_pagamento,
    })
    .eq('id', boleto.id);

  // Atualizar fatura se vinculada
  if (boleto.fatura_id) {
    await supabase
      .from('faturas')
      .update({
        status:         'pago',
        data_pagamento: payload.data_pagamento,
        valor_pago:     payload.valor_pago,
      })
      .eq('id', boleto.fatura_id);
  }

  // Log
  await salvarLog({
    tipo:               'webhook_pagamento',
    chave_idempotencia: `webhook-pago-${payload.nosso_numero}-${payload.data_pagamento}`,
    boleto_id:          boleto.id,
    fatura_id:          boleto.fatura_id ?? undefined,
    status:             'pago',
    request_resumo: {
      nosso_numero:   payload.nosso_numero,
      valor_pago:     payload.valor_pago,
      data_pagamento: payload.data_pagamento,
    },
    response_resumo: { ok: true },
    tentativa:       1,
  });

  return { ok: true, mensagem: 'Pagamento registrado com sucesso.' };
}

/**
 * Consulta o status atual de um boleto no banco/gateway.
 */
export async function consultarBoletoBanco(nossoNumero: string): Promise<RetornoBoletoDTO> {
  if (BANCARIO_PROVIDER === 'mock') {
    await delay(200);
    return { status: 'registrado', nosso_numero: nossoNumero, mensagem: 'Consulta simulada (mock).' };
  }

  const response = await fetch(`${BANCARIO_API_URL}/boletos/${nossoNumero}`, {
    headers: { 'Authorization': `Bearer ${BANCARIO_API_KEY}` },
  });

  if (!response.ok) {
    return { status: 'erro_interno', mensagem: `HTTP ${response.status}` };
  }

  const json = await response.json();
  return mapearRespostaProvider(json);
}
