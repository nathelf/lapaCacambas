import { ModulePage } from '@/components/shared/ModulePage';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { STATUS_CACAMBA_LABELS } from '@/types/enums';
import { Loader2, Container } from 'lucide-react';
import { useCacambas, useUnidadesCacamba } from '@/hooks/useQuery';

export default function CacambasPage() {
  const { data: cacambas = [], isLoading: loadingCacambas } = useCacambas();
  const { data: unidades = [], isLoading: loadingUnidades } = useUnidadesCacamba();

  const isLoading = loadingCacambas || loadingUnidades;

  if (isLoading) {
    return (
      <ModulePage title="Caçambas" subtitle="Tipos de caçamba e controle patrimonial" createLabel="Nova Caçamba">
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </ModulePage>
    );
  }

  return (
    <ModulePage title="Caçambas" subtitle="Tipos de caçamba e controle patrimonial" createLabel="Nova Caçamba">
      {/* Tipos */}
      <div className="bg-card rounded-lg border mb-6">
        <div className="px-4 py-3 border-b">
          <h3 className="text-sm font-semibold">Tipos de Caçamba — Preços</h3>
        </div>
        {(cacambas as any[]).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Container className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum tipo de caçamba cadastrado.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Capacidade</th>
                <th className="text-right">Dia</th>
                <th className="text-right">Semana</th>
                <th className="text-right">Quinzena</th>
                <th className="text-right">Mês</th>
              </tr>
            </thead>
            <tbody>
              {(cacambas as any[]).map((c: any) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.descricao}</td>
                  <td>{c.capacidade || '—'}</td>
                  <td className="text-right tabular-nums">
                    R$ {Number(c.precoDia).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="text-right tabular-nums">
                    R$ {Number(c.precoSemana).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="text-right tabular-nums">
                    R$ {Number(c.precoQuinzena).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="text-right tabular-nums">
                    R$ {Number(c.precoMes).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Unidades / Patrimônio */}
      <div className="bg-card rounded-lg border">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold">Patrimônio / Unidades</h3>
          <span className="text-xs text-muted-foreground">{(unidades as any[]).length} unidades</span>
        </div>
        {(unidades as any[]).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Nenhuma unidade cadastrada.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Patrimônio</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Cliente Atual</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>
              {(unidades as any[]).map((u: any) => (
                <tr key={u.id}>
                  <td className="font-mono text-xs font-medium">{u.patrimonio}</td>
                  <td>{u.cacamba?.descricao || '—'}</td>
                  <td><StatusBadge status={u.status} labels={STATUS_CACAMBA_LABELS} /></td>
                  <td>{u.clienteAtual || '—'}</td>
                  <td className="text-xs text-muted-foreground">{u.observacao || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ModulePage>
  );
}
