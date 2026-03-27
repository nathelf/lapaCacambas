import type { TransformName } from "./mapping-types.ts";

/** Mapeia rótulos legados para enums do sistema (ajuste conforme dados reais). */
const STATUS_PEDIDO_MAP: Record<string, string> = {
  aberto: "orcamento",
  pendente: "pendente_programacao",
  entregue: "concluido",
  concluido: "concluido",
  cancelado: "cancelado",
  faturado: "faturado",
};

const TIPO_CLIENTE_MAP: Record<string, string> = {
  f: "pf",
  j: "pj",
  pf: "pf",
  pj: "pj",
};

/** status_cliente: legado costuma usar 1 char (ex.: A/I/B). */
function legacyClienteStatus(value: unknown): string {
  if (value == null) return "ativo";
  const s = String(value).trim().toUpperCase();
  if (s === "A" || s === "ATIVO" || s === "1") return "ativo";
  if (s === "I" || s === "INATIVO" || s === "2") return "inativo";
  if (s === "B" || s === "BLOQUEADO" || s === "3") return "bloqueado";
  return "ativo";
}

/** tipo_cliente: legado F/J ou PF/PJ */
function legacyCharTipoCliente(value: unknown): string {
  if (value == null) return "pj";
  const s = String(value).trim().toUpperCase();
  if (s === "F" || s === "PF" || s === "1") return "pf";
  if (s === "J" || s === "PJ" || s === "2") return "pj";
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
  if (transform === "legacy_status_pedido" && value != null) {
    const k = String(value).toLowerCase();
    return STATUS_PEDIDO_MAP[k] ?? "orcamento";
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
