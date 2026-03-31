# Sprint 1 — Nathalia: Módulo de Serviços
**Projeto:** Lapa Caçambas
**Data:** 31/03/2026
**Desenvolvido por:** Rodrigo (cobrindo Nathalia)
**Status:** Concluído

---

## 1. Contexto

A Sprint 1 da Nathalia tem como objetivo construir o **módulo de Serviços**, que é o cadastro central de tipos de serviço prestados pela empresa (locação de caçamba, locação de máquina, transporte, etc.).

Este módulo é **pré-requisito direto do módulo de Pedidos** (Sprint 2 da Nathalia): quando um pedido é criado, ele obrigatoriamente referencia um serviço — é o serviço que define o código fiscal e a alíquota ISS usados na emissão de NFS-e.

**Dependência:**
```
Serviços (S1 Nathalia) ──► Pedidos (S2 Nathalia) ──► Logística/Execuções (S3 Rodrigo)
```

---

## 2. Tabela no Banco de Dados

**Tabela:** `servicos`

| Coluna          | Tipo            | Observação                            |
|-----------------|-----------------|---------------------------------------|
| `id`            | serial PK       |                                       |
| `descricao`     | text NOT NULL   | Nome do serviço exibido no sistema    |
| `codigo_fiscal` | text nullable   | Código de serviço para NFS-e (ex: 7.09) |
| `aliquota`      | numeric(5,2)    | Alíquota ISS em percentual (ex: 3.00) |
| `ativo`         | boolean         | Soft disable — serviços nunca são deletados |
| `created_at`    | timestamptz     | Gerado automaticamente                |

> **Não há `deleted_at`**. Serviços não são excluídos — apenas desativados via `ativo = false`. Isso preserva o histórico de pedidos já criados com aquele serviço.

---

## 3. Backend

### 3.1 Arquivos criados

| Arquivo | Responsabilidade |
|--------|-----------------|
| `backend/src/modules/servicos/servicos.types.ts` | Tipos TypeScript (Row, Dto, Create, Update) |
| `backend/src/modules/servicos/servicos.service.ts` | Lógica de negócio + acesso ao banco |
| `backend/src/modules/servicos/servicos.controller.ts` | Rotas HTTP |

### 3.2 Types (`servicos.types.ts`)

```typescript
// Espelha exatamente as colunas da tabela
export type ServicoRow = {
  id: number;
  descricao: string;
  codigo_fiscal: string | null;
  aliquota: number;
  ativo: boolean;
  created_at: string;
};

// O que o frontend recebe — tudo em camelCase
export type ServicoDto = {
  id: number;
  descricao: string;
  codigoFiscal: string | null;
  aliquota: number;
  ativo: boolean;
  createdAt: string;
};

// Payload para criar
export type CreateServicoDto = {
  descricao: string;
  codigoFiscal?: string;
  aliquota?: number;
};

// Payload para editar — tudo opcional + permite alterar ativo
export type UpdateServicoDto = Partial<CreateServicoDto> & {
  ativo?: boolean;
};
```

### 3.3 Service (`servicos.service.ts`)

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `listar(apenasAtivos?)` | Lista serviços, ordenados por descrição. Por padrão traz todos; com `apenasAtivos=true` filtra só os ativos |
| `buscarPorId(id)` | Retorna um serviço pelo ID. Lança `"Serviço não encontrado."` se não existir |
| `criar(dto)` | Insere novo serviço. `aliquota` default = 0 se não informado |
| `atualizar(id, dto)` | Atualiza apenas os campos enviados (patch parcial via `Record<string, unknown>`) |

> **Sem função `deletar`** — exclusão não é permitida. Para desativar, usa-se `atualizar(id, { ativo: false })`.

### 3.4 Controller — Rotas (`servicos.controller.ts`)

Prefixo base: `/api/servicos`
Roles autorizados: `administrador`, `atendimento`, `gestor`, `fiscal`

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/servicos` | Lista todos os serviços. Query param `?apenasAtivos=true` filtra só ativos |
| `GET` | `/api/servicos/:id` | Retorna um serviço pelo ID. 404 se não encontrado |
| `POST` | `/api/servicos` | Cria novo serviço |
| `PUT` | `/api/servicos/:id` | Atualiza serviço (campos opcionais) |
| `PATCH` | `/api/servicos/:id/toggle` | Alterna `ativo` — se estava `true` vira `false` e vice-versa |

**Exemplos de payload:**

```json
// POST /api/servicos
{
  "descricao": "Locação de Caçamba 5m³",
  "codigoFiscal": "7.09",
  "aliquota": 3.00
}

// PUT /api/servicos/1
{
  "aliquota": 3.50
}

// PATCH /api/servicos/1/toggle
// (sem body — o backend busca o estado atual e inverte)
```

**Respostas de erro:**

```json
// 400 — ID inválido
{ "message": "ID inválido." }

// 404 — serviço não existe
{ "message": "Serviço não encontrado." }

// 500 — falha no banco
{ "message": "Falha ao criar serviço." }
```

### 3.5 Registro no `app.ts`

```typescript
import { servicosRouter } from './modules/servicos/servicos.controller';

app.use(
  '/api/servicos',
  requireAuth(['administrador', 'atendimento', 'gestor', 'fiscal']),
  servicosRouter
);
```

---

## 4. Frontend

### 4.1 Funções de API (`src/lib/api.ts`)

Quatro funções foram adicionadas na seção `SERVICOS`. Todas usam `backendRequest()` — chamadas autenticadas ao backend Node, não diretas ao Supabase.

> A função `fetchServicos()` original (que vai direto ao Supabase e só retorna ativos) foi **mantida** — ela é usada nos formulários de pedido como lookup rápido de serviços ativos. As novas funções são para o CRUD completo da tela de gestão.

```typescript
// Lista TODOS os serviços (ativos e inativos) — para a tela de gestão
export async function fetchServicosAll(): Promise<any[]>

// Cria novo serviço
export async function createServico(dto: {
  descricao: string;
  codigoFiscal?: string;
  aliquota?: number;
}): Promise<any>

// Atualiza campos específicos
export async function updateServico(
  id: number,
  dto: { descricao?: string; codigoFiscal?: string; aliquota?: number; ativo?: boolean }
): Promise<any>

// Alterna ativo/inativo sem precisar passar o estado atual
export async function toggleServico(id: number): Promise<any>
```

### 4.2 Hooks (`src/hooks/useQuery.ts`)

```typescript
// Leitura — lista completa (ativo + inativo)
export function useServicosAll()

// Mutations com invalidação automática de 'servicos-all' e 'servicos'
export function useCreateServico()
export function useUpdateServico()   // mutationFn: ({ id, data }) => ...
export function useToggleServico()   // mutationFn: (id) => ...
```

**Por que invalidar os dois query keys?**
`'servicos'` é o cache usado nos selects dos formulários de pedido. `'servicos-all'` é o cache da tela de gestão. Qualquer mutação precisa atualizar os dois para manter consistência.

### 4.3 Tela de Gestão — `ServicosPage`

**Arquivo:** `src/pages/servicos/ServicosPage.tsx`
**Rota:** `/servicos`
**Link no sidebar:** OPERAÇÕES → Serviços

**O que a tela tem:**

- `PageHeader` com título "Serviços", subtítulo e botão "Novo Serviço"
- Tabela com colunas: Descrição / Código Fiscal / Alíquota (%) / Status / Ações
- Status badge verde (ativo) ou cinza (inativo)
- Botão de editar por linha → abre modal preenchido
- Botão de toggle por linha → ícone `ToggleRight` verde (ativo) ou `ToggleLeft` cinza (inativo)
- Modal (Dialog) para criar/editar com os três campos

**Campos do formulário:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Descrição | text | Sim | Nome do serviço |
| Código Fiscal | text | Não | Código da NFS-e |
| Alíquota ISS (%) | number decimal | Não | Ex: 3.00 |

**Fluxo do modal:**
1. "Novo Serviço" → abre com campos em branco, chama `createServico`
2. "Editar" em uma linha → abre preenchido com dados do serviço, chama `updateServico`
3. Feedback via `toast.success` / `toast.error` (Sonner)
4. Após salvar, fecha o modal e o cache é invalidado automaticamente

---

## 5. Integração com o Módulo de Pedidos (Sprint 2)

Quando a Nathalia construir os pedidos, o campo `servico_id` da tabela `pedidos` vai referenciar esta tabela. O select de serviço no formulário de pedido já usa `useServicos()` (só ativos) — não precisa mudar.

Na emissão de NFS-e, o backend fiscal já busca `servicos.codigo_fiscal` e `servicos.aliquota` diretamente pelo join com `pedidos`. Isso já funciona no módulo fiscal atual.

**Campos que o módulo fiscal consome:**

```typescript
// Em fiscal.service.ts, ao montar o payload da nota:
codigoServico: pedido.servicos?.codigo_fiscal
aliquota:      pedido.servicos?.aliquota
```

---

## 6. Checklist Sprint 1 Nathalia

- [x] Tabela `servicos` no banco (existia)
- [x] `servicos.types.ts` — Row, Dto, CreateDto, UpdateDto
- [x] `servicos.service.ts` — listar, buscarPorId, criar, atualizar
- [x] `servicos.controller.ts` — GET, GET/:id, POST, PUT/:id, PATCH/:id/toggle
- [x] Registro no `app.ts` com `requireAuth`
- [x] `api.ts` — fetchServicosAll, createServico, updateServico, toggleServico
- [x] `useQuery.ts` — useServicosAll, useCreateServico, useUpdateServico, useToggleServico
- [x] `ServicosPage.tsx` — tabela + modal criar/editar + toggle
- [x] Rota `/servicos` no `App.tsx`
- [x] Link "Serviços" no `AppSidebar.tsx`
