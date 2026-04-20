import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatusFiscalBadge } from '@/components/shared/StatusFiscalBadge';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmitirNotaFiscalDrawer } from '@/components/pedidos/EmitirNotaFiscalDrawer';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Search, Filter, FileText, Eye, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePedidos } from '@/hooks/useQuery';
import { toast } from 'sonner';

const LIMIT = 20;

export default function PedidosPage() {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const [buscaAtiva, setBuscaAtiva] = useState('');
  const [page, setPage] = useState(1);

  const { data: result, isLoading, refetch } = usePedidos({ search: buscaAtiva || undefined, page });
  const pedidos: any[] = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  const allSelected = pedidos.length > 0 && pedidos.every((p: any) => selectedIds.has(p.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pedidos.map((p: any) => p.id)));
    }
  };

  const toggleOne = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedPedidos = pedidos.filter((p: any) => selectedIds.has(p.id));

  const handleEmitirLote = () => {
    if (selectedPedidos.length === 0) {
      toast.error('Selecione pelo menos um pedido');
      return;
    }
    setDrawerOpen(true);
  };

  const handleEmitirIndividual = (pedido: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (pedido.statusFiscal === 'emitida') {
      toast.info('Nota já emitida para este pedido');
      return;
    }
    setSelectedIds(new Set([pedido.id]));
    setDrawerOpen(true);
  };

  const handleEmitido = () => {
    setSelectedIds(new Set());
    refetch();
  };

  const handleBusca = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setBuscaAtiva(busca.trim());
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

      <form onSubmit={handleBusca} className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar pedido..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-md border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button type="submit" variant="outline" size="sm">
          <Search className="w-4 h-4 mr-1" /> Buscar
        </Button>
        {buscaAtiva && (
          <Button type="button" variant="ghost" size="sm" onClick={() => { setBusca(''); setBuscaAtiva(''); setPage(1); }}>
            Limpar
          </Button>
        )}
        <Button type="button" variant="outline" size="sm"><Filter className="w-4 h-4 mr-1" /> Filtros</Button>
      </form>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : pedidos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Nenhum pedido encontrado</p>
          <Button size="sm" className="mt-3" onClick={() => navigate('/pedidos/novo')}>
            <Plus className="w-4 h-4 mr-1" /> Criar primeiro pedido
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-lg border overflow-x-auto">
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
                    <td>
                      <StatusFiscalBadge status={p.statusFiscal} />
                    </td>
                    <td className="text-right tabular-nums">R$ {Number(p.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => handleEmitirIndividual(p, e)}
                            className={`p-1.5 rounded-md transition-colors ${
                              p.statusFiscal === 'emitida'
                                ? 'text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/10'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                          >
                            {p.statusFiscal === 'emitida' ? <Eye className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} pedidos · página {page} de {totalPages}</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <EmitirNotaFiscalDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        pedidos={selectedPedidos.map((p: any) => ({
          id: p.id,
          numero: p.numero,
          cliente: p.clienteNome || '—',
          clienteId: p.clienteId,
          valor: Number(p.valorTotal || 0),
          status: p.status,
          statusFiscal: p.statusFiscal,
        }))}
        onEmitido={handleEmitido}
      />
    </div>
  );
}
