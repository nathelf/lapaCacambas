# Sprint 2 — Nathalia: Módulo de Pedidos
**Projeto:** Lapa Caçambas
**Data:** 31/03/2026
**Desenvolvido por:** Rodrigo (cobrindo Nathalia)
**Status:** Concluído

---

## 1. Contexto

A Sprint 2 da Nathalia constrói o **módulo de Pedidos** — o coração operacional do sistema. É aqui que o atendimento abre um pedido de locação para um cliente, informa endereço de entrega, tipo de caçamba, período de locação e datas. O pedido nasce com status `orcamento` e percorre uma máquina de estados até ser faturado ou cancelado.

**Dependência direta da Sprint 1:**
```
Serviços (S1 Nathalia) ──► Pedidos (S2 Nathalia) ──► Logística/Execuções (S3 Rodrigo)
```

**Decisão de arquitetura:** leituras ficam no Supabase direto (RLS cuida da segurança), escritas e mudanças de status passam obrigatoriamente pelo backend Node (regras de negócio).

---

## 2. Banco de Dados

**Tabela principal:** `pedidos`

A tabela já existia nas migrations. Os campos relevantes para esta sprint:

| Coluna | Tipo | Observação |
|--------|------|-----------|
| `id` | serial PK | |
| `numero` | text | Gerado automaticamente pelo banco |
| `cliente_id` | integer FK | Referencia `clientes` |
| `endereco_entrega_id` | integer FK | Referencia `enderecos_entrega` |
| `cacamba_id` | integer FK | Referencia `cacambas` (tipo de caçamba) |
| `servico_id` | integer FK | Referencia `servicos` (para NFS-e) |
| `tipo` | enum | `entrega_cacamba`, `retirada_cacamba`, `troca_cacamba`, `locacao_maquina`, `transporte`, `servico_avulso` |
| `tipo_locacao` | enum | `dia`, `semana`, `quinzena`, `mes` |
| `status` | enum | Veja máquina de estados abaixo |
| `quantidade` | integer | Padrão 1 |
| `valor_unitario` | numeric | Preço por unidade |
| `valor_desconto` | numeric | Desconto em R$ |
| `valor_total` | numeric | Calculado: `(valor_unitario * quantidade) - valor_desconto` |
| `data_desejada` | date | Data que o cliente quer a entrega |
| `data_retirada_prevista` | date | Previsão de quando a caçamba será retirada |
| `observacao` | text | Observações do atendimento |
| `deleted_at` | timestamptz | Soft delete |

---

## 3. Máquina de Estados

```
orcamento
  ├──► aguardando_aprovacao ──► aprovado ──► pendente_programacao ──► programado
  │                                                                        │
  │                                                                    em_rota
  │                                                                        │
  │                                                                  em_execucao
  │                                                                        │
  │                                                                    concluido ──► faturado
  │
  └──► cancelado  (de qualquer status exceto concluido e faturado)
```

**Transições válidas definidas no backend:**

| De | Para |
|----|------|
| `orcamento` | `aguardando_aprovacao`, `cancelado` |
| `aguardando_aprovacao` | `aprovado`, `cancelado` |
| `aprovado` | `pendente_programacao`, `cancelado` |
| `pendente_programacao` | `programado`, `cancelado` |
| `programado` | `em_rota`, `cancelado` |
| `em_rota` | `em_execucao`, `cancelado` |
| `em_execucao` | `concluido`, `cancelado` |
| `concluido` | `faturado` |
| `faturado` | *(terminal)* |
| `cancelado` | *(terminal)* |

> Qualquer tentativa de transição não listada retorna HTTP 422.

**Efeito colateral automático:** quando o status muda para `programado`, o backend insere automaticamente um registro na tabela `execucoes` com `status = 'pendente'`, pronto para a logística atribuir motorista e veículo.

---

## 4. Backend

### 4.1 Arquivos criados

| Arquivo | Responsabilidade |
|---------|-----------------|
| `backend/src/modules/pedidos/pedidos.types.ts` | Enums, Row, Dto, CreateDto, UpdateDto, ListQuery |
| `backend/src/modules/pedidos/pedidos.service.ts` | Lógica de negócio + acesso ao banco |
| `backend/src/modules/pedidos/pedidos.controller.ts` | Rotas HTTP |

### 4.2 Types (`pedidos.types.ts`)

Quatro camadas de tipos:

```typescript
// Enums
type TipoPedido   = 'entrega_cacamba' | 'retirada_cacamba' | ...
type TipoLocacao  = 'dia' | 'semana' | 'quinzena' | 'mes'
type StatusPedido = 'orcamento' | 'aguardando_aprovacao' | ... | 'cancelado'

// PedidoRow  — espelha colunas do banco (snake_case)
// PedidoDto  — o que o frontend recebe (camelCase)
// CreatePedidoDto / UpdatePedidoDto — payloads de entrada
// ListPedidosQuery — parâmetros de filtro/paginação
```

### 4.3 Service — Regras de negócio (`pedidos.service.ts`)

| Função | Descrição |
|--------|-----------|
| `listar(query)` | Paginado (max 100/página). Filtros: status, clienteId, dataInicio, dataFim, busca |
| `buscarPorId(id)` | Retorna pedido com joins (cliente, obra, serviço, caçamba) |
| `criar(dto, userId)` | Valida inadimplência + conflito de caçamba antes de inserir |
| `atualizar(id, dto, userId)` | Patch parcial; recalcula `valor_total` se componentes mudarem |
| `mudarStatus(id, dto, userId)` | Valida transição; cria execução ao chegar em `programado` |
| `deletar(id, userId)` | Soft delete; bloqueia pedidos `em_rota`, `em_execucao`, `concluido`, `faturado` |

**Regras de negócio em `criar()`:**
1. Cliente com `status = 'inadimplente'` → HTTP 422, pedido bloqueado
2. Caçamba já alocada em pedido ativo (não concluído/cancelado/faturado) → HTTP 422

### 4.4 Controller — Rotas (`pedidos.controller.ts`)

Prefixo base: `/api/pedidos`
Roles autorizados: `administrador`, `atendimento`, `gestor`, `fiscal`, `operador`

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/pedidos` | Lista paginada com filtros opcionais |
| `GET` | `/api/pedidos/:id` | Detalhe de um pedido |
| `POST` | `/api/pedidos` | Cria novo pedido |
| `PUT` | `/api/pedidos/:id` | Atualiza campos do pedido |
| `PATCH` | `/api/pedidos/:id/status` | Avança/muda status (valida transição) |
| `DELETE` | `/api/pedidos/:id` | Soft delete (apenas pedidos não iniciados) |

**Query params do GET /api/pedidos:**
```
?status=programado
?clienteId=42
?dataInicio=2026-01-01&dataFim=2026-03-31
?busca=joao       ← busca em número e observação
?page=1&limit=50  ← paginação (max 100)
```

**Exemplos de payload:**

```json
// POST /api/pedidos
{
  "clienteId": 42,
  "enderecoEntregaId": 7,
  "cacambaId": 2,
  "tipo": "entrega_cacamba",
  "tipoLocacao": "semana",
  "quantidade": 1,
  "valorUnitario": 350.00,
  "valorDesconto": 0,
  "dataDesejada": "2026-04-05",
  "dataRetiradaPrevista": "2026-04-12",
  "observacao": "Portão lateral, das 8h às 12h"
}

// PATCH /api/pedidos/1/status
{
  "status": "aprovado"
}
```

**Respostas de erro:**
```json
// 422 — cliente inadimplente
{ "message": "Cliente inadimplente. Pedido bloqueado." }

// 422 — caçamba já alocada
{ "message": "Caçamba já está alocada em outro pedido ativo." }

// 422 — transição inválida
{ "message": "Transição de \"orcamento\" para \"concluido\" não é permitida." }

// 422 — pedido em andamento não pode ser deletado
{ "message": "Pedido em andamento ou concluído não pode ser removido." }
```

### 4.5 Registro no `app.ts`

```typescript
import { pedidosRouter } from './modules/pedidos/pedidos.controller';

app.use(
  '/api/pedidos',
  requireAuth(['administrador', 'atendimento', 'gestor', 'fiscal', 'operador']),
  pedidosRouter
);
```

---

## 5. Frontend

### 5.1 Funções de API (`src/lib/api.ts`)

**Leituras — Supabase direto** (não passam pelo backend, RLS cuida da segurança):

```typescript
// Lista pedidos com filtros opcionais
export async function fetchPedidos(filters?: {
  status?: string;
  clienteId?: number;
  search?: string;
}): Promise<any[]>

// Detalhe de um pedido
export async function fetchPedido(id: number): Promise<any>

// Histórico de status (tabela pedido_historico)
export async function fetchPedidoHistorico(pedidoId: number): Promise<any[]>
```

**Escritas — backend Node** (regras de negócio validadas):

```typescript
// Cria novo pedido — POST /api/pedidos
export async function createPedido(dto: CreatePedidoDto): Promise<any>

// Muda status — PATCH /api/pedidos/:id/status
export async function updatePedidoStatus(
  id: number,
  status: string,
  obs?: string,
  extra?: any
): Promise<any>
```

**Lookup de clientes para formulários:**

```typescript
// Busca server-side: sem parâmetro → 50 mais recentes; com busca → filtra por nome/fantasia/CPF/CNPJ
export async function fetchClientesLookup(search?: string): Promise<any[]>
```

### 5.2 Hooks (`src/hooks/useQuery.ts`)

```typescript
export function usePedidos(filters?)        // leitura paginada
export function usePedido(id?)              // detalhe
export function useCreatePedido()           // mutation → invalida 'pedidos'
export function useUpdatePedidoStatus()     // mutation → invalida 'pedidos', 'pedido', 'pedido-historico'
export function usePedidoHistorico(id?)     // histórico de um pedido

// Lookup de clientes com busca server-side e debounce de 300ms
export function useClientesLookup(search?)  // busca >= 3 chars dispara query; sem busca → 50 recentes
```

> `useCreateCliente` e `useUpdateCliente` foram atualizados para invalidar também `['clientes-lookup']`, garantindo que o combobox do formulário de pedido reflita imediatamente clientes recém-cadastrados.

### 5.3 Tela de Novo Pedido — `PedidoFormPage`

**Arquivo:** `src/pages/pedidos/PedidoFormPage.tsx`
**Rota:** `/pedidos/novo`

**Campos do formulário:**

| Campo | Obrigatório | Comportamento |
|-------|-------------|---------------|
| Cliente | Sim | Combobox com busca server-side (Popover + Command). Exibe 50 mais recentes ao abrir; busca no banco com ≥ 3 caracteres. Debounce de 300ms |
| Endereço de Entrega | Sim | Select dependente do cliente — só habilita após selecionar cliente. Carrega endereços via `useEnderecosEntrega(clienteId)` |
| Tipo de Caçamba | Sim | Select dos tipos cadastrados em `cacambas` |
| Tipo de Locação | Não | Diária / Semanal / Quinzenal / Mensal |
| Quantidade | Não | Numérico, mínimo 1 |
| Valor Total (R$) | Não | Preenchido automaticamente pela tabela de preços da caçamba; editável manualmente |
| Data Desejada | Não | Date picker |
| Previsão de Retirada | Não | Date picker |
| Observações | Não | Textarea livre |

**Comportamentos automáticos:**
- Ao selecionar a caçamba ou trocar o tipo de locação, o valor é recalculado com base na tabela de preços da caçamba (`preco_dia`, `preco_semana`, `preco_quinzena`, `preco_mes`)
- Ao trocar o cliente, o endereço selecionado é limpo
- Sidebar exibe resumo em tempo real (cliente, caçamba, tipo de locação, quantidade, total)
- Quando a caçamba está selecionada, sidebar exibe tabela completa de preços com destaque no período atual

**Validações antes de salvar:**
1. Cliente obrigatório
2. Endereço de entrega obrigatório
3. Tipo de caçamba obrigatório

**Payload enviado ao backend (camelCase):**
```typescript
{
  clienteId: number,
  enderecoEntregaId: number,
  cacambaId: number,
  tipo: 'entrega_cacamba',
  tipoLocacao: string,
  quantidade: number,
  valorUnitario: number,   // valor / quantidade
  valorDesconto: 0,
  dataDesejada?: string,
  dataRetiradaPrevista?: string,
  observacao?: string,
}
```

**Após salvar:** redireciona para `/pedidos` com `toast.success`.

---

## 6. Integração com Sprint 3 (Logística)

Quando a logística avançar um pedido para `programado` via `PATCH /api/pedidos/:id/status`, o backend automaticamente cria um registro em `execucoes`:

```typescript
await supabaseAdmin.from('execucoes').insert({
  pedido_id: id,
  tipo: pedido.tipo,
  status: 'pendente',
  motorista_id: null,
  veiculo_id: null,
});
```

Esse registro fica aguardando o painel de programação (Sprint 3) atribuir motorista + veículo e avançar para `em_rota`.

---

## 7. Checklist Sprint 2 Nathalia

- [x] `pedidos.types.ts` — TipoPedido, TipoLocacao, StatusPedido, PedidoRow, PedidoDto, CreateDto, UpdateDto, UpdateStatusDto, ListQuery
- [x] `pedidos.service.ts` — listar, buscarPorId, criar, atualizar, mudarStatus, deletar
- [x] Máquina de estados com `TRANSICOES_VALIDAS`
- [x] Regra: cliente inadimplente bloqueado
- [x] Regra: caçamba não pode estar em dois pedidos ativos
- [x] Auto-criação de execução ao chegar em `programado`
- [x] `pedidos.controller.ts` — GET, GET/:id, POST, PUT/:id, PATCH/:id/status, DELETE/:id
- [x] Registro no `app.ts` com `requireAuth`
- [x] `api.ts` — fetchPedidos, fetchPedido, createPedido, updatePedidoStatus, fetchClientesLookup
- [x] `useQuery.ts` — usePedidos, usePedido, useCreatePedido, useUpdatePedidoStatus, useClientesLookup
- [x] `useCreateCliente` / `useUpdateCliente` invalidam `clientes-lookup`
- [x] `PedidoFormPage.tsx` — combobox de cliente com busca server-side + debounce
- [x] Cálculo automático de valor pela tabela de preços da caçamba
- [x] Sidebar de resumo em tempo real
