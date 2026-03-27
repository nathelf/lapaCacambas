import type { FiscalProviderEmitDTO } from '../fiscal.types';

export interface FiscalProviderContext {
  accessToken: string;
  apiBaseUrl: string | null;
  ambiente: string;
}

export interface EmitProviderInput {
  idempotencyKey: string;
  payload: Record<string, unknown>;
}

export interface CancelProviderInput {
  externalId: string;
  reason: string;
}

export abstract class BaseFiscalProvider {
  async authenticate(): Promise<void> {
    return;
  }
  abstract emitir(ctx: FiscalProviderContext, input: EmitProviderInput): Promise<FiscalProviderEmitDTO>;
  abstract consultarStatus(ctx: FiscalProviderContext, externalId: string): Promise<Record<string, unknown>>;
  abstract cancelar(ctx: FiscalProviderContext, input: CancelProviderInput): Promise<Record<string, unknown>>;
  abstract baixarXml(ctx: FiscalProviderContext, externalId: string): Promise<{ xmlUrl: string | null }>;
  abstract baixarPdf(ctx: FiscalProviderContext, externalId: string): Promise<{ pdfUrl: string | null }>;
}

