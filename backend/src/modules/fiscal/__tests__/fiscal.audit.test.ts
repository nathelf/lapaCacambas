/**
 * Testes do serviço de auditoria — foco em maskSensitiveData.
 */
import { describe, it, expect } from 'vitest';
import { maskSensitiveData } from '../fiscal.audit.service';

describe('maskSensitiveData()', () => {
  it('mascara api_key no nível raiz', () => {
    const result = maskSensitiveData({ api_key: 'secret-key-123', nome: 'Teste' });
    expect(result.api_key).toBe('[MASKED]');
    expect(result.nome).toBe('Teste');
  });

  it('mascara accessToken (camelCase)', () => {
    const result = maskSensitiveData({ accessToken: 'bearer-token', status: 'ok' });
    expect(result.accessToken).toBe('[MASKED]');
    expect(result.status).toBe('ok');
  });

  it('mascara client_secret', () => {
    const result = maskSensitiveData({ client_secret: 'my-secret', client_id: 'my-id' });
    expect(result.client_secret).toBe('[MASKED]');
    expect(result.client_id).toBe('my-id'); // client_id não é sensível
  });

  it('mascara campos sensíveis em objetos aninhados', () => {
    const result = maskSensitiveData({
      config: { api_key: 'nested-key', ambiente: 'producao' },
      top: 'level',
    });
    expect((result.config as any).api_key).toBe('[MASKED]');
    expect((result.config as any).ambiente).toBe('producao');
    expect(result.top).toBe('level');
  });

  it('mascara em arrays aninhados', () => {
    const result = maskSensitiveData([
      { token: 'token-a', id: 1 },
      { token: 'token-b', id: 2 },
    ]);
    expect(result[0].token).toBe('[MASKED]');
    expect(result[0].id).toBe(1);
    expect(result[1].token).toBe('[MASKED]');
  });

  it('não modifica o objeto original (deep copy)', () => {
    const original = { api_key: 'real-key', nome: 'original' };
    const masked = maskSensitiveData(original);
    expect(original.api_key).toBe('real-key'); // original não foi mutado
    expect(masked.api_key).toBe('[MASKED]');
  });

  it('retorna primitivos sem alterar', () => {
    expect(maskSensitiveData(42)).toBe(42);
    expect(maskSensitiveData('string')).toBe('string');
    expect(maskSensitiveData(null)).toBeNull();
    expect(maskSensitiveData(undefined)).toBeUndefined();
  });

  it('não mascara campos com nomes similares que não são sensíveis', () => {
    const result = maskSensitiveData({ api_base_url: 'https://api.example.com', tipo: 'producao' });
    // api_base_url não contém nenhum campo sensível como subchave
    expect(result.api_base_url).toBe('https://api.example.com');
  });

  it('é case-insensitive na detecção de campos sensíveis', () => {
    const result = maskSensitiveData({ API_KEY: 'value', AccessToken: 'token' });
    expect(result.API_KEY).toBe('[MASKED]');
    expect(result.AccessToken).toBe('[MASKED]');
  });
});
