/**
 * Serviço de Auditoria Fiscal
 *
 * Responsabilidades:
 *  - Gravar eventos de ciclo de vida da nota fiscal em nota_fiscal_eventos
 *  - Gravar logs de integração em fiscal_integracao_logs
 *  - Mascarar campos sensíveis antes de qualquer persistência/log
 *  - Incluir correlationId em todos os registros
 */
import { supabaseAdmin } from '../../lib/supabase';
import { FISCAL_SENSITIVE_FIELDS, type FiscalOperacaoType } from './fiscal.constants';
import type { NotaFiscalStatusType } from './fiscal.constants';

// ─── Mascaramento de dados sensíveis ─────────────────────────────────────────

/**
 * Percorre recursivamente um objeto e substitui campos sensíveis por '[MASKED]'.
 * Não muta o objeto original — retorna cópia profunda mascarada.
 */
export function maskSensitiveData<T>(obj: T, depth = 0): T {
  if (depth > 10 || obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => maskSensitiveData(item, depth + 1)) as unknown as T;
  }

  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const isSensitive = (FISCAL_SENSITIVE_FIELDS as readonly string[]).some(
      (field) => key.toLowerCase().includes(field.toLowerCase()),
    );
    if (isSensitive) {
      masked[key] = '[MASKED]';
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value, depth + 1);
    } else {
      masked[key] = value;
    }
  }
  return masked as T;
}

// ─── Payloads de evento ───────────────────────────────────────────────────────

export interface FiscalEventPayload {
  notaFiscalId: number;
  statusAnterior?: NotaFiscalStatusType | null;
  statusNovo: NotaFiscalStatusType;
  descricao?: string;
  usuarioId?: string | null;
  correlationId?: string | null;
  dadosExtras?: Record<string, unknown>;
}

export interface FiscalIntegrationLogPayload {
  notaFiscalId: number;
  empresaId?: string | null;
  tipoOperacao: FiscalOperacaoType;
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
  httpStatus?: number;
  statusIntegracao?: string;
  mensagem?: string | null;
  tentativa?: number;
  usuarioId?: string | null;
  correlationId?: string | null;
}

// ─── Serviço ──────────────────────────────────────────────────────────────────

export class FiscalAuditService {

  /**
   * Registra uma transição de estado da nota fiscal em `nota_fiscal_eventos`.
   * Não lança exceção — falha silenciosa com log de console para não bloquear fluxo.
   */
  async registrarEvento(payload: FiscalEventPayload): Promise<void> {
    try {
      await supabaseAdmin.from('nota_fiscal_eventos').insert({
        nota_fiscal_id: payload.notaFiscalId,
        status_anterior: payload.statusAnterior ?? null,
        status_novo: payload.statusNovo,
        descricao: payload.descricao ?? null,
        usuario_id: payload.usuarioId ?? null,
        correlation_id: payload.correlationId ?? null,
        dados_extras: payload.dadosExtras
          ? maskSensitiveData(payload.dadosExtras)
          : null,
      });
    } catch (err) {
      // Auditoria nunca bloqueia o fluxo principal
      console.error('[FiscalAudit] Falha ao registrar evento:', {
        notaFiscalId: payload.notaFiscalId,
        statusNovo: payload.statusNovo,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Grava log de integração com provider externo em `fiscal_integracao_logs`.
   * Mascara automaticamente dados sensíveis no request/response.
   */
  async registrarLog(payload: FiscalIntegrationLogPayload): Promise<void> {
    try {
      await supabaseAdmin.from('fiscal_integracao_logs').insert({
        nota_fiscal_id: payload.notaFiscalId,
        empresa_id: payload.empresaId ?? null,
        tipo_operacao: payload.tipoOperacao,
        request_payload: payload.requestPayload
          ? maskSensitiveData(payload.requestPayload)
          : null,
        response_payload: payload.responsePayload
          ? maskSensitiveData(payload.responsePayload)
          : null,
        http_status: payload.httpStatus ?? null,
        status_integracao: payload.statusIntegracao ?? null,
        mensagem: payload.mensagem ?? null,
        tentativa: payload.tentativa ?? 1,
        usuario_id: payload.usuarioId ?? null,
        correlation_id: payload.correlationId ?? null,
      });
    } catch (err) {
      console.error('[FiscalAudit] Falha ao registrar log de integração:', {
        notaFiscalId: payload.notaFiscalId,
        tipoOperacao: payload.tipoOperacao,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Combina evento + log em uma única chamada (caso comum na emissão).
   */
  async registrarEmissao(params: {
    notaFiscalId: number;
    statusAnterior: NotaFiscalStatusType;
    statusNovo: NotaFiscalStatusType;
    empresaId?: string | null;
    requestPayload: Record<string, unknown>;
    responsePayload: Record<string, unknown>;
    httpStatus: number;
    mensagem?: string | null;
    usuarioId?: string | null;
    correlationId?: string | null;
  }): Promise<void> {
    await Promise.allSettled([
      this.registrarEvento({
        notaFiscalId: params.notaFiscalId,
        statusAnterior: params.statusAnterior,
        statusNovo: params.statusNovo,
        descricao: params.mensagem ?? 'Emissão processada',
        usuarioId: params.usuarioId,
        correlationId: params.correlationId,
        dadosExtras: { httpStatus: params.httpStatus },
      }),
      this.registrarLog({
        notaFiscalId: params.notaFiscalId,
        empresaId: params.empresaId,
        tipoOperacao: 'emitir',
        requestPayload: params.requestPayload,
        responsePayload: params.responsePayload,
        httpStatus: params.httpStatus,
        statusIntegracao: params.statusNovo,
        mensagem: params.mensagem,
        usuarioId: params.usuarioId,
        correlationId: params.correlationId,
      }),
    ]);
  }
}
