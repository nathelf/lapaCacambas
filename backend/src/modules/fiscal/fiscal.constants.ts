/**
 * Constantes e enums do módulo fiscal.
 * Fonte única de verdade — não duplicar em outros arquivos.
 */

// ─── Status da Nota Fiscal ────────────────────────────────────────────────────
// Mapeados como string literals para compatibilidade com Supabase text columns.
// A migration 20260415010000 adiciona estes valores ao enum do banco.
export const NotaFiscalStatus = {
  PENDENTE:                 'pendente',
  VALIDANDO:                'validando',
  VALIDADA:                 'validada',
  EM_PROCESSAMENTO:         'em_processamento',
  EMITIDA:                  'emitida',
  REJEITADA:                'rejeitada',
  CANCELAMENTO_SOLICITADO:  'cancelamento_solicitado',
  CANCELADA:                'cancelada',
  ERRO_INTEGRACAO:          'erro_integracao',
} as const;

export type NotaFiscalStatusType = typeof NotaFiscalStatus[keyof typeof NotaFiscalStatus];

// ─── Tipos de operação para audit log ────────────────────────────────────────
export const FiscalOperacao = {
  PRE_VALIDACAO:           'pre_validacao',
  EMITIR:                  'emitir',
  RESPOSTA_PROVIDER:       'resposta_provider',
  FALHA_EMISSAO:           'falha_emissao',
  CANCELAMENTO_SOLICITADO: 'cancelamento_solicitado',
  CANCELAMENTO_CONCLUIDO:  'cancelamento_concluido',
  CONSULTA_STATUS:         'consultar_status_nf',
  DOWNLOAD_XML:            'download_xml',
  DOWNLOAD_PDF:            'download_pdf',
  IDEMPOTENCIA_HIT:        'idempotencia_hit',
} as const;

export type FiscalOperacaoType = typeof FiscalOperacao[keyof typeof FiscalOperacao];

// ─── Providers disponíveis ────────────────────────────────────────────────────
export const FiscalProvider = {
  MOCK: 'mock',
  HTTP: 'http',
} as const;

export type FiscalProviderType = typeof FiscalProvider[keyof typeof FiscalProvider];

// ─── Ambientes ────────────────────────────────────────────────────────────────
export const FiscalAmbiente = {
  HOMOLOGACAO: 'homologacao',
  PRODUCAO:    'producao',
} as const;

export type FiscalAmbienteType = typeof FiscalAmbiente[keyof typeof FiscalAmbiente];

// ─── Campos sensíveis a mascarar em logs ─────────────────────────────────────
export const FISCAL_SENSITIVE_FIELDS = [
  'api_key',
  'apiKey',
  'client_secret',
  'clientSecret',
  'accessToken',
  'access_token',
  'token',
  'certificate',
  'certificate_ref',
  'certificate_password_ref',
  'password',
  'senha',
] as const;

// ─── Limites operacionais ─────────────────────────────────────────────────────
export const FISCAL_LIMITS = {
  MAX_PEDIDOS_POR_LOTE:    50,
  TIMEOUT_PROVIDER_MS:     30_000,
  MAX_TENTATIVAS_RETRY:    3,
  ALERTA_VALOR_ALTO:       100_000,
} as const;

// ─── Tipo de documento fiscal ─────────────────────────────────────────────────
export const TIPO_DOCUMENTO = {
  NFSE: 'NFS-e',
  NFE:  'NF-e',
} as const;
