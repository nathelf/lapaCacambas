# Plano de execução — migração legado → sistema

## Pré-requisitos

1. **Dois Postgres acessíveis** (recomendado):
   - **LEGADO:** somente leitura (replica ou dump restaurado em instância temporária).
   - **DESTINO:** projeto Supabase (ou Postgres) com a **stack de migrations** do repositório (`supabase db push` / `supabase migration up` / SQL aplicado na ordem dos `supabase/migrations/*.sql`).

2. **Não** misturar no mesmo `public` um restore completo do legado **e** o schema novo sem planejamento — o histórico do projeto mostra que isso remove `clientes`/`profiles` e quebra a API.

3. Variáveis de ambiente (ex.: `.env` local, não commitado):

```env
LEGACY_DATABASE_URL=postgresql://postgres:...@host-legado:5432/postgres
TARGET_DATABASE_URL=postgresql://postgres:...@db.xxx.supabase.co:5432/postgres
# ou DATABASE_URL apontando para o destino
```

---

## Ordem recomendada de trabalho

### Fase A — Schema

1. Aplicar no **destino** a migration `supabase/migrations/20260329200000_migration_legacy_bridge.sql` (tabelas de mapa + colunas `legacy_*`).
2. Garantir que o destino tem o **schema da aplicação** (migrations anteriores do projeto).

### Fase B — Introspecção e DE/PARA

1. `npm run migration:introspect`  
   - Gera `scripts/migration/artifacts/legacy-schema.json` e `target-schema.json`
2. `npm run migration:compare`  
   - Gera `scripts/migration/artifacts/compare-report.md`
3. Copiar `scripts/migration/config/mapping.template.json` → `mapping.json`
4. Editar `mapping.json` com:
   - Nomes reais de colunas do legado (ex.: `nome` vs `nome_cliente`)
   - `defaults` para NOT NULL do sistema sem correspondente no legado
   - `foreignKeys` para FKs que dependem de entidades já migradas
   - `loadOrder` respeitando dependências (clientes antes de pedidos, etc.)

### Fase C — ETL

1. Dry-run: `npm run migration:etl:dry` — inspeciona SQL lógico sem gravar.
2. Execução: `npm run migration:etl` — em ambiente de **homologação** primeiro.

### Fase D — Validação

1. `npm run migration:validate` — contagens e mapa `migration_legacy_id_map`.
2. Revisar `scripts/migration/artifacts/validacao-report.md`.
3. Testes manuais na UI (clientes, pedidos, financeiro).

---

## Ordem de carga (referência)

Baseada nas FKs do sistema (migrations):

1. Cadastros sem FK externa: `servicos`, `cacambas`, `motoristas`, `veiculos`, `materiais`, `fornecedores` (ajustar conforme mapeamento real).
2. `clientes`
3. `contatos_cliente`, `obras`, `enderecos_entrega`
4. `unidades_cacamba` (depende de `cacambas`)
5. `pedidos` (depende de `clientes` e opcionalmente outras FKs)
6. `pedido_historico`, `faturas`, `fatura_pedidos`, `boletos`, `notas_fiscais` (conforme regras de negócio)

O array `loadOrder` em `mapping.json` deve refletir essa ordem.

---

## Rollback

- **Não** há rollback automático destrutivo no script.
- Para reimportar: apagar linhas em `migration_legacy_id_map` e/ou dados nas tabelas de destino **em transação** (planejado pelo DBA).
- Manter backup do destino antes do ETL.

---

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Perda de dados no destino | Backup; ETL primeiro em staging |
| Enum/status incompatível | `transforms.ts` + colunas default em `mapping.json` |
| FK órfã no legado | Log de erro; regra de skip ou valor sentinela documentado |
| Performance | Lotes (evolução futura do ETL); índices no legado |

---

## Comandos npm

| Script | Comando |
|--------|---------|
| Introspecção | `npm run migration:introspect` |
| Comparar | `npm run migration:compare` |
| ETL dry-run | `npm run migration:etl:dry` |
| ETL | `npm run migration:etl` |
| Validação | `npm run migration:validate` |
