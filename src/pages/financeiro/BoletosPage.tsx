import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Search, Filter, Plus, Loader2, CreditCard } from 'lucide-react';
import { useBoletos } from '@/hooks/useQuery';
import { EmitirBoletoDrawer } from '@/components/financeiro/EmitirBoletoDrawer';

const statusColors: Record<string, string> = {
  pendente:     'status-pendente',
  emitido:      'status-programado',
  enviado:      'status-em-rota',
  pago:         'status-concluido',
  vencido:      'status-cancelado',
  cancelado:    'status-cancelado',
  renegociado:  'status-faturado',
};

const statusLabels: Record<string, string> = {
  pendente: 'Pendente', emitido: 'Emitido', enviado: 'Enviado',
  pago: 'Pago', vencido: 'Vencido', cancelado: 'Cancelado', renegociado: 'Renegociado',
};

export default function BoletosPage() {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: boletos = [], isLoading } = useBoletos(
    filtroStatus ? { status: filtroStatus } : undefined
  );

  const filtered = busca.trim()
    ? (boletos as any[]).filter((b: any) =>
        b.nosso_numero?.toLowerCase().includes(busca.toLowerCase()) ||
        b.numero_documento?.toLowerCase().includes(busca.toLowerCase()) ||
        b.clientes?.nome?.toLowerCase().includes(busca.toLowerCase())
      )
    : boletos;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Boletos"
        subtitle="Emissão e controle de boletos bancários"
        actions={
          <Button size="sm" onClick={() => setDrawerOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Novo Boleto
          </Button>
        }
      />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por número, cliente..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-md border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value)}
          className="h-9 px-3 rounded-md border bg-card text-sm"
        >
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="emitido">Emitido</option>
          <option value="enviado">Enviado</option>
          <option value="pago">Pago</option>
          <option value="vencido">Vencido</option>
          <option value="cancelado">Cancelado</option>
          <option value="renegociado">Renegociado</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (filtered as any[]).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {busca || filtroStatus ? 'Nenhum boleto encontrado para os filtros.' : 'Nenhum boleto emitido.'}
          </p>
          {!busca && !filtroStatus && (
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setDrawerOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Emitir primeiro boleto
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-lg border overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nosso Número</th>
                <th>Cliente</th>
                <th>Fatura</th>
                <th>Pedido</th>
                <th>Emissão</th>
                <th>Vencimento</th>
                <th className="text-right">Valor</th>
                <th>Status</th>
                <th>Linha Digitável</th>
              </tr>
            </thead>
            <tbody>
              {(filtered as any[]).map((b: any) => (
                <tr key={b.id} className="cursor-pointer">
                  <td className="font-mono text-xs font-medium">{b.nosso_numero || `#${b.id}`}</td>
                  <td>{b.clientes?.nome || '—'}</td>
                  <td className="font-mono text-xs">{b.faturas?.numero || '—'}</td>
                  <td className="font-mono text-xs">{b.pedidos?.numero || '—'}</td>
                  <td>{b.data_emissao ? new Date(b.data_emissao).toLocaleDateString('pt-BR') : '—'}</td>
                  <td>
                    {b.data_vencimento ? (
                      <span className={
                        new Date(b.data_vencimento) < new Date() && b.status !== 'pago'
                          ? 'text-destructive font-medium'
                          : ''
                      }>
                        {new Date(b.data_vencimento).toLocaleDateString('pt-BR')}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="text-right tabular-nums font-medium">
                    R$ {Number(b.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <span className={`status-badge ${statusColors[b.status] || 'status-orcamento'}`}>
                      {statusLabels[b.status] || b.status}
                    </span>
                  </td>
                  <td className="font-mono text-xs max-w-[180px] truncate">
                    {b.linha_digitavel || (b.integracao_status === 'pendente' ? 'Aguardando banco' : '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EmitirBoletoDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onEmitido={() => {
          // React Query invalida automaticamente via useCreateBoleto
        }}
      />
    </div>
  );
}
