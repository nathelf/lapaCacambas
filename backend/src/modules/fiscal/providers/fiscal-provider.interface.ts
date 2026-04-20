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
    municipio?: string | null;
    cep?: string | null;
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
