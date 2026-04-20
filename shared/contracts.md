# Contratos Compartilhados — Lapa Caçambas

Documento que define as interfaces entre frontend e backend. Qualquer mudança aqui deve ser combinada entre Rodrigo (backend/infra) e Nathalia (fiscal/financeiro) antes de ser implementada.

---

## 1. Fonte de Verdade dos Enums

Todos os enums do sistema vivem em `shared/enums.ts`. Nunca duplique enums em `src/types/` ou `backend/src/`.

```
shared/enums.ts          ← definição canônica
src/types/enums.ts       ← re-export (import da shared)
backend/src/             ← importa direto de ../../../../shared/enums
```

---

## 2. Rotas da API

Base URL local: `http://localhost:3333`
Base URL produção: variável de ambiente `VITE_BACKEND_URL`

### Autenticação
| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| POST | /api/auth/login | público | Login com email/senha |
| POST | /api/auth/refresh | público | Refresh de token |
| POST | /api/auth/logout | autenticado | Invalidar sessão |
| GET | /api/auth/me | autenticado | Perfil do usuário logado |

### Clientes
| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| GET | /api/clientes | adm, atend, gestor, fiscal | Listar (paginado, filtros: busca, status, tipo) |
| GET | /api/clientes/:id | adm, atend, gestor, fiscal | Buscar por ID |
| POST | /api/clientes | adm, atend, gestor, fiscal | Criar |
| PUT | /api/clientes/:id | adm, atend, gestor, fiscal | Atualizar |
| DELETE | /api/clientes/:id | adm, atend, gestor, fiscal | Soft delete |

### Contatos do Cliente
| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| GET | /api/contatos?clienteId=N | adm, atend, gestor, fiscal | Listar contatos de um cliente |
| GET | /api/contatos/:id | adm, atend, gestor, fiscal | Buscar por ID |
| POST | /api/contatos | adm, atend, gestor, fiscal | Criar |
| PUT | /api/contatos/:id | adm, atend, gestor, fiscal | Atualizar |
| DELETE | /api/contatos/:id | adm, atend, gestor, fiscal | Deletar (físico) |

### Obras
| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| GET | /api/obras?clienteId=N&ativa=true | adm, atend, gestor, fiscal | Listar |
| GET | /api/obras/:id | adm, atend, gestor, fiscal | Buscar por ID |
| POST | /api/obras | adm, atend, gestor, fiscal | Criar |
| PUT | /api/obras/:id | adm, atend, gestor, fiscal | Atualizar |
| DELETE | /api/obras/:id | adm, atend, gestor, fiscal | Soft delete |

### Endereços de Entrega
| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| GET | /api/enderecos?clienteId=N&obraId=N | adm, atend, gestor, fiscal | Listar |
| GET | /api/enderecos/:id | adm, atend, gestor, fiscal | Buscar por ID |
| POST | /api/enderecos | adm, atend, gestor, fiscal | Criar |
| PUT | /api/enderecos/:id | adm, atend, gestor, fiscal | Atualizar |
| DELETE | /api/enderecos/:id | adm, atend, gestor, fiscal | Deletar (físico) |

### Caçambas (modelos/tipos)
| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| GET | /api/cacambas | adm, atend, gestor, operador | Listar modelos |
| GET | /api/cacambas/:id | adm, atend, gestor, operador | Buscar modelo |
| POST | /api/cacambas | adm, gestor | Criar modelo |
| PUT | /api/cacambas/:id | adm, gestor | Atualizar modelo |

### Unidades de Caçamba (físicas)
| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| GET | /api/cacambas/unidades?cacambaId=N&status=X | adm, atend, gestor, operador | Listar unidades |
| POST | /api/cacambas/unidades | adm, gestor | Criar unidade |
| PUT | /api/cacambas/unidades/:id | adm, gestor, operador | Atualizar status |

### Veículos
| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| GET | /api/veiculos | adm, gestor, operador | Listar |
| GET | /api/veiculos/:id | adm, gestor, operador | Buscar |
| POST | /api/veiculos | adm, gestor | Criar |
| PUT | /api/veiculos/:id | adm, gestor | Atualizar |

### Máquinas
| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| GET | /api/maquinas | adm, gestor, operador | Listar |
| GET | /api/maquinas/:id | adm, gestor, operador | Buscar |
| POST | /api/maquinas | adm, gestor | Criar |
| PUT | /api/maquinas/:id | adm, gestor | Atualizar |

### Motoristas
| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| GET | /api/motoristas | adm, gestor, operador | Listar |
| GET | /api/motoristas/:id | adm, gestor, operador | Buscar |
| POST | /api/motoristas | adm, gestor | Criar |
| PUT | /api/motoristas/:id | adm, gestor | Atualizar |

### Serviços
| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| GET | /api/servicos | adm, atend, gestor, fiscal | Listar |
| POST | /api/servicos | adm, gestor | Criar |
| PUT | /api/servicos/:id | adm, gestor | Atualizar |
| PATCH | /api/servicos/:id/toggle | adm, gestor | Ativar/desativar |

### Pedidos (Nathalia)
| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| GET | /api/pedidos?status=X&clienteId=N&search=X | adm, atend, gestor, fiscal, operador | Listar (paginado) |
| GET | /api/pedidos/:id | adm, atend, gestor, fiscal, operador | Buscar por ID |
| POST | /api/pedidos | adm, atend, gestor, fiscal, operador | Criar |
| PUT | /api/pedidos/:id | adm, atend, gestor, fiscal, operador | Atualizar |
| PATCH | /api/pedidos/:id/status | adm, atend, gestor, fiscal, operador | Avançar status |
| DELETE | /api/pedidos/:id | adm, atend, gestor | Soft delete |

> ⚠️ Ao avançar para `programado`, o módulo de pedidos cria automaticamente um registro em `execucoes` com `status: 'pendente'` e sem motorista/veículo. A logística (Rodrigo) preenche isso via `/api/logistica/execucoes/:id/atribuir`.

### Logística — Execuções (Rodrigo)
| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| GET | /api/logistica/execucoes | adm, gestor, operador | Listar execuções. Filtros: `status`, `data` (YYYY-MM-DD), `semAtribuicao=true` |
| GET | /api/logistica/execucoes/:id | adm, gestor, operador | Buscar execução por ID |
| PUT | /api/logistica/execucoes/:id/atribuir | adm, gestor, operador | Atribuir motorista e veículo a uma execução |
| PUT | /api/logistica/execucoes/:id/status | adm, gestor, operador | Atualizar status da execução |

**Body — atribuir execução:**
```json
{ "motoristaId": 1, "veiculoId": 2 }
```

**Body — atualizar status:**
```json
{ "status": "em_rota", "observacao": "...", "evidenciaUrl": "...", "latitude": -23.5, "longitude": -46.6 }
```

**Status válidos de execução:** `pendente` → `em_rota` → `no_local` → `executando` → `concluida` / `cancelada`

> ⚠️ Quando a execução vai para `concluida`, o pedido vinculado é automaticamente marcado como `concluido`.

### Logística — Rotas (Rodrigo)
| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| GET | /api/logistica/rotas | adm, gestor, operador | Listar rotas. Filtros: `data`, `motoristaId`, `status` |
| POST | /api/logistica/rotas | adm, gestor, operador | Criar rota para o dia |
| GET | /api/logistica/rotas/:id | adm, gestor, operador | Buscar rota com paradas |
| PUT | /api/logistica/rotas/:id/status | adm, gestor, operador | Atualizar status da rota |
| POST | /api/logistica/rotas/:id/paradas | adm, gestor, operador | Adicionar parada à rota |
| DELETE | /api/logistica/rotas/:id/paradas/:paradaId | adm, gestor, operador | Remover parada da rota |

**Body — criar rota:**
```json
{ "data": "2026-04-08", "motoristaId": 1, "veiculoId": 2, "observacao": "..." }
```

**Body — adicionar parada:**
```json
{ "pedidoId": 42, "ordem": 1, "endereco": "Rua X, 100", "tipo": "colocacao" }
```

**Status válidos de rota:** `planejada` → `em_andamento` → `concluida` / `cancelada`

> Ao adicionar uma parada com `pedidoId`, a `execucao` desse pedido é automaticamente vinculada via `rota_parada_id`.

### Fiscal (Nathalia)
| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| * | /api/fiscal/* | adm, fiscal, gestor, atend | Módulo fiscal completo |

### Financeiro (Nathalia)
| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| * | /api/* (financeiro) | adm, financeiro, fiscal, gestor, atend | Boletos, faturas |
| POST | /api/webhook/* | público | Webhooks externos (Sicoob) |

---

## 3. Convenções de Payload

### Request (frontend → backend)
- Sempre `camelCase`
- Datas como string ISO 8601: `"2026-04-08"` (só data) ou `"2026-04-08T10:00:00Z"` (com hora)
- IDs como `number`

### Response (backend → frontend)
- Sempre `camelCase` (conversão feita no `toDto()` do service)
- Campos de data: `createdAt`, `updatedAt`, `deletedAt`
- Listagens retornam array direto ou `{ data: [], total: N, page: N, limit: N }` quando paginado

### Erros
```json
{ "message": "Descrição do erro." }
```
- 400: input inválido
- 401: não autenticado
- 403: sem permissão para o role
- 404: recurso não encontrado
- 422: regra de negócio violada (motorista bloqueado, veículo em manutenção, etc.)
- 500: erro interno (logado no servidor)

---

## 4. Tabela Execucoes — Interface Crítica Compartilhada

> ✅ Schema definido e implementado na Sprint 3 (08/04/2026).

### Schema atual (`execucoes`)
```sql
id            BIGSERIAL PK
pedido_id     BIGINT FK pedidos(id)       -- criado pelo módulo de pedidos (Nathalia)
rota_parada_id BIGINT FK rota_paradas(id) -- preenchido pela logística ao adicionar parada
motorista_id  BIGINT FK motoristas(id)    -- preenchido via /execucoes/:id/atribuir
veiculo_id    BIGINT FK veiculos(id)      -- preenchido via /execucoes/:id/atribuir
tipo          TEXT                        -- herdado do pedido (colocacao, retirada, troca...)
status        status_execucao             -- pendente|em_rota|no_local|executando|concluida|cancelada
data_inicio   TIMESTAMPTZ                 -- setado ao entrar em em_rota ou executando
data_fim      TIMESTAMPTZ                 -- setado ao concluir ou cancelar
latitude      DOUBLE PRECISION            -- geolocalização do início/fim
longitude     DOUBLE PRECISION
observacao    TEXT
evidencia_url TEXT                        -- foto/URL de evidência de conclusão
created_at    TIMESTAMPTZ
updated_at    TIMESTAMPTZ
```

### Quem escreve o quê
| Campo | Responsável | Quando |
|-------|-------------|--------|
| `pedido_id`, `tipo`, `status=pendente` | Módulo pedidos (Nathalia) | Pedido avança para `programado` |
| `motorista_id`, `veiculo_id` | Logística (Rodrigo) via `/atribuir` | Operador faz atribuição no painel |
| `rota_parada_id` | Logística (Rodrigo) via `/rotas/:id/paradas` | Parada adicionada à rota |
| `status`, `data_inicio/fim`, `observacao`, `evidencia_url` | Logística (Rodrigo) via `/status` | Motorista avança o status em campo |
| Pedido → `concluido` | Automático | Execução vai para `concluida` |

### Pendente (combinar com Nathalia para Sprint 4)
- Campo para referência da nota fiscal gerada (`nota_fiscal_id`)
- Gatilho automático de geração de fatura ao concluir pedido

---

## 5. Tabelas de Rota

### `rotas`
```sql
id           BIGSERIAL PK
data         DATE                -- data da rota (filtro principal do painel)
motorista_id BIGINT FK
veiculo_id   BIGINT FK
status       TEXT                -- planejada|em_andamento|concluida|cancelada
observacao   TEXT
created_by   UUID FK auth.users
created_at   TIMESTAMPTZ
updated_at   TIMESTAMPTZ
```

### `rota_paradas`
```sql
id         BIGSERIAL PK
rota_id    BIGINT FK rotas(id) ON DELETE CASCADE
pedido_id  BIGINT FK pedidos(id)   -- nullable (parada sem pedido vinculado)
ordem      INT                     -- sequência na rota
endereco   TEXT
tipo       TEXT                    -- colocacao|retirada|troca
status     status_execucao
hora_chegada TIMESTAMPTZ
hora_saida   TIMESTAMPTZ
observacao TEXT
created_at TIMESTAMPTZ
```

---

## 6. RBAC — Roles do Sistema

| Role | Descrição |
|------|-----------|
| `administrador` | Acesso total |
| `gestor` | Gestão operacional completa |
| `atendimento` | Cadastros e pedidos |
| `operador` | Ativos, execuções e rotas |
| `fiscal` | Notas fiscais e faturamento |
| `financeiro` | Boletos e contas |
| `motorista` | App mobile (futuro — view only) |

Definido em `shared/enums.ts` → `AppRole`.

---

## 7. Histórico de Sprints

### Sprint 1 (27/03/2026)
- Auth/RBAC completo (JWT, 7 roles, guard por rota)
- Cadastros-base: clientes, obras, endereços, contatos
- Ativos: caçambas, veículos, máquinas, motoristas
- `shared/enums.ts` e `shared/contracts.md` criados

### Sprint 2 (27–29/03/2026)
- Serviços: CRUD completo (backend + frontend)
- Pedidos: CRUD completo, máquina de estados (10 status), OS
- Execução automática criada ao programar pedido
- Frontend: PedidosPage, PedidoFormPage, PedidoDetalhePage

### Sprint 3 — Logística (08/04/2026) — Rodrigo
- Módulo `backend/src/modules/logistica/` (types + service + controller)
- 9 endpoints em `/api/logistica/` para execuções e rotas
- `STATUS_EXECUCAO_LABELS` adicionado em `shared/enums.ts`
- Classes de status para execução/rota adicionadas ao `StatusBadge`
- 8 funções de API em `src/lib/api.ts`
- 7 hooks em `src/hooks/useQuery.ts` (queries + mutations com invalidação)
- `RotasPage.tsx` — painel completo de programação diária (duas colunas)

### Sprint 3 — Financeiro (pendente — Nathalia)
- Backend de faturas (gerar fatura por pedido concluído)
- Integração bancária boleto/Pix
- Controle de inadimplência
