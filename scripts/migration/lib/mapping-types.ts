export type TransformName =
  | "trim"
  | "empty_to_null"
  | "fix_encoding"
  | "trim_fix_encoding"
  | "legacy_status_pedido"
  | "legacy_tipo_cliente"
  | "legacy_cliente_status"
  | "legacy_char_tipo_cliente"
  | "legacy_tipo_locacao"
  | "char_to_bool"
  | "int_to_string"
  | "valor_to_unitario_pedido";

export type ColumnMapping = {
  source: string;
  target: string;
  transform?: TransformName;
};

export type ForeignKeyMapping = {
  sourceColumn: string;
  targetColumn: string;
  mapsFromEntity: string;
};

export type TableMappingConfig = {
  entityType: string;
  sourceTable: string;
  targetTable: string;
  sourcePk: string;
  targetPk: string;
  legacyColumnOnTarget?: string;
  columns: ColumnMapping[];
  defaults?: Record<string, unknown>;
  foreignKeys?: ForeignKeyMapping[];
  where?: string;
};

export type MigrationMappingFile = {
  loadOrder: string[];
  tables: Record<string, TableMappingConfig>;
};
