import { HttpBancoProvider } from './http-banco.provider';
import type { BaseBancoProvider } from './base-banco.provider';

export function bancoProviderFactory(_providerName: string): BaseBancoProvider {
  // Sem mock: sempre provider HTTP real.
  return new HttpBancoProvider();
}

