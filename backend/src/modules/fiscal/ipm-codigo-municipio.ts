/**
 * IPM / AtendeNet (NTE-35): tags `<cidade>` e `<codigo_local_prestacao_servico>` esperam o
 * código municipal curto usado pelo provedor (TOM / SIAFI, em geral 4 dígitos), não o IBGE (7 dígitos).
 * Cadastros que guardam só o IBGE geram XML com 7 dígitos e a prefeitura pode validar alíquota/item contra tabela errada (ex.: erro 00034).
 *
 * Mapeamento ampliável conforme novos municípios AtendeNet forem integrados.
 */
export const IBGE_PARA_CODIGO_IPM_MUNICIPIO: Record<string, string> = {
  '4104808': '7493', // Cascavel/PR (IBGE → SIAFI / código IPM)
  '4113205': '4745', // Lapa/PR — TOM usado no manual/NfseConfig do projeto
};

export function normalizarCodigoMunicipioIpm(raw: string | null | undefined): string {
  const d = String(raw ?? '')
    .trim()
    .replace(/\D/g, '');
  if (d.length === 7 && IBGE_PARA_CODIGO_IPM_MUNICIPIO[d]) {
    return IBGE_PARA_CODIGO_IPM_MUNICIPIO[d];
  }
  return d;
}
