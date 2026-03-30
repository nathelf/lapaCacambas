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

Base URL local: `http://localhost:3000`
Base URL produção: variável de ambiente `VITE_API_URL`

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
- Datas como string ISO 8601: `"2026-03-30T00:00:00Z"`
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
- 500: erro interno (logado no servidor)

---

## 4. Tabela Execucoes — Interface Crítica Compartilhada

> ⚠️ Esta tabela é escrita pelo módulo de logística (Rodrigo) e lida pelo módulo fiscal (Nathalia).
> O schema definitivo deve ser acordado antes de qualquer implementação da Sprint 3.

Campos acordados até agora:
- `id`, `pedido_id`, `motorista_id`, `veiculo_id`
- `status` → enum `StatusExecucao` (em andamento, concluida, cancelada)
- `data_execucao`, `observacao`
- `created_at`, `updated_at`

Campos pendentes de definição (combinar com Nathalia):
- Referência para nota fiscal gerada
- Campos necessários para emissão automática de NF

---

## 5. RBAC — Roles do Sistema

| Role | Descrição |
|------|-----------|
| `administrador` | Acesso total |
| `gestor` | Gestão operacional completa |
| `atendimento` | Cadastros e pedidos |
| `operador` | Ativos e execução |
| `fiscal` | Notas fiscais e faturamento |
| `financeiro` | Boletos e contas |
| `motorista` | App mobile (futuro) |

Definido em `shared/enums.ts` → `AppRole`.
