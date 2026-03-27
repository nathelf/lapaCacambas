# Scripts de migração legado → sistema

| Ficheiro | Função |
|----------|--------|
| `schema-introspect.ts` | Gera JSON do schema (legado e destino) |
| `compare-schemas.ts` | Compara `artifacts/legacy-schema.json` × `target-schema.json` |
| `migracao_legado_para_sistema.ts` | ETL (lê `config/mapping.json`) |
| `validacao_migracao.ts` | Contagens e relatório pós-carga |
| `config/mapping.template.json` | Copiar para `mapping.json` e preencher |
| `sql/extract_schema.sql` | Consulta manual via `psql` |

Documentação: `docs/depara-banco-legado-x-sistema.md` e `docs/plano_migracao.md`.
