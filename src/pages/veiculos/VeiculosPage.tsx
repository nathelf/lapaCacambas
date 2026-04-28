import { useMemo, useState } from 'react';
import { ModulePage } from '@/components/shared/ModulePage';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { VeiculoFormDialog } from '@/components/veiculos/VeiculoFormDialog';
import { VeiculoStatusPicker } from '@/components/veiculos/VeiculoStatusPicker';
import { Loader2, Pencil, Trash2, Truck, AlertTriangle } from 'lucide-react';
import { useDeleteVeiculo, useUpdateVeiculo, useVeiculosAll } from '@/hooks/useQuery';
import {
  alertaLicenciamento,
  formatKmBr,
  labelStatusVeiculo,
  normalizeVeiculoFromApi,
  type VeiculoListaItem,
} from '@/lib/veiculos-ui';
import { cn } from '@/lib/utils';
import { StatusVeiculo } from '@/types/enums';
import { toast } from 'sonner';

function norm(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export default function VeiculosPage() {
  const { data: raw = [], isLoading } = useVeiculosAll();
  const updateMut = useUpdateVeiculo();
  const deleteMut = useDeleteVeiculo();

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VeiculoListaItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VeiculoListaItem | null>(null);

  const rows = useMemo(() => (raw as unknown[]).map(normalizeVeiculoFromApi), [raw]);

  const filtered = useMemo(() => {
    const q = norm(search.trim());
    if (!q) return rows;
    return rows.filter(v => {
      const blob = [v.placa, v.marca ?? '', v.modelo, v.tipo ?? ''].join(' ');
      return norm(blob).includes(q);
    });
  }, [rows, search]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (v: VeiculoListaItem) => {
    setEditing(v);
    setFormOpen(true);
  };

  const rowBusy = (id: number) =>
    updateMut.isPending && (updateMut.variables as { id?: number } | undefined)?.id === id;

  const applyStatus = (v: VeiculoListaItem, next: StatusVeiculo) => {
    if (next === v.status) return;
    updateMut.mutate(
      { id: v.id, data: { status: next } },
      {
        onSuccess: () => toast.success(`Status: ${labelStatusVeiculo(next)}`),
        onError: (e: Error) => toast.error(e?.message ?? 'Não foi possível alterar o status.'),
      },
    );
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMut.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success('Veículo removido.');
        setDeleteTarget(null);
      },
      onError: (e: Error) => {
        toast.error(e?.message ?? 'Erro ao excluir.');
      },
    });
  };

  return (
    <>
      <ModulePage
        title="Veículos / Frota"
        subtitle="Controle de caminhões e veículos."
        createLabel="Novo Veículo"
        onCreateClick={openCreate}
        searchPlaceholder="Buscar por placa, marca, modelo ou tipo…"
        searchValue={search}
        onSearchChange={setSearch}
        hideFiltersButton
      >
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground rounded-lg border bg-card">
            <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {rows.length === 0 ? 'Nenhum veículo cadastrado.' : 'Nenhum resultado para a busca.'}
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-[96px]">Ações</th>
                  <th>Placa</th>
                  <th>Marca</th>
                  <th>Modelo</th>
                  <th>Tipo</th>
                  <th>Ano</th>
                  <th className="text-right">KM atual</th>
                  <th>Licenciamento</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => {
                  const lic = alertaLicenciamento(v.dataLicenciamento);
                  const busy = rowBusy(v.id);
                  const dataStr = v.dataLicenciamento
                    ? new Date(`${String(v.dataLicenciamento).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR')
                    : '—';
                  return (
                    <tr key={v.id} className="hover:bg-muted/40">
                      <td>
                        <div className="flex items-center gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Editar"
                            disabled={busy || (deleteMut.isPending && deleteTarget?.id === v.id)}
                            onClick={() => openEdit(v)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Excluir"
                            disabled={busy || (deleteMut.isPending && deleteTarget?.id === v.id)}
                            onClick={() => setDeleteTarget(v)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                      <td className="font-mono font-medium">{v.placa}</td>
                      <td>{v.marca || '—'}</td>
                      <td>{v.modelo}</td>
                      <td>{v.tipo || '—'}</td>
                      <td className="tabular-nums">{v.anoFabricacao ?? '—'}</td>
                      <td className="text-right tabular-nums">{formatKmBr(v.kmAtual)}</td>
                      <td>
                        {!v.dataLicenciamento ? (
                          '—'
                        ) : (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 text-sm',
                              lic === 'vencido' && 'text-destructive font-semibold',
                              lic === 'proximo' && 'text-amber-700 dark:text-amber-400 font-medium',
                            )}
                          >
                            {(lic === 'vencido' || lic === 'proximo') && (
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            )}
                            {dataStr}
                          </span>
                        )}
                      </td>
                      <td>
                        <VeiculoStatusPicker
                          variant="badge"
                          status={v.status}
                          disabled={busy || (deleteMut.isPending && deleteTarget?.id === v.id)}
                          onSelect={next => applyStatus(v, next)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ModulePage>

      <VeiculoFormDialog open={formOpen} onOpenChange={setFormOpen} veiculo={editing} />

      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir veículo?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente remover o veículo <strong className="text-foreground font-mono">{deleteTarget?.placa}</strong>
              ? Esta ação não pode ser desfeita. Se o veículo estiver vinculado a pedidos ou rotas, a exclusão será bloqueada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={deleteMut.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 inline-flex items-center"
              disabled={deleteMut.isPending}
              onClick={e => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              {deleteMut.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removendo…
                </>
              ) : (
                'Sim, excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
