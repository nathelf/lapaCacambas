import { ModulePage } from '@/components/shared/ModulePage';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Loader2, Truck } from 'lucide-react';
import { useVeiculosAll } from '@/hooks/useQuery';

export default function VeiculosPage() {
  const { data: veiculos = [], isLoading } = useVeiculosAll();

  if (isLoading) {
    return (
      <ModulePage title="Veículos / Frota" subtitle="Controle de caminhões e veículos" createLabel="Novo Veículo">
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </ModulePage>
    );
  }

  return (
    <ModulePage title="Veículos / Frota" subtitle="Controle de caminhões e veículos" createLabel="Novo Veículo">
      {(veiculos as any[]).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum veículo cadastrado.</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Placa</th>
                <th>Marca</th>
                <th>Modelo</th>
                <th>Tipo</th>
                <th>Ano</th>
                <th className="text-right">KM Atual</th>
                <th>Licenciamento</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(veiculos as any[]).map((v: any) => (
                <tr key={v.id} className="cursor-pointer">
                  <td className="font-mono font-medium">{v.placa}</td>
                  <td>{v.marca || '—'}</td>
                  <td>{v.modelo}</td>
                  <td>{v.tipo || '—'}</td>
                  <td>{v.ano_fabricacao || '—'}</td>
                  <td className="text-right tabular-nums">
                    {v.km_atual ? Number(v.km_atual).toLocaleString('pt-BR') : '—'}
                  </td>
                  <td>
                    {v.data_licenciamento
                      ? new Date(v.data_licenciamento).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td><StatusBadge status={v.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ModulePage>
  );
}
