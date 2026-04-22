import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatusFiscalBadge } from '@/components/shared/StatusFiscalBadge';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchBar } from '@/components/shared/SearchBar';
import { EmptyState } from '@/components/shared/EmptyState';
import { EmitirNotaFiscalDrawer } from '@/components/pedidos/EmitirNotaFiscalDrawer';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, FileText, Eye, Loader2, ChevronLeft, ChevronRight, SlidersHorizontal, X, ListOrdered } from 'lucide-react';
import { usePedidos } from '@/hooks/useQuery';
import { useListFilters } from '@/hooks/useListFilters';
import { toast } from 'sonner';

const LIMIT = 20;

const STATUS_OPTIONS = [
  { value: '',                      label: 'Todos os status' },
  { value: 'orcamento',             label: 'Orçamento' },
  { value: 'aguardando_aprovacao',  label: 'Aguardando aprovação' },
  { value: 'aprovado',              label: 'Aprovado' },
  { value: 'pendente_programacao',  label: 'Pend. programação' },
  { value: 'programado',            label: 'Programado' },
  { value: 'em_rota',               label: 'Em rota' },
  { value: 'em_execucao',           label: 'Em execução' },
  { value: 'concluido',             label: 'Concluído' },
  { value: 'faturado',              label: 'Faturado' },
  { value: 'cancelado',             label: 'Cancelado' },
];

export default function PedidosPage() {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showDateFilters, setShowDateFilters] = useState(false);

  const { rawSearch, setSearch, filters, setFilter, resetFilters, page, setPage, hasActiveFilters } =
    useListFilters<{ status?: string; dataInicio?: string; dataFim?: string }>();

  const { data: result, isLoading, isFetching, refetch } = usePedidos({
    search:     filters.search,
    status:     filters.status,
    dataInicio: filters.dataInicio,
    dataFim:    filters.dataFim,
    page,
    limit: LIMIT,
  });

  const pedidos: any[] = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  const allSelected = pedidos.length > 0 && pedidos.every((p: any) => selectedIds.has(p.id));
  const toggleAll = () =>
    allSelected ? setSelectedIds(new Set()) : setSelectedIds(new Set(pedidos.map((p: any) => p.id)));
  const toggleOne = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedPedidos = pedidos.filter((p: any) => selectedIds.has(p.id));

  const handleEmitirLote = () => {
    if (selectedPedidos.length === 0) { toast.error('Selecione pelo menos um pedido'); return; }
    setDrawerOpen(true);
  };

  const handleEmitirIndividual = (pedido: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (pedido.statusFiscal === 'emitida') { toast.info('Nota já emitida para este pedido'); return; }
    setSelectedIds(new Set([pedido.id]));
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Pedidos"
        subtitle="Gestão de pedidos e ciclo operacional"
        actions={
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <Button variant="outline" size="sm" onClick={handleEmitirLote}>
                <FileText className="w-4 h-4 mr-1" /> Emitir NF ({selectedIds.size})
              </Button>
            )}
            <Button size="sm" onClick={() => navigate('/pedidos/novo')}>
              <Plus className="w-4 h-4 mr-1" /> Novo Pedido
            </Button>
          </div>
        }
      />

      {/* Toolbar de busca e filtros */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar
            value={rawSearch}
            onChange={setSearch}
            placeholder="Buscar por número, cliente ou observação..."
            isLoading={isFetching && !!rawSearch}
            className="max-w-sm"
          />

          <select
            value={filters.status ?? ''}
            onChange={e => setFilter('status', e.target.value || undefined)}
            className="h-9 px-3 rounded-md border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDateFilters(s => !s)}
            className={showDateFilters ? 'border-primary text-primary' : ''}
          >
            <SlidersHorizontal className="w-4 h-4 mr-1" />
            Período
            {(filters.dataInicio || filters.dataFim) && (
              <span className="ml-1.5 w-2 h-2 rounded-full bg-primary" />
            )}
          </Button>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground">
              <X className="w-3.5 h-3.5 mr-1" /> Limpar filtros
            </Button>
          )}
        </div>

        {showDateFilters && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/40 rounded-lg border">
            <div className="flex items-center gap-2 text-sm">
              <label className="text-muted-foreground font-medium">De:</label>
              <input
                type="date"
                value={filters.dataInicio ?? ''}
                onChange={e => setFilter('dataInicio', e.target.value || undefined)}
                className="h-8 px-2 rounded border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <label className="text-muted-foreground font-medium">Até:</label>
              <input
                type="date"
                value={filters.dataFim ?? ''}
                onChange={e => setFilter('dataFim', e.target.value || undefined)}
                className="h-8 px-2 rounded border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {(filters.dataInicio || filters.dataFim) && (
              <Button variant="ghost" size="sm" onClick={() => { setFilter('dataInicio', undefined); setFilter('dataFim', undefined); }}>
                <X className="w-3.5 h-3.5 mr-1" /> Limpar datas
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : pedidos.length === 0 ? (
        <EmptyState
          icon={<ListOrdered className="w-10 h-10" />}
          message="Nenhum pedido encontrado"
          description="Crie um pedido para começar"
          searchTerm={filters.search}
          hasFilters={hasActiveFilters}
          onClearFilters={hasActiveFilters ? resetFilters : undefined}
          action={
            <Button size="sm" onClick={() => navigate('/pedidos/novo')}>
              <Plus className="w-4 h-4 mr-1" /> Criar primeiro pedido
            </Button>
          }
        />
      ) : (
        <div className={`bg-card rounded-lg border overflow-x-auto transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
          <TooltipProvider>
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Selecionar todos" />
                  </th>
                  <th>Número</th>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Fiscal</th>
                  <th className="text-right">Valor</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p: any) => (
                  <tr key={p.id} className="cursor-pointer" onClick={() => navigate(`/pedidos/${p.id}`)}>
                    <td onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(p.id)}
                        onCheckedChange={() => toggleOne(p.id)}
                        aria-label={`Selecionar ${p.numero}`}
                      />
                    </td>
                    <td className="font-mono text-xs font-medium">{p.numero}</td>
                    <td>{p.dataPedido ? new Date(p.dataPedido).toLocaleDateString('pt-BR') : '—'}</td>
                    <td>{p.clienteNome || '—'}</td>
                    <td className="text-xs">{p.tipo?.replace(/_/g, ' ')}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td><StatusFiscalBadge status={p.statusFiscal} /></td>
                    <td className="text-right tabular-nums">
                      R$ {Number(p.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={e => handleEmitirIndividual(p, e)}
                            className={`p-1.5 rounded-md transition-colors ${
                              p.statusFiscal === 'emitida'
                                ? 'text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/10'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                          >
                            {p.statusFiscal === 'emitida'
                              ? <Eye className="w-4 h-4" />
                              : <FileText className="w-4 h-4" />}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {p.statusFiscal === 'emitida' ? 'Ver nota fiscal' : 'Emitir nota fiscal'}
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TooltipProvider>
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} pedidos · página {page} de {totalPages}</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <EmitirNotaFiscalDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        pedidos={selectedPedidos.map((p: any) => ({
          id: p.id, numero: p.numero,
          cliente: p.clienteNome || '—', clienteId: p.clienteId,
          valor: Number(p.valorTotal || 0), status: p.status, statusFiscal: p.statusFiscal,
        }))}
        onEmitido={() => { setSelectedIds(new Set()); refetch(); }}
      />
    </div>
  );
}
