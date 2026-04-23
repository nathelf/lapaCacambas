import { HttpFiscalProvider } from './http-fiscal.provider';
import { MockFiscalProvider } from './mock-fiscal.provider';
import { FocusNfeProvider } from './focus-nfe.provider';
import { AtendeNetProvider } from './atendenet.provider';
import type { IFiscalProvider } from './fiscal-provider.interface';
import { FiscalProvider, type FiscalProviderType } from '../fiscal.constants';
import { FiscalConfigurationError } from '../fiscal.errors';

/**
 * Cria o provider correto baseado na configuração fiscal do tenant.
 * Adicionar novo provider: criar a classe e registrar o case abaixo.
 * O FiscalService nunca importa diretamente nenhum provider — só usa esta factory.
 */
export function providerFactory(providerName: string): IFiscalProvider {
  switch (providerName as FiscalProviderType) {
    case FiscalProvider.MOCK:       return new MockFiscalProvider();
    case FiscalProvider.HTTP:       return new HttpFiscalProvider();
    case FiscalProvider.FOCUS:      return new FocusNfeProvider();
    case FiscalProvider.ATENDENET:  return new AtendeNetProvider();
    default:
      throw new FiscalConfigurationError(
        `Provider fiscal desconhecido: "${providerName}". Configure um provider suportado (focus, atendenet, http).`,
      );
  }
}
