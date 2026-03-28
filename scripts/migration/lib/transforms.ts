import type { TransformName } from "./mapping-types.ts";

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
