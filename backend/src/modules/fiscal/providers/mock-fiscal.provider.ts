import type {
  IFiscalProvider,
  FiscalProviderContext,
  EmitirProviderPayload,
  EmitirProviderResult,
  CancelarProviderPayload,
} from './fiscal-provider.interface';

/**
 * Provider mock para homologação.
 * Simula respostas do provider real sem fazer chamadas externas.
 * Nunca usar em produção.
 */
export class MockFiscalProvider implements IFiscalProvider {
  async emitir(ctx: FiscalProviderContext, payload: EmitirProviderPayload): Promise<EmitirProviderResult> {
    const externalId = `mock-${payload.idempotencyKey}`;
    const numeroNota = String(Math.floor(Math.random() * 900000) + 100000);

    return {
      externalId,
      numeroNota,
      serie: '1',
      status: 'emitida',
      ambiente: ctx.ambiente,
      chaveAcesso: Math.random().toString(36).slice(2).repeat(3).slice(0, 44),
      protocolo: `PRT-${Date.now()}`,
      xmlUrl: `https://mock.fiscal.local/xml/${externalId}.xml`,
      pdfUrl: `https://mock.fiscal.local/pdf/${externalId}.pdf`,
      providerRequest: { ...payload, accessToken: '[MASKED]' },
      providerResponse: { status: 'authorized', externalId, numeroNota },
      mensagem: 'Emissão mock realizada com sucesso.',
    };
  }

  async consultarStatus(_ctx: FiscalProviderContext, _externalId: string): Promise<Record<string, unknown>> {
    return { status: 'emitida' };
  }

  async cancelar(_ctx: FiscalProviderContext, input: CancelarProviderPayload): Promise<Record<string, unknown>> {
    return { status: 'cancelada', externalId: input.externalId, reason: input.reason };
  }

  async baixarXml(_ctx: FiscalProviderContext, externalId: string): Promise<{ xmlUrl: string | null }> {
    return { xmlUrl: `https://mock.fiscal.local/xml/${externalId}.xml` };
  }

  async baixarPdf(_ctx: FiscalProviderContext, externalId: string): Promise<{ pdfUrl: string | null }> {
    return { pdfUrl: `https://mock.fiscal.local/pdf/${externalId}.pdf` };
  }
}
