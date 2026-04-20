import { HttpFiscalProvider } from './http-fiscal.provider';
import { MockFiscalProvider } from './mock-fiscal.provider';
import type { IFiscalProvider } from './fiscal-provider.interface';
import { FiscalProvider, type FiscalProviderType } from '../fiscal.constants';

/**
 * Cria o provider correto baseado na configuração fiscal ativa.
 * Extensível: adicionar novos providers aqui sem tocar no FiscalService.
 */
export function providerFactory(providerName: string): IFiscalProvider {
  switch (providerName as FiscalProviderType) {
    case FiscalProvider.MOCK: return new MockFiscalProvider();
    case FiscalProvider.HTTP: return new HttpFiscalProvider();
    default:
      // Provider desconhecido: usar mock com aviso (nunca bloquear)
      console.warn(`[FiscalProvider] Provider desconhecido: "${providerName}". Usando mock.`);
      return new MockFiscalProvider();
  }
}
