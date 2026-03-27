-- Executar com psql no banco legado ou sistema para revisão manual:
--   psql "$DATABASE_URL" -f scripts/migration/sql/extract_schema.sql -o artifacts/columns.txt

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
ORDER BY c.table_name, c.ordinal_position;
