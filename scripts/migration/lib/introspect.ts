/**
 * Introspecção de schema PostgreSQL (public) para comparação legado × sistema.
 */
import pgPromise from "pg-promise";

const pgp = pgPromise();

export type ColumnInfo = {
  table_name: string;
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: string;
  column_default: string | null;
  ordinal_position: number;
};

export type FkInfo = {
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
  constraint_name: string;
};

export type TablePk = {
  table_name: string;
  column_name: string;
};

export type SchemaSnapshot = {
  generatedAt: string;
  connectionLabel: string;
  tables: string[];
  columns: ColumnInfo[];
  primaryKeys: TablePk[];
  foreignKeys: FkInfo[];
};

export async function introspectSchema(connectionString: string, label: string): Promise<SchemaSnapshot> {
  const db = pgp(connectionString);

  try {
  const tables = await db.map<{ table_name: string }>(
    `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
    `,
    [],
    (r) => r.table_name,
  );

  const columns = await db.manyOrNone<ColumnInfo>(
    `
    SELECT
      c.table_name,
      c.column_name,
      c.data_type,
      c.udt_name,
      c.is_nullable,
      c.column_default,
      c.ordinal_position
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    ORDER BY c.table_name, c.ordinal_position
    `,
  );

  const primaryKeys = await db.manyOrNone<TablePk>(
    `
    SELECT kcu.table_name::text, kcu.column_name::text
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'
    ORDER BY kcu.table_name, kcu.ordinal_position
    `,
  );

  const foreignKeys = await db.manyOrNone<FkInfo>(
    `
    SELECT
      tc.table_name::text AS table_name,
      kcu.column_name::text AS column_name,
      ccu.table_name::text AS foreign_table_name,
      ccu.column_name::text AS foreign_column_name,
      tc.constraint_name::text AS constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name
    `,
  );

  return {
    generatedAt: new Date().toISOString(),
    connectionLabel: label,
    tables,
    columns: columns ?? [],
    primaryKeys: primaryKeys ?? [],
    foreignKeys: foreignKeys ?? [],
  };
  } finally {
    await db.$pool.end();
  }
}
