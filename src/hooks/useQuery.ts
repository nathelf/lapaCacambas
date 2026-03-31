import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';

// ===== CLIENTES =====
export function useClientes(search?: string, page = 1) {
  return useQuery({ queryKey: ['clientes', search, page], queryFn: () => api.fetchClientes(search, page) });
}

export function useClientesLookup(search?: string) {
  return useQuery({
    queryKey: ['clientes-lookup', search],
    queryFn: () => api.fetchClientesLookup(search),
  });
}

export function useCliente(id: number | undefined) {
  return useQuery({ queryKey: ['cliente', id], queryFn: () => api.fetchCliente(id!), enabled: !!id });
}

export function useCreateCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createCliente,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] });
      qc.invalidateQueries({ queryKey: ['clientes-lookup'] });
    },
  });
}

export function useUpdateCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateCliente(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] });
      qc.invalidateQueries({ queryKey: ['clientes-lookup'] });
    },
  });
}

// ===== PEDIDOS =====
export function usePedidos(filters?: { status?: string; clienteId?: number; search?: string }) {
  return useQuery({ queryKey: ['pedidos', filters], queryFn: () => api.fetchPedidos(filters) });
}

export function usePedido(id: number | undefined) {
  return useQuery({ queryKey: ['pedido', id], queryFn: () => api.fetchPedido(id!), enabled: !!id });
}

export function useCreatePedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createPedido,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pedidos'] }),
  });
}

export function useUpdatePedidoStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, obs, extra }: { id: number; status: string; obs?: string; extra?: any }) =>
      api.updatePedidoStatus(id, status, obs, extra),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pedidos'] });
      qc.invalidateQueries({ queryKey: ['pedido', vars.id] });
      qc.invalidateQueries({ queryKey: ['pedido-historico', vars.id] });
    },
  });
}

export function usePedidoHistorico(pedidoId: number | undefined) {
  return useQuery({
    queryKey: ['pedido-historico', pedidoId],
    queryFn: () => api.fetchPedidoHistorico(pedidoId!),
    enabled: !!pedidoId,
  });
}

// ===== FATURAS =====
export function useFaturas(filters?: { status?: string; clienteId?: number }) {
  return useQuery({ queryKey: ['faturas', filters], queryFn: () => api.fetchFaturas(filters) });
}

export function useCreateFatura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fatura, pedidoIds }: { fatura: any; pedidoIds: number[] }) =>
      api.createFatura(fatura, pedidoIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faturas'] });
      qc.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
}

// ===== NOTAS FISCAIS =====
export function useNotasFiscais(filters?: { status?: string; search?: string }) {
  return useQuery({ queryKey: ['notas-fiscais', filters], queryFn: () => api.fetchNotasFiscais(filters) });
}

export function useCreateNotaFiscal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ nota, pedidoIds }: { nota: any; pedidoIds: number[] }) =>
      api.createNotaFiscal(nota, pedidoIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notas-fiscais'] });
      qc.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
}

export function useCancelarNotaFiscal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.cancelarNotaFiscal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notas-fiscais'] });
      qc.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
}

// ===== BOLETOS =====
export function useBoletos(filters?: { status?: string; clienteId?: number }) {
  return useQuery({ queryKey: ['boletos', filters], queryFn: () => api.fetchBoletos(filters) });
}

export function useCreateBoleto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createBoleto,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boletos'] });
      qc.invalidateQueries({ queryKey: ['faturas'] });
      qc.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
}

export function useUpdateBoletoStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, extra }: { id: number; status: string; extra?: any }) =>
      api.updateBoletoStatus(id, status, extra),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boletos'] }),
  });
}

// ===== LOOKUP DATA =====
export function useCacambas() {
  return useQuery({ queryKey: ['cacambas'], queryFn: api.fetchCacambas });
}

export function useMotoristas() {
  return useQuery({ queryKey: ['motoristas'], queryFn: api.fetchMotoristas });
}

export function useMotoristasAll() {
  return useQuery({ queryKey: ['motoristas-all'], queryFn: api.fetchMotoristasAll });
}

export function useVeiculos() {
  return useQuery({ queryKey: ['veiculos'], queryFn: api.fetchVeiculos });
}

export function useVeiculosAll() {
  return useQuery({ queryKey: ['veiculos-all'], queryFn: api.fetchVeiculosAll });
}

export function useServicos() {
  return useQuery({ queryKey: ['servicos'], queryFn: api.fetchServicos });
}

export function useServicosAll() {
  return useQuery({ queryKey: ['servicos-all'], queryFn: api.fetchServicosAll });
}

export function useCreateServico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createServico,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['servicos-all'] });
      qc.invalidateQueries({ queryKey: ['servicos'] });
    },
  });
}

export function useUpdateServico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateServico(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['servicos-all'] });
      qc.invalidateQueries({ queryKey: ['servicos'] });
    },
  });
}

export function useToggleServico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.toggleServico,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['servicos-all'] });
      qc.invalidateQueries({ queryKey: ['servicos'] });
    },
  });
}

export function useContatos(clienteId: number | undefined) {
  return useQuery({
    queryKey: ['contatos', clienteId],
    queryFn: () => api.fetchContatos(clienteId!),
    enabled: !!clienteId,
  });
}

export function useEnderecosEntrega(clienteId: number | undefined) {
  return useQuery({
    queryKey: ['enderecos-entrega', clienteId],
    queryFn: () => api.fetchEnderecosEntrega(clienteId!),
    enabled: !!clienteId,
  });
}

export function useObras(clienteId?: number) {
  return useQuery({ queryKey: ['obras', clienteId], queryFn: () => api.fetchObras(clienteId) });
}

export function useFornecedores(search?: string) {
  return useQuery({ queryKey: ['fornecedores', search], queryFn: () => api.fetchFornecedores(search) });
}

export function useMateriais() {
  return useQuery({ queryKey: ['materiais'], queryFn: api.fetchMateriais });
}

export function useUnidadesCacamba() {
  return useQuery({ queryKey: ['unidades-cacamba'], queryFn: api.fetchUnidadesCacamba });
}

export function useContasPagar(filters?: { status?: string }) {
  return useQuery({ queryKey: ['contas-pagar', filters], queryFn: () => api.fetchContasPagar(filters) });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: api.fetchDashboardStats,
    refetchInterval: 30000,
  });
}

// ===== RELATÓRIOS =====
export function useRelatorioOperacional(filtros: api.FiltrosRelatorio, enabled = true) {
  return useQuery({
    queryKey: ['relatorio-operacional', filtros],
    queryFn: () => api.fetchRelatorioOperacional(filtros),
    enabled,
  });
}

export function useRelatorioFinanceiro(filtros: api.FiltrosRelatorio, enabled = true) {
  return useQuery({
    queryKey: ['relatorio-financeiro', filtros],
    queryFn: () => api.fetchRelatorioFinanceiro(filtros),
    enabled,
  });
}

export function useRelatorioBoletosEmitidos(filtros: api.FiltrosRelatorio, enabled = true) {
  return useQuery({
    queryKey: ['relatorio-boletos', filtros],
    queryFn: () => api.fetchRelatorioBoletosEmitidos(filtros),
    enabled,
  });
}

export function useRelatorioInadimplencia(filtros: api.FiltrosRelatorio, enabled = true) {
  return useQuery({
    queryKey: ['relatorio-inadimplencia', filtros],
    queryFn: () => api.fetchRelatorioInadimplencia(filtros),
    enabled,
  });
}
