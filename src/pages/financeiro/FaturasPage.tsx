import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Search, Filter, Plus, Loader2 } from 'lucide-react';
import { useFaturas } from '@/hooks/useQuery';

export default function FaturasPage() {
  const [busca, setBusca] = useState('');
  const { data: faturas = [], isLoading } = useFaturas();

  const filtered = busca.trim()
    ? (faturas as any[]).filter((f: any) => f.numero?.toLowerCase().includes(busca.toLowerCase()) || f.clientes?.nome?.toLowerCase().includes(busca.toLowerCase()))
    : faturas;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader title="Faturas" subtitle="Gestão de faturas e cobranças" actions={
        <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Nova Fatura</Button>
      } />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Buscar fatura..." value={busca} onChange={e => setBusca(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-md border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-1" /> Filtros</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (filtered as any[]).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><p className="text-sm">Nenhuma fatura encontrada</p></div>
      ) : (
        <div className="bg-card rounded-lg border overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Cliente</th>
                <th>Emissão</th>
                <th>Vencimento</th>
                <th className="text-right">Valor Bruto</th>
                <th className="text-right">Valor Líquido</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(filtered as any[]).map((f: any) => (
                <tr key={f.id} className="cursor-pointer">
                  <td className="font-mono text-xs font-medium">{f.numero}</td>
                  <td>{f.clientes?.nome || '—'}</td>
                  <td>{f.data_emissao ? new Date(f.data_emissao).toLocaleDateString('pt-BR') : '—'}</td>
                  <td>{f.data_vencimento ? new Date(f.data_vencimento).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="text-right tabular-nums">R$ {Number(f.valor_bruto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="text-right tabular-nums">R$ {Number(f.valor_liquido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td><StatusBadge status={f.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
