import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatusFiscalBadge } from '@/components/shared/StatusFiscalBadge';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmitirNotaFiscalDrawer } from '@/components/pedidos/EmitirNotaFiscalDrawer';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Search, Filter, FileText, Eye, Loader2 } from 'lucide-react';
import { usePedidos } from '@/hooks/useQuery';
import { toast } from 'sonner';

export default function PedidosPage() {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [busca, setBusca] = useState('');

  const { data: pedidos = [], isLoading, refetch } = usePedidos({ search: busca || undefined });

  const filteredPedidos = pedidos;

  const allSelected = filteredPedidos.length > 0 && filteredPedidos.every((p: any) => selectedIds.has(p.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPedidos.map((p: any) => p.id)));
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

  const selectedPedidos = filteredPedidos.filter((p: any) => selectedIds.has(p.id));

  const handleEmitirLote = () => {
    if (selectedPedidos.length === 0) {
      toast.error('Selecione pelo menos um pedido');
      return;
    }
    setDrawerOpen(true);
  };

  const handleEmitirIndividual = (pedido: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (pedido.status_fiscal === 'emitida') {
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

      <div className="flex items-center gap-3">
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
        <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-1" /> Filtros</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filteredPedidos.length === 0 ? (
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
                {filteredPedidos.map((p: any) => (
                  <tr key={p.id} className="cursor-pointer" onClick={() => navigate(`/pedidos/${p.id}`)}>
                    <td onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(p.id)}
                        onCheckedChange={() => toggleOne(p.id)}
                        aria-label={`Selecionar ${p.numero}`}
                      />
                    </td>
                    <td className="font-mono text-xs font-medium">{p.numero}</td>
                    <td>{p.data_pedido ? new Date(p.data_pedido).toLocaleDateString('pt-BR') : '—'}</td>
                    <td>{(p as any).clientes?.nome || '—'}</td>
                    <td className="text-xs">{p.tipo?.replace(/_/g, ' ')}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>
                      <StatusFiscalBadge status={p.status_fiscal} />
                    </td>
                    <td className="text-right tabular-nums">R$ {Number(p.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => handleEmitirIndividual(p, e)}
                            className={`p-1.5 rounded-md transition-colors ${
                              p.status_fiscal === 'emitida'
                                ? 'text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/10'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                          >
                            {p.status_fiscal === 'emitida' ? <Eye className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {p.status_fiscal === 'emitida' ? 'Ver nota fiscal' : 'Emitir nota fiscal'}
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

      <EmitirNotaFiscalDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        pedidos={selectedPedidos.map((p: any) => ({
          id: p.id,
          numero: p.numero,
          cliente: (p as any).clientes?.nome || '—',
          clienteId: p.cliente_id,
          valor: Number(p.valor_total || 0),
          status: p.status,
          statusFiscal: p.status_fiscal,
        }))}
        onEmitido={handleEmitido}
      />
    </div>
  );
}
