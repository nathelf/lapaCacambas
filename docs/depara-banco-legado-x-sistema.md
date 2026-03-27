# DE/PARA: banco legado × sistema (LAPACacambas)

Este documento consolida o que foi **inferido no repositório** e o que **depende de introspecção** nos dois bancos.  
O mapeamento **coluna a coluna** só fica fechado após `npm run migration:introspect` e preenchimento de `scripts/migration/config/mapping.json`.

---

## 1. Diagnóstico

### 1.1 O que o sistema (app + backend) espera

O modelo canônico está nas **migrations** em `supabase/migrations/` e nos tipos em `src/integrations/supabase/types.ts`.

**Tabelas criadas no schema base** (`20260327122540_*.sql` + extensões):

| Área | Tabelas |
|------|---------|
| Auth / RBAC | `profiles`, `user_roles` |
| CRM | `clientes`, `contatos_cliente`, `obras`, `enderecos_entrega` |
| Catálogo | `servicos`, `cacambas`, `unidades_cacamba`, `maquinas`, `veiculos`, `motoristas` |
| Operação | `pedidos`, `pedido_itens`, `pedido_historico`, `rotas`, `rota_paradas`, `execucoes` |
| Financeiro | `faturas`, `fatura_pedidos`, `cobrancas`, `boletos`, `contas_pagar` |
| Fiscal | `notas_fiscais`, `nota_fiscal_pedidos` |
| Fornecedores / materiais | `fornecedores`, `materiais` |
| Outros | `ocorrencias`, `anexos`, `logs_auditoria` |

**Extensões adicionais** (`20260327170000_*`, `20260327190000_*`): `configuracoes_fiscais_empresa`, `fiscal_integracao_logs`, `configuracoes_bancarias_empresa`, `banco_integracao_logs`.

**Tabelas referenciadas no código (Supabase `.from`)** — inclui uso em frontend/backend:

`clientes`, `contatos_cliente`, `obras`, `enderecos_entrega`, `cacambas`, `servicos`, `motoristas`, `veiculos`, `pedidos`, `pedido_historico`, `fatura_pedidos`, `boletos`, `faturas`, `notas_fiscais`, `fornecedores`, `materiais`, `unidades_cacamba`, `contas_pagar`, `profiles`, `user_roles`, `logs_auditoria`, `logs_integracao_bancaria`, `logs_integracao_fiscal`, `configuracoes_bancarias_empresa`, `configuracoes_fiscais_empresa`, `nota_fiscal_pedidos`, `banco_integracao_logs`, `fiscal_integracao_logs`.

### 1.2 O que o backup legado (cliente) trouxe

Na restauração do dump `pg_dump` custom (formato `PGDMP`), o schema **`public`** foi populado com tabelas de **outro sistema** (nomes em português, singular, PKs inteiras). Exemplos observados no restore:

`abastecimento`, `aterro`, `banco`, `boleto`, `boleto_fatura`, `cacamba`, `carro`, `carro_manutencao`, `cartorio`, `cliente`, `conta`, `contabancaria`, `contato`, `entrega`, `fatura`, `fluxo`, `fornecedor`, `funcionario`, `historico_material`, `itens_fatura`, `itens_material`, `locadora`, `marca_carro`, `material`, `mensagem`, `motorista`, `nivel1` … `nivel5`, `pedido`, `pedidotemp`, `seguro`, `temporaria`, `tipo_carro`, `tipo_combustivel`, `tipo_manutencao`, `tipo_pagamento`, `unidade_cacamba`.

**Isso não é o mesmo modelo** que `clientes` / `pedidos` da aplicação atual: nomes, cardinalidades, enums e FKs divergem.

### 1.3 Gaps principais

| Tema | Situação |
|------|----------|
| Nomes de tabelas | `cliente` ≠ `clientes`; `pedido` ≠ `pedidos`; etc. |
| PKs | Legado: `codigo_cliente`, `codigo_pedido`… Sistema: `id` BIGSERIAL em várias tabelas. |
| Auth | `profiles` / `user_roles` ligam a `auth.users` — **não existem no dump legado** típico. |
| Enums | Sistema usa tipos `status_pedido`, `tipo_cliente`, etc.; legado pode usar texto ou códigos. |
| Soft delete | Sistema usa `deleted_at` em várias entidades; legado pode não ter. |

---

## 2. DE/PARA de tabelas (técnico)

**Regra:** `tipo_relacao` só é confirmado após `legacy-schema.json` + `target-schema.json`.

| tabela_origem (legado) | tabela_destino (sistema) | tipo_relacao | Observação |
|-------------------------|---------------------------|--------------|------------|
| `cliente` | `clientes` | renomeada + transformação | Mapear colunas; PK `codigo_cliente` → `id` via `migration_legacy_id_map` + `legacy_codigo_cliente` |
| `pedido` | `pedidos` | renomeada + transformação | FK `cliente_id` resolve via mapa `cliente` |
| `contato` | `contatos_cliente` (ou etapa posterior) | renomeada / parcial | Validar FK para `clientes` |
| `cacamba` | `cacambas` | renomeada | Ajustar colunas e preços |
| `motorista` | `motoristas` | renomeada | Possível vínculo `user_id` opcional |
| `carro` | `veiculos` | renomeada | Modelo de frota pode diferir |
| `fatura` / `boleto` | `faturas` / `boletos` | renomeada + regra de negócio | Conferir 1:1 ou N:N com pedidos |
| `fornecedor` | `fornecedores` | renomeada | |
| `pedidos` (sistema) ↔ `pedido` (legado) | — | **não** homônimos | Cuidado com colisão de nome |

**Só no legado (exemplos):** `nivel1`…`nivel5`, `fluxo`, `cartorio`, `funcionario`, `historico_material`, `pedidotemp`, `temporaria` — decidir se viram tabelas novas, JSONB, ou apenas relatório fora do escopo do MVP.

**Só no sistema:** `profiles`, `user_roles`, `pedido_itens`, `rotas`, `execucoes`, `notas_fiscais`, `configuracoes_*`, logs de integração — **criados pela aplicação** ou migrations; não vêm do legado.

---

## 3. DE/PARA de colunas (modelo)

Preencher a planilha lógica abaixo **após** introspecção. O template JSON está em `scripts/migration/config/mapping.template.json`.

| tabela_origem | tabela_destino | coluna_origem | coluna_destino | tipo_origem | tipo_destino | transformação_necessaria | obrigatoria_no_destino | aceita_nulo | observacoes |
|---------------|----------------|---------------|----------------|-------------|--------------|---------------------------|--------------------------|-------------|-------------|
| *preencher* | *preencher* | *preencher* | *preencher* | *preencher* | *preencher* | *preencher* | *sim/não* | *sim/não* | * |

**Ferramentas:**

- `npm run migration:introspect` → gera `scripts/migration/artifacts/legacy-schema.json` e `target-schema.json`
- `npm run migration:compare` → gera `scripts/migration/artifacts/compare-report.md`

---

## 4. Decisões tomadas neste repositório

1. **Tabelas de rastreio:** `migration_legacy_id_map` + colunas `legacy_codigo_*` em entidades principais (migration `20260329200000_migration_legacy_bridge.sql`).
2. **ETL configurável:** `mapping.json` + ordem `loadOrder` + FKs resolvidas via mapa.
3. **Não** destruir dados no destino sem confirmação explícita; ETL suporta reexecução quando já existe `migration_legacy_id_map` (pula linhas já migradas).
4. **Auth:** utilizadores continuam em `auth.users`; perfis e papéis devem ser recriados ou sincronizados **fora** do dump legado, salvo se o cliente tiver um sistema de usuários mapeável (não assumido).

---

## 5. Próximos passos obrigatórios

1. Rodar introspecção nos dois bancos.
2. Completar `mapping.json` com colunas reais do legado.
3. Aplicar migration de bridge no **destino**.
4. Rodar `migration:etl:dry`, depois `migration:etl`.
5. Rodar `migration:validate` e revisar `validacao-report.md`.
