import { randomUUID } from 'node:crypto';
import { BaseFiscalProvider, type CancelProviderInput, type EmitProviderInput, type FiscalProviderContext } from './base-fiscal.provider';
import type { FiscalProviderEmitDTO } from '../fiscal.types';

export class MockFiscalProvider extends BaseFiscalProvider {
  async emitir(ctx: FiscalProviderContext, input: EmitProviderInput): Promise<FiscalProviderEmitDTO> {
    const externalId = `mock-${input.idempotencyKey}`;
    const numeroNota = String(Math.floor(Math.random() * 900000) + 100000);
    return {
      externalId,
      numeroNota,
      serie: '1',
      status: 'emitida',
      ambiente: ctx.ambiente,
      chaveAcesso: randomUUID().replaceAll('-', '').slice(0, 44),
      protocolo: `PRT-${Date.now()}`,
      xmlUrl: `https://mock.fiscal.local/xml/${externalId}.xml`,
      pdfUrl: `https://mock.fiscal.local/pdf/${externalId}.pdf`,
      providerRequest: input.payload,
      providerResponse: { status: 'authorized', externalId, numeroNota },
      mensagem: 'Emissão mock realizada com sucesso.',
    };
  }

  async consultarStatus(): Promise<Record<string, unknown>> {
    return { status: 'emitida' };
  }

  async cancelar(_ctx: FiscalProviderContext, input: CancelProviderInput): Promise<Record<string, unknown>> {
    return { status: 'cancelada', externalId: input.externalId, reason: input.reason };
  }

  async baixarXml(_ctx: FiscalProviderContext, externalId: string): Promise<{ xmlUrl: string | null }> {
    return { xmlUrl: `https://mock.fiscal.local/xml/${externalId}.xml` };
  }

  async baixarPdf(_ctx: FiscalProviderContext, externalId: string): Promise<{ pdfUrl: string | null }> {
    return { pdfUrl: `https://mock.fiscal.local/pdf/${externalId}.pdf` };
  }
}

