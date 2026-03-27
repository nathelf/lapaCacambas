import { HttpFiscalProvider } from './http-fiscal.provider';
import { MockFiscalProvider } from './mock-fiscal.provider';
import type { BaseFiscalProvider } from './base-fiscal.provider';

export function providerFactory(providerName: string): BaseFiscalProvider {
  if (providerName === 'mock') return new MockFiscalProvider();
  return new HttpFiscalProvider();
}

