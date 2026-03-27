import type { BancoProviderEmitDTO } from '../boleto.types';

export interface BancoProviderContext {
  accessToken: string;
  apiBaseUrl: string | null;
  ambiente: string;
  bancoNome: string;
}

export abstract class BaseBancoProvider {
  abstract emitirBoleto(ctx: BancoProviderContext, payload: Record<string, unknown>, idempotencyKey: string): Promise<BancoProviderEmitDTO>;
  abstract consultarBoleto(ctx: BancoProviderContext, externalId: string): Promise<Record<string, unknown>>;
  abstract cancelarBoleto(ctx: BancoProviderContext, externalId: string, reason: string): Promise<Record<string, unknown>>;
  abstract registrarPagamento(ctx: BancoProviderContext, payload: Record<string, unknown>): Promise<Record<string, unknown>>;
  abstract baixarPdf(ctx: BancoProviderContext, externalId: string): Promise<{ pdfUrl: string | null }>;
}

