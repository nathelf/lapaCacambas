import type { TransformName } from "./mapping-types.ts";

/**
 * Tabela de palavras pt-BR com posições de caracteres acentuados.
 * Usada para reconstruir strings onde bytes > 127 foram substituídos por '?'.
 *
 * Padrão: a chave é a palavra com '?' nos lugares dos acentos.
 * Exemplo: "LOCA??O" → "LOCAÇÃO"
 *
 * Ordenado do mais longo para o mais curto para evitar substituições parciais.
 */
const ENCODING_WORD_MAP: Array<[RegExp, string]> = [
  // Sufixos e terminações verbais/nominais comuns
  [/CONSTRU??ES/gi,   'CONSTRUÇÕES'],
  [/PRESTA??ES/gi,    'PRESTAÇÕES'],
  [/INSTALA??ES/gi,   'INSTALAÇÕES'],
  [/COMUNICA??ES/gi,  'COMUNICAÇÕES'],
  [/ADMINISTRA??O/gi, 'ADMINISTRAÇÃO'],
  [/CONSTRU??O/gi,    'CONSTRUÇÃO'],
  [/DISTRIBUI??O/gi,  'DISTRIBUIÇÃO'],
  [/COMERCIALIZA??O/gi, 'COMERCIALIZAÇÃO'],
  [/REPRESENTA??O/gi, 'REPRESENTAÇÃO'],
  [/PRESTA??O/gi,     'PRESTAÇÃO'],
  [/INSTALA??O/gi,    'INSTALAÇÃO'],
  [/COMUNICA??O/gi,   'COMUNICAÇÃO'],
  [/MANUTEN??O/gi,    'MANUTENÇÃO'],
  [/SOLU??ES/gi,      'SOLUÇÕES'],
  [/FUNDA??O/gi,      'FUNDAÇÃO'],
  [/LOCA??O/gi,       'LOCAÇÃO'],
  [/GEST?O/gi,        'GESTÃO'],
  [/SOLU??O/gi,       'SOLUÇÃO'],
  [/EDUCA??O/gi,      'EDUCAÇÃO'],
  [/EXPLORA??O/gi,    'EXPLORAÇÃO'],
  [/IMPORTA??O/gi,    'IMPORTAÇÃO'],
  [/EXPORTA??O/gi,    'EXPORTAÇÃO'],
  [/PRODU??O/gi,      'PRODUÇÃO'],
  [/FABRICA??O/gi,    'FABRICAÇÃO'],
  [/NAVEGA??O/gi,     'NAVEGAÇÃO'],
  [/NEGOCIA??O/gi,    'NEGOCIAÇÃO'],
  [/ATEN??O/gi,       'ATENÇÃO'],
  [/AQUISI??O/gi,     'AQUISIÇÃO'],
  [/EXECU??O/gi,      'EXECUÇÃO'],
  [/REDU??O/gi,       'REDUÇÃO'],
  [/AMPLIA??O/gi,     'AMPLIAÇÃO'],
  [/INFORMA??O/gi,    'INFORMAÇÃO'],

  // Palavras com Ç no meio/fim
  [/SERVI?OS/gi,   'SERVIÇOS'],
  [/SERVI?O/gi,    'SERVIÇO'],
  [/TERRA?OS/gi,   'TERRAÇOS'],
  [/BALAN?O/gi,    'BALANÇO'],
  [/ANUN?IO/gi,    'ANÚNCIO'],
  [/COMER?IO/gi,   'COMÉRCIO'],
  [/ESPA?O/gi,     'ESPAÇO'],
  [/ESPA?OS/gi,    'ESPAÇOS'],
  [/LI?A/gi,       'LIÇA'],
  [/FOR?A/gi,      'FORÇA'],
  [/FOR?AS/gi,     'FORÇAS'],
  [/FRAN?A/gi,     'FRANÇA'],
  [/LAN?A/gi,      'LANÇA'],
  [/A?O/gi,        'AÇO'],
  [/A?OES/gi,      'AÇÕES'],
  [/A??ES/gi,      'AÇÕES'],

  // Palavras com Ã no meio
  [/IRG?O/gi,   'IRMÃO'],
  [/IRM?OS/gi,  'IRMÃOS'],
  [/PL?STICO/gi, 'PLÁSTICO'],

  // Palavras comuns em razão social
  [/COM?RCIO/gi,  'COMÉRCIO'],
  [/IND?STRIA/gi, 'INDÚSTRIA'],
  [/IND?STRIAS/gi,'INDÚSTRIAS'],
  [/TEC?OLOGIA/gi,'TECNOLOGIA'],
  [/ENGENHARIA/gi, 'ENGENHARIA'],  // sem acento, só garante
  [/TERRAPLANAGEM/gi, 'TERRAPLANAGEM'],
  [/AGR?COLA/gi,  'AGRÍCOLA'],
  [/PETR?LEO/gi,  'PETRÓLEO'],
  [/M?QUINAS/gi,  'MÁQUINAS'],
  [/M?QUINA/gi,   'MÁQUINA'],
  [/ELETR?NICA/gi,'ELETRÔNICA'],
  [/ELETR?NICO/gi,'ELETRÔNICO'],

  // Sufixos jurídicos
  [/LTDA\.?/gi,    'LTDA.'],
  [/S\.A\.?/gi,    'S.A.'],
  [/EIRELI/gi,     'EIRELI'],
  [/ME/gi,         'ME'],
];

/**
 * Tenta reconstruir texto com '?' onde havia caracteres acentuados pt-BR.
 * Aplica dicionário de palavras comuns em razão social e endereços brasileiros.
 */
export function fixEncodingBroken(text: unknown): unknown {
  if (typeof text !== 'string') return text;
  if (!text.includes('?')) return text;

  let result = text.trim();
  for (const [pattern, replacement] of ENCODING_WORD_MAP) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/** Mapeia rótulos legados para enums do sistema. */
const STATUS_PEDIDO_MAP: Record<string, string> = {
  // valores char do legado (D=Depositado, C=Cancelado, L=Locado, A=Aberto)
  d: "concluido",
  c: "cancelado",
  l: "pendente_programacao",
  a: "orcamento",
  // valores textuais (fallback)
  aberto: "orcamento",
  pendente: "pendente_programacao",
  entregue: "concluido",
  concluido: "concluido",
  cancelado: "cancelado",
  faturado: "faturado",
};

const TIPO_LOCACAO_MAP: Record<string, string> = {
  d: "dia",
  s: "semana",
  q: "quinzena",
  m: "mes",
  dia: "dia",
  semana: "semana",
  quinzena: "quinzena",
  mes: "mes",
};

const TIPO_CLIENTE_MAP: Record<string, string> = {
  f: "pf",
  j: "pj",
  pf: "pf",
  pj: "pj",
};

/**
 * status_cliente legado: 0=ativo, 1=inativo, 2=bloqueado
 * (também aceita A/I/B e ATIVO/INATIVO/BLOQUEADO para compatibilidade)
 */
function legacyClienteStatus(value: unknown): string {
  if (value == null) return "ativo";
  const s = String(value).trim().toUpperCase();
  if (s === "0" || s === "A" || s === "ATIVO") return "ativo";
  if (s === "1" || s === "I" || s === "INATIVO") return "inativo";
  if (s === "2" || s === "B" || s === "BLOQUEADO") return "bloqueado";
  return "ativo";
}

/**
 * tipo_cliente legado: 0=pj, 1=pf
 * (também aceita F/J e PF/PJ)
 */
function legacyCharTipoCliente(value: unknown): string {
  if (value == null) return "pj";
  const s = String(value).trim().toUpperCase();
  if (s === "1" || s === "F" || s === "PF") return "pf";
  if (s === "0" || s === "J" || s === "PJ") return "pj";
  return "pj";
}

export function applyTransform(
  value: unknown,
  transform: TransformName | undefined,
  row: Record<string, unknown>,
): unknown {
  if (transform === undefined) return value;
  if (transform === "trim" && typeof value === "string") return value.trim();
  if (transform === "fix_encoding") return fixEncodingBroken(value);
  if (transform === "trim_fix_encoding" && typeof value === "string") {
    return fixEncodingBroken(value.trim());
  }
  if (transform === "empty_to_null") {
    if (value === null || value === undefined) return null;
    if (typeof value === "string" && value.trim() === "") return null;
    return value;
  }
  if (transform === "legacy_status_pedido") {
    if (value == null) return "orcamento";
    const k = String(value).trim().toLowerCase();
    return STATUS_PEDIDO_MAP[k] ?? "orcamento";
  }
  if (transform === "legacy_tipo_locacao") {
    if (value == null) return "dia";
    const k = String(value).trim().toLowerCase();
    return TIPO_LOCACAO_MAP[k] ?? "dia";
  }
  if (transform === "char_to_bool") {
    if (value == null) return false;
    const s = String(value).trim().toUpperCase();
    return s === "S" || s === "Y" || s === "TRUE" || s === "1";
  }
  if (transform === "legacy_tipo_cliente" && value != null) {
    const k = String(value).toLowerCase();
    return TIPO_CLIENTE_MAP[k] ?? "pj";
  }
  if (transform === "legacy_cliente_status") {
    return legacyClienteStatus(value);
  }
  if (transform === "legacy_char_tipo_cliente") {
    return legacyCharTipoCliente(value);
  }
  if (transform === "int_to_string" && value != null) {
    return String(value);
  }
  if (transform === "valor_to_unitario_pedido") {
    const qtde = Number(row.qtde ?? row.quantidade ?? 1) || 1;
    const valor = Number(row.valor ?? 0);
    return Math.round((valor / qtde) * 100) / 100;
  }
  void row;
  return value;
}
