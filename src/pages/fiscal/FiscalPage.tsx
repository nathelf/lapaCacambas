import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusFiscalBadge } from '@/components/shared/StatusFiscalBadge';
import { EmitirNotaFiscalDrawer } from '@/components/pedidos/EmitirNotaFiscalDrawer';
import { Button } from '@/components/ui/button';
import { Search, Filter, Download, Eye, FileText, Loader2, XCircle } from 'lucide-react';
import { useNotasFiscais, usePedidos, useCancelarNotaFiscal } from '@/hooks/useQuery';
import { toast } from 'sonner';

export default function FiscalPage() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPedidos, setSelectedPedidos] = useState<any[]>([]);

  const { data: notas = [], isLoading, refetch } = useNotasFiscais({ search: busca || undefined });
  // limit=100: backend aceita no máximo 100 por requisição (Math.min no pedidos.service)
  const { data: pedidosResult } = usePedidos({ limit: 100 });
  // fetchPedidos retorna { data: PedidoDto[], total: number } — extrair array com segurança
  const rawPedidos = pedidosResult as any;
  const pedidosAptos: any[] = Array.isArray(rawPedidos)
    ? rawPedidos
    : Array.isArray(rawPedidos?.data)
      ? rawPedidos.data
      : [];
  const cancelarNF = useCancelarNotaFiscal();

  const handleEmitirViaPedidos = () => {
    // Filter pedidos aptos (concluído ou faturado, sem NF emitida)
    // O backend retorna DTO camelCase: statusFiscal, valorTotal, clienteNome, clienteId
    const aptos = pedidosAptos.filter(
      (p: any) => ['concluido', 'faturado'].includes(p.status) && p.statusFiscal !== 'emitida'
    );
    if (aptos.length === 0) {
      toast.info('Não há pedidos aptos para emissão fiscal');
      return;
    }
    setSelectedPedidos(aptos.map((p: any) => ({
      id: p.id,
      numero: p.numero,
      cliente: p.clienteNome || '—',
      clienteId: p.clienteId,
      valor: Number(p.valorTotal ?? 0),
      status: p.status,
      statusFiscal: p.statusFiscal,
    })));
    setDrawerOpen(true);
  };

  const handleCancelar = async (id: number) => {
    if (!confirm('Tem certeza que deseja cancelar esta nota fiscal?')) return;
    try {
      await cancelarNF.mutateAsync(id);
      toast.success('Nota fiscal cancelada');
      refetch();
    } catch (err: any) {
      toast.error('Erro ao cancelar: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Notas Fiscais"
        subtitle="Emissão e controle de notas fiscais eletrônicas"
        actions={
          <Button size="sm" onClick={handleEmitirViaPedidos}>
            <FileText className="w-4 h-4 mr-1" /> Emitir via Pedidos
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar nota fiscal..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-md border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-1" /> Filtros</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : notas.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma nota fiscal emitida</p>
          <Button size="sm" className="mt-3" onClick={handleEmitirViaPedidos}>
            <FileText className="w-4 h-4 mr-1" /> Emitir via Pedidos
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-lg border overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Série</th>
                <th>Data Emissão</th>
                <th>Cliente</th>
                <th>Pedidos</th>
                <th>Status</th>
                <th className="text-right">Valor</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {(notas as any[]).map((n: any) => (
                <tr key={n.id}>
                  <td className="font-mono text-xs font-medium">{n.numero || '—'}</td>
                  <td>{n.serie}</td>
                  <td>{n.data_emissao ? new Date(n.data_emissao).toLocaleDateString('pt-BR') : '—'}</td>
                  <td>{n.clientes?.nome || '—'}</td>
                  <td>
                    <div className="flex gap-1 flex-wrap">
                      {(n.nota_fiscal_pedidos || []).map((nfp: any) => (
                        <span key={nfp.pedido_id} className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded cursor-pointer hover:bg-primary/10"
                          onClick={() => navigate(`/pedidos/${nfp.pedido_id}`)}>
                          {nfp.pedidos?.numero || `#${nfp.pedido_id}`}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td><StatusFiscalBadge status={n.status} /></td>
                  <td className="text-right tabular-nums">R$ {Number(n.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td>
                    <div className="flex gap-1">
                      <button className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      {n.status === 'emitida' && (
                        <>
                          <button className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            <Download className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleCancelar(n.id)} className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EmitirNotaFiscalDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        pedidos={selectedPedidos}
        onEmitido={() => { refetch(); setSelectedPedidos([]); }}
      />
    </div>
  );
}
