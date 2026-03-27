/**
 * Módulo de integração fiscal
 *
 * Responsável por emissão de NF-e / NFS-e via provider externo (ex: Plugnotas, Focus NFe, etc.).
 * O provider real é selecionado pelo env VITE_FISCAL_PROVIDER.
 *
 * Arquitetura:
 *  - DTOs próprios (sem vazamento de schema Supabase para o provider)
 *  - Logs de request/response sanitizados (sem dados sensíveis em texto claro)
 *  - Idempotência via chave externa (pedido_id / fatura_id)
 *  - Retentativa com back-off exponencial
 *  - Status técnico isolado do status de negócio
 */

import { supabase } from '@/integrations/supabase/client';

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

const FISCAL_PROVIDER = import.meta.env.VITE_FISCAL_PROVIDER ?? 'mock';
const FISCAL_API_URL  = import.meta.env.VITE_FISCAL_API_URL  ?? '';
const FISCAL_API_KEY  = import.meta.env.VITE_FISCAL_API_KEY  ?? '';
const MAX_RETRIES     = 3;

// ---------------------------------------------------------------------------
// DTOs de entrada (domínio da aplicação → provider)
// ---------------------------------------------------------------------------

export interface EnderecoFiscalDTO {
  logradouro:  string;
  numero:      string;
  complemento?: string;
  bairro:      string;
  municipio:   string;
  uf:          string;
  cep:         string;
}

export interface ClienteFiscalDTO {
  tipo:         'PF' | 'PJ';
  documento:    string;   // CPF ou CNPJ (sem máscara)
  nome:         string;
  email?:       string;
  telefone?:    string;
  endereco:     EnderecoFiscalDTO;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
}

export interface ItemNFDTO {
  descricao:    string;
  quantidade:   number;
  valor_unitario: number;
  ncm?:         string;   // NF-e mercadoria
  cnae?:        string;   // NFS-e serviço
  codigo_servico_municipal?: string;
}

export interface EmitirNFDTO {
  tipo:         'NFe' | 'NFSe';
  /** Chave de idempotência — evita duplicata em caso de retry */
  chave_idempotencia: string;  // ex: `fatura-${faturaId}`
  natureza_operacao: string;
  data_emissao: string;        // ISO date
  cliente:      ClienteFiscalDTO;
  itens:        ItemNFDTO[];
  valor_total:  number;
  valor_desconto?: number;
  valor_frete?: number;
  observacoes?: string;
  /** Referência interna — armazenada no log, não enviada ao provider */
  _meta?: {
    fatura_id?: number;
    pedido_id?: number;
    ordem_servico?: string;
  };
}

// ---------------------------------------------------------------------------
// DTOs de retorno (provider → domínio)
// ---------------------------------------------------------------------------

export type StatusIntegracao =
  | 'pendente'
  | 'processando'
  | 'autorizado'
  | 'rejeitado'
  | 'cancelado'
  | 'erro_interno';

export interface RetornoNFDTO {
  /** Status técnico da integração */
  status:          StatusIntegracao;
  /** Número da NF gerada pelo provider */
  numero_nf?:      string;
  /** Chave de acesso (NF-e: 44 dígitos) */
  chave_acesso?:   string;
  /** URL do DANFE / PDF */
  url_pdf?:        string;
  /** URL do XML */
  url_xml?:        string;
  /** Código de protocolo SEFAZ */
  protocolo?:      string;
  /** Data/hora de autorização */
  data_autorizacao?: string;
  /** Mensagem de erro ou motivo de rejeição */
  mensagem?:       string;
  /** Dados brutos sanitizados (sem chaves de API, senhas, etc.) */
  _raw?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Log de integração — salvo na tabela `logs_integracao_fiscal`
// ---------------------------------------------------------------------------

interface LogIntegracao {
  tipo:             string;
  chave_idempotencia: string;
  fatura_id?:       number;
  pedido_id?:       number;
  status:           StatusIntegracao;
  request_resumo:   Record<string, unknown>;
  response_resumo:  Record<string, unknown>;
  tentativa:        number;
  erro?:            string;
}

async function salvarLog(log: LogIntegracao): Promise<void> {
  const { error } = await supabase
    .from('logs_integracao_fiscal')
    .insert({
      tipo:               log.tipo,
      chave_idempotencia: log.chave_idempotencia,
      fatura_id:          log.fatura_id ?? null,
      pedido_id:          log.pedido_id ?? null,
      status:             log.status,
      request_resumo:     log.request_resumo,
      response_resumo:    log.response_resumo,
      tentativa:          log.tentativa,
      erro:               log.erro ?? null,
      criado_em:          new Date().toISOString(),
    });

  if (error) {
    // Não lança — log não deve quebrar o fluxo principal
    console.error('[fiscal] Erro ao salvar log:', error.message);
  }
}

// ---------------------------------------------------------------------------
// Sanitização — remove campos sensíveis antes de logar
// ---------------------------------------------------------------------------

function sanitizarRequest(dto: EmitirNFDTO): Record<string, unknown> {
  return {
    tipo:               dto.tipo,
    chave_idempotencia: dto.chave_idempotencia,
    natureza_operacao:  dto.natureza_operacao,
    data_emissao:       dto.data_emissao,
    cliente_tipo:       dto.cliente.tipo,
    cliente_doc_hash:   hashDoc(dto.cliente.documento),
    cliente_nome:       dto.cliente.nome,
    itens_count:        dto.itens.length,
    valor_total:        dto.valor_total,
    meta:               dto._meta ?? null,
  };
}

function sanitizarResponse(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return { raw_type: typeof raw };
  const r = raw as Record<string, unknown>;
  // Remove campos que possam conter tokens ou dados PII não necessários
  const { token: _t, senha: _s, access_token: _at, ...safe } = r;
  return safe as Record<string, unknown>;
}

/** Hash simples para logar documento sem expor o número completo */
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
      if (i < maxTentativas) {
        await delay(200 * Math.pow(2, i - 1)); // 200ms, 400ms, 800ms…
      }
    }
  }
  throw ultima;
}

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

// ---------------------------------------------------------------------------
// Verificação de idempotência
// ---------------------------------------------------------------------------

async function jaProcessado(chave: string): Promise<RetornoNFDTO | null> {
  const { data } = await supabase
    .from('logs_integracao_fiscal')
    .select('status, response_resumo')
    .eq('chave_idempotencia', chave)
    .eq('status', 'autorizado')
    .maybeSingle();

  if (!data) return null;

  return {
    status:        'autorizado',
    numero_nf:     (data.response_resumo as any)?.numero_nf,
    chave_acesso:  (data.response_resumo as any)?.chave_acesso,
    url_pdf:       (data.response_resumo as any)?.url_pdf,
    mensagem:      'Retorno de idempotência (já autorizado anteriormente)',
  };
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

async function chamarProviderMock(dto: EmitirNFDTO): Promise<RetornoNFDTO> {
  // Simula latência
  await delay(400);
  return {
    status:          'autorizado',
    numero_nf:       String(Math.floor(Math.random() * 99999) + 1).padStart(6, '0'),
    chave_acesso:    Array.from({ length: 44 }, () => Math.floor(Math.random() * 10)).join(''),
    url_pdf:         'https://mock.fiscal/danfe.pdf',
    url_xml:         'https://mock.fiscal/nfe.xml',
    protocolo:       `3${Date.now()}`,
    data_autorizacao: new Date().toISOString(),
  };
}

async function chamarProviderReal(dto: EmitirNFDTO): Promise<RetornoNFDTO> {
  if (!FISCAL_API_URL || !FISCAL_API_KEY) {
    throw new Error('VITE_FISCAL_API_URL e VITE_FISCAL_API_KEY não configurados.');
  }

  const payload = buildProviderPayload(dto);

  const response = await fetch(`${FISCAL_API_URL}/nfe/emitir`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${FISCAL_API_KEY}`,
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
 * Mapeia o DTO interno para o schema esperado pelo provider.
 * Adapte aqui para cada provider (Plugnotas, Focus NFe, etc.).
 */
function buildProviderPayload(dto: EmitirNFDTO): Record<string, unknown> {
  return {
    // Exemplo genérico — adaptar ao provider escolhido
    tipo:              dto.tipo,
    natureza_operacao: dto.natureza_operacao,
    data_emissao:      dto.data_emissao,
    destinatario: {
      cnpj_cpf:   dto.cliente.documento,
      nome:       dto.cliente.nome,
      email:      dto.cliente.email,
      endereco: {
        logradouro:  dto.cliente.endereco.logradouro,
        numero:      dto.cliente.endereco.numero,
        complemento: dto.cliente.endereco.complemento,
        bairro:      dto.cliente.endereco.bairro,
        municipio:   dto.cliente.endereco.municipio,
        uf:          dto.cliente.endereco.uf,
        cep:         dto.cliente.endereco.cep,
      },
    },
    itens: dto.itens.map((item) => ({
      descricao:      item.descricao,
      quantidade:     item.quantidade,
      valor_unitario: item.valor_unitario,
      ncm:            item.ncm,
      cnae:           item.cnae,
      codigo_servico: item.codigo_servico_municipal,
    })),
    total: {
      valor:    dto.valor_total,
      desconto: dto.valor_desconto ?? 0,
      frete:    dto.valor_frete ?? 0,
    },
    observacoes: dto.observacoes,
  };
}

/** Normaliza a resposta do provider para o DTO interno. */
function mapearRespostaProvider(json: Record<string, unknown>): RetornoNFDTO {
  return {
    status:          (json.status as StatusIntegracao) ?? 'processando',
    numero_nf:       (json.numero ?? json.numero_nf) as string | undefined,
    chave_acesso:    (json.chave_acesso ?? json.chNFe) as string | undefined,
    url_pdf:         (json.url_pdf ?? json.linkDanfe) as string | undefined,
    url_xml:         (json.url_xml ?? json.linkXml) as string | undefined,
    protocolo:       (json.protocolo ?? json.nProt) as string | undefined,
    data_autorizacao: (json.data_autorizacao ?? json.dhRecbto) as string | undefined,
    mensagem:        (json.mensagem ?? json.xMotivo) as string | undefined,
    _raw:            sanitizarResponse(json),
  };
}

// ---------------------------------------------------------------------------
// Atualizar fatura no banco com resultado da NF
// ---------------------------------------------------------------------------

async function atualizarFatura(
  faturaId: number,
  retorno: RetornoNFDTO,
): Promise<void> {
  const { error } = await supabase
    .from('faturas')
    .update({
      status_fiscal:     retorno.status,
      numero_nf:         retorno.numero_nf ?? null,
      chave_acesso_nf:   retorno.chave_acesso ?? null,
      url_danfe:         retorno.url_pdf ?? null,
      url_xml_nf:        retorno.url_xml ?? null,
      data_autorizacao_nf: retorno.data_autorizacao ?? null,
    })
    .eq('id', faturaId);

  if (error) {
    console.error('[fiscal] Erro ao atualizar fatura:', error.message);
  }
}

// ---------------------------------------------------------------------------
// API pública do módulo
// ---------------------------------------------------------------------------

/**
 * Emite uma Nota Fiscal (NF-e ou NFS-e).
 *
 * - Verifica idempotência antes de chamar o provider
 * - Retenta até MAX_RETRIES vezes com back-off
 * - Loga request/response sanitizados
 * - Atualiza a fatura no banco se faturaId fornecido
 *
 * @example
 * ```ts
 * const retorno = await emitirNF({
 *   tipo: 'NFSe',
 *   chave_idempotencia: `fatura-${fatura.id}`,
 *   natureza_operacao: 'Prestação de Serviço',
 *   data_emissao: new Date().toISOString().split('T')[0],
 *   cliente: { ... },
 *   itens: [ { descricao: 'Locação de caçamba', quantidade: 1, valor_unitario: 350 } ],
 *   valor_total: 350,
 *   _meta: { fatura_id: fatura.id },
 * });
 * ```
 */
export async function emitirNF(dto: EmitirNFDTO): Promise<RetornoNFDTO> {
  const { chave_idempotencia, _meta } = dto;

  // 1. Idempotência
  const existente = await jaProcessado(chave_idempotencia);
  if (existente) return existente;

  const reqResumo = sanitizarRequest(dto);

  let retorno: RetornoNFDTO;
  let tentativas = 1;

  try {
    const chamada = FISCAL_PROVIDER === 'mock'
      ? () => chamarProviderMock(dto)
      : () => chamarProviderReal(dto);

    const r = await comRetentativa(chamada);
    retorno   = r.resultado;
    tentativas = r.tentativas;
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err);
    retorno = { status: 'erro_interno', mensagem };

    await salvarLog({
      tipo:               dto.tipo,
      chave_idempotencia,
      fatura_id:          _meta?.fatura_id,
      pedido_id:          _meta?.pedido_id,
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
    tipo:               dto.tipo,
    chave_idempotencia,
    fatura_id:          _meta?.fatura_id,
    pedido_id:          _meta?.pedido_id,
    status:             retorno.status,
    request_resumo:     reqResumo,
    response_resumo:    retorno._raw ?? { status: retorno.status, numero_nf: retorno.numero_nf },
    tentativa:          tentativas,
  });

  // 3. Atualizar fatura no banco
  if (_meta?.fatura_id && retorno.status === 'autorizado') {
    await atualizarFatura(_meta.fatura_id, retorno);
  }

  return retorno;
}

/**
 * Cancela uma NF já autorizada.
 */
export async function cancelarNF(params: {
  chave_acesso:       string;
  justificativa:      string;
  fatura_id?:         number;
}): Promise<RetornoNFDTO> {
  if (FISCAL_PROVIDER === 'mock') {
    await delay(300);
    const retorno: RetornoNFDTO = { status: 'cancelado', mensagem: 'Cancelamento simulado (mock).' };

    if (params.fatura_id) {
      await supabase
        .from('faturas')
        .update({ status_fiscal: 'cancelado' })
        .eq('id', params.fatura_id);
    }

    return retorno;
  }

  const response = await fetch(`${FISCAL_API_URL}/nfe/cancelar`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${FISCAL_API_KEY}`,
    },
    body: JSON.stringify({
      chave_acesso:  params.chave_acesso,
      justificativa: params.justificativa,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return { status: 'erro_interno', mensagem: `HTTP ${response.status}: ${body.slice(0, 200)}` };
  }

  const json = await response.json();
  const retorno = mapearRespostaProvider(json);

  if (params.fatura_id) {
    await supabase
      .from('faturas')
      .update({ status_fiscal: retorno.status })
      .eq('id', params.fatura_id);
  }

  return retorno;
}

/**
 * Reprocessa uma NF com status de erro.
 * Força nova tentativa ignorando a checagem de idempotência.
 */
export async function reprocessarNF(dto: EmitirNFDTO): Promise<RetornoNFDTO> {
  // Remove o registro de erro anterior para permitir reprocessamento
  await supabase
    .from('logs_integracao_fiscal')
    .delete()
    .eq('chave_idempotencia', dto.chave_idempotencia)
    .eq('status', 'erro_interno');

  return emitirNF(dto);
}

/**
 * Consulta o status atual de uma NF no provider.
 */
export async function consultarStatusNF(chaveAcesso: string): Promise<RetornoNFDTO> {
  if (FISCAL_PROVIDER === 'mock') {
    await delay(200);
    return { status: 'autorizado', chave_acesso: chaveAcesso, mensagem: 'Consulta simulada (mock).' };
  }

  const response = await fetch(`${FISCAL_API_URL}/nfe/consultar/${chaveAcesso}`, {
    headers: { 'Authorization': `Bearer ${FISCAL_API_KEY}` },
  });

  if (!response.ok) {
    return { status: 'erro_interno', mensagem: `HTTP ${response.status}` };
  }

  const json = await response.json();
  return mapearRespostaProvider(json);
}
