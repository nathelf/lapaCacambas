import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';

// ===== CLIENTES =====
export function useClientes(
  filters?: { search?: string; status?: string; tipo?: string; page?: number; limit?: number },
) {
  return useQuery({
    queryKey: ['clientes', filters],
    queryFn:  () => api.fetchClientes(filters),
  });
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
export function usePedidos(filters?: {
  status?: string; clienteId?: number; search?: string;
  page?: number; limit?: number; dataInicio?: string; dataFim?: string;
}) {
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

export function useFiscalKpis() {
  return useQuery({ queryKey: ['fiscal-kpis'], queryFn: api.fetchFiscalKpis, staleTime: 60_000 });
}

export function useFiscalConfig() {
  return useQuery({ queryKey: ['fiscal-config'], queryFn: api.fetchFiscalConfig, staleTime: 300_000 });
}

export function useUpdateFiscalConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, any>) => api.updateFiscalConfig(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fiscal-config'] }),
  });
}

export function useTestarConexaoFiscal() {
  return useMutation({ mutationFn: api.testarConexaoFiscal });
}

export function useNotasFiscais(filters?: { status?: string; search?: string }) {
  return useQuery({ queryKey: ['notas-fiscais', filters], queryFn: () => api.fetchNotasFiscais(filters) });
}

export function useEmitirNotaFiscal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      pedidoIds: number[];
      faturaId?: number | null;
      forcarEmissao?: boolean;
      observacoesFiscais?: string | null;
    }) => api.emitirNotaFiscal(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notas-fiscais'] });
      qc.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
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

// ===== SESSÃO ATUAL =====
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn:  () => api.backendFetch<{ user: { id: string; email: string; roles: string[]; permissoes: string[] } }>('/api/auth/me'),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useHasPermissao(codigo: string): boolean {
  const { data } = useMe();
  return data?.user?.permissoes?.includes(codigo) ?? false;
}

// ===== USUÁRIOS =====
export function useUsuarios(busca?: string) {
  return useQuery({ queryKey: ['usuarios', busca], queryFn: () => api.fetchUsuarios(busca) });
}

export function useUsuario(id: string | undefined) {
  return useQuery({ queryKey: ['usuario', id], queryFn: () => api.fetchUsuario(id!), enabled: !!id });
}

export function useCreateUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createUsuario,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}

export function useUpdateUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateUsuario(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      qc.invalidateQueries({ queryKey: ['usuario', vars.id] });
    },
  });
}

export function usePatchUsuarioStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => api.patchUsuarioStatus(id, ativo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}

export function useDeleteUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteUsuario,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
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

// ===== LOGÍSTICA =====

export function useExecucoes(params?: { status?: string; data?: string; semAtribuicao?: boolean }) {
  return useQuery({
    queryKey: ['execucoes', params],
    queryFn: () => api.fetchExecucoes(params) as Promise<any[]>,
    refetchInterval: 30_000, // atualiza a cada 30s para refletir movimentação em campo
  });
}

export function useOrdensServico(params?: { status?: string; dataInicio?: string; dataFim?: string; page?: number }) {
  return useQuery({
    queryKey: ['ordens-servico', params],
    queryFn: () => api.fetchExecucoes(params) as Promise<{ data: any[]; total: number }>,
  });
}

export function useRotas(params?: { data?: string; motoristaId?: number; status?: string }) {
  return useQuery({
    queryKey: ['rotas', params],
    queryFn: () => api.fetchRotas(params),
    refetchInterval: 30_000,
  });
}

export function useAtribuirExecucao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motoristaId, veiculoId }: { id: number; motoristaId: number; veiculoId: number }) =>
      api.atribuirExecucao(id, motoristaId, veiculoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['execucoes'] }),
  });
}

export function useStatusExecucao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, observacao }: { id: number; status: string; observacao?: string }) =>
      api.atualizarStatusExecucao(id, status, { observacao }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['execucoes'] });
      qc.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
}

export function useCriarRota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { data: string; motoristaId: number; veiculoId: number; observacao?: string }) =>
      api.criarRota(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rotas'] }),
  });
}

export function useStatusRota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.atualizarStatusRota(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rotas'] }),
  });
}

export function useAdicionarParada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rotaId, dto }: { rotaId: number; dto: { pedidoId?: number; ordem: number; endereco?: string; tipo?: string } }) =>
      api.adicionarParadaRota(rotaId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rotas'] });
      qc.invalidateQueries({ queryKey: ['execucoes'] });
    },
  });
}

export function useRemoverParada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rotaId, paradaId }: { rotaId: number; paradaId: number }) =>
      api.removerParadaRota(rotaId, paradaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rotas'] });
      qc.invalidateQueries({ queryKey: ['execucoes'] });
    },
  });
}
