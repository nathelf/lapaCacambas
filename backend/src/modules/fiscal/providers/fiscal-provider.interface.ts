/**
 * Contrato de provider fiscal.
 * Todo provider (Mock, HTTP, NFE.io, Tecnos, etc.) deve implementar esta interface.
 * O FiscalService nunca sabe qual provider está rodando — só conhece esta interface.
 */

// ─── Contexto de autenticação ─────────────────────────────────────────────────
export interface FiscalProviderContext {
  accessToken: string;
  apiBaseUrl: string | null;
  ambiente: string;
  /** Tipo do provider — cada implementação usa para adaptar auth headers */
  providerType?: string;
}

// ─── Payload de emissão (normalizado — independente de provider) ──────────────
export interface EmitirProviderPayload {
  idempotencyKey: string;
  ambiente: string;
  cliente: {
    nome: string;
    documento: string | null;
    tipo: 'PF' | 'PJ';
    email: string | null;
    telefone: string | null;
    endereco?: string | null;
    numero?: string | null;
    bairro?: string | null;
    municipio?: string | null;
    uf?: string | null;
    cep?: string | null;
    /** Tomador estrangeiro */
    idEstrangeiro?: string | null;
    pais?: string | null;
  };
  itens: Array<{
    descricao: string;
    quantidade: number;
    valorUnitario: number;
    codigoServicoMunicipal: string | null;
    unidade?: string;
  }>;
  valorTotal: number;
  codigoServico: string | null;
  aliquotaIss?: number;
  observacoesFiscais: string | null;
  referenciaPedidos: string[];
  referenciaFaturaId: number | null;
  /** Dados do prestador (empresa emissora) */
  prestador?: {
    cnpj: string | null;
    inscricaoMunicipal: string | null;
    codigoMunicipio: string | null;
    razaoSocial?: string | null;
  };
  /** Configuração tributária do tenant */
  config?: {
    serieRps?: string | null;
    itemListaServico?: string | null;
    aliquotaIss?: number | null;
    naturezaOperacao?: number | null;
    regimeTributario?: number | null;
    codigoMunicipio?: string | null;
    /** Código de tributação municipal do serviço (IPM, tag codigo_atividade) — não confundir com CNAE. */
    codigoAtividade?: string | null;
    /** IPM: situacao_tributaria (ex.: 0=TI, 1=TIRF com retenção no tomador). */
    situacaoTributariaIpm?: string | null;
    /** IPM: tributa_municipio_prestador S/N */
    tributaMunicipioPrestadorIpm?: string | null;
    /** IPM: tributa_municipio_tomador S/N */
    tributaMunicipioTomadorIpm?: string | null;
  };
  /** Reforma Tributária 2026+ — controlado por configuração */
  reformaTributaria?: {
    cbsHabilitado: boolean;
    ibsHabilitado: boolean;
    cbsValor?: number;
    cbsAliquota?: number;
    ibsMunValor?: number;
    ibsUfValor?: number;
    ibsCbsBaseCalculo?: number;
    ibsCbsSituacaoTributaria?: string;
  };
}

// ─── Resposta da emissão (normalizada) ───────────────────────────────────────
export interface EmitirProviderResult {
  externalId: string;
  numeroNota: string;
  serie: string;
  status: 'emitida' | 'pendente' | 'erro';
  ambiente: string;
  chaveAcesso?: string;
  protocolo?: string;
  xmlUrl?: string;
  pdfUrl?: string;
  /** Payload bruto enviado ao provider (para log) */
  providerRequest: Record<string, unknown>;
  /** Resposta bruta do provider (para log) */
  providerResponse: Record<string, unknown>;
  mensagem?: string;
}

// ─── Payload de cancelamento ──────────────────────────────────────────────────
export interface CancelarProviderPayload {
  externalId: string;
  reason: string;
}

// ─── Interface pública ────────────────────────────────────────────────────────
export interface IFiscalProvider {
  /**
   * Autentica no provider externo, se necessário.
   * O FiscalAuthService controla cache de token — este método
   * é chamado apenas quando o token precisa ser renovado.
   */
  autenticar?(config: {
    apiBaseUrl: string;
    clientId: string;
    clientSecret: string;
  }): Promise<{ accessToken: string; expiresAt: string | null }>;

  /**
   * Emite uma nota fiscal via provider externo.
   */
  emitir(ctx: FiscalProviderContext, payload: EmitirProviderPayload): Promise<EmitirProviderResult>;

  /**
   * Consulta status de uma nota no provider externo.
   */
  consultarStatus(
    ctx: FiscalProviderContext,
    externalId: string,
  ): Promise<Record<string, unknown>>;

  /**
   * Solicita cancelamento de uma nota emitida.
   */
  cancelar(
    ctx: FiscalProviderContext,
    payload: CancelarProviderPayload,
  ): Promise<Record<string, unknown>>;

  /**
   * Baixa/retorna URL do XML da nota.
   */
  baixarXml(
    ctx: FiscalProviderContext,
    externalId: string,
  ): Promise<{ xmlUrl: string | null }>;

  /**
   * Baixa/retorna URL do PDF da nota.
   */
  baixarPdf(
    ctx: FiscalProviderContext,
    externalId: string,
  ): Promise<{ pdfUrl: string | null }>;
}
