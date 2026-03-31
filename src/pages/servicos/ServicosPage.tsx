import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Pencil, ToggleLeft, ToggleRight, Loader2, Tag } from 'lucide-react';
import { useServicosAll, useCreateServico, useUpdateServico, useToggleServico } from '@/hooks/useQuery';
import { toast } from 'sonner';

type ServicoForm = {
  descricao: string;
  codigoFiscal: string;
  aliquota: string;
};

const FORM_EMPTY: ServicoForm = { descricao: '', codigoFiscal: '', aliquota: '' };

export default function ServicosPage() {
  const { data: servicos = [], isLoading } = useServicosAll();
  const createServico = useCreateServico();
  const updateServico = useUpdateServico();
  const toggleServico = useToggleServico();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ServicoForm>(FORM_EMPTY);

  function abrirNovo() {
    setEditingId(null);
    setForm(FORM_EMPTY);
    setOpen(true);
  }

  function abrirEditar(s: any) {
    setEditingId(s.id);
    setForm({
      descricao: s.descricao ?? '',
      codigoFiscal: s.codigoFiscal ?? '',
      aliquota: s.aliquota != null ? String(s.aliquota) : '',
    });
    setOpen(true);
  }

  async function handleSalvar() {
    if (!form.descricao.trim()) {
      toast.error('Descrição é obrigatória.');
      return;
    }

    const dto: any = {
      descricao: form.descricao.trim(),
      codigoFiscal: form.codigoFiscal.trim() || undefined,
      aliquota: form.aliquota !== '' ? Number(form.aliquota) : undefined,
    };

    try {
      if (editingId) {
        await updateServico.mutateAsync({ id: editingId, data: dto });
        toast.success('Serviço atualizado.');
      } else {
        await createServico.mutateAsync(dto);
        toast.success('Serviço criado.');
      }
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar serviço.');
    }
  }

  async function handleToggle(s: any) {
    try {
      await toggleServico.mutateAsync(s.id);
      toast.success(`Serviço ${s.ativo ? 'desativado' : 'ativado'}.`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar status.');
    }
  }

  const isSaving = createServico.isPending || updateServico.isPending;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Serviços"
        subtitle="Tipos de serviço, alíquotas e códigos fiscais"
        actions={
          <Button size="sm" onClick={abrirNovo}>
            <Plus className="w-4 h-4 mr-1" /> Novo Serviço
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (servicos as any[]).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum serviço cadastrado.</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={abrirNovo}>
            <Plus className="w-4 h-4 mr-1" /> Cadastrar primeiro serviço
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-lg border overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Código Fiscal</th>
                <th>Alíquota (%)</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(servicos as any[]).map((s: any) => (
                <tr key={s.id}>
                  <td className="font-medium">{s.descricao}</td>
                  <td className="font-mono text-xs">{s.codigoFiscal || '—'}</td>
                  <td>{s.aliquota != null ? `${Number(s.aliquota).toFixed(2)}%` : '—'}</td>
                  <td><StatusBadge status={s.ativo ? 'ativo' : 'inativo'} /></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Editar"
                        onClick={() => abrirEditar(s)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title={s.ativo ? 'Desativar' : 'Ativar'}
                        disabled={toggleServico.isPending}
                        onClick={() => handleToggle(s)}
                      >
                        {s.ativo
                          ? <ToggleRight className="w-4 h-4 text-green-500" />
                          : <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                        }
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Descrição *</label>
              <input
                type="text"
                className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Ex: Locação de Caçamba 5m³"
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Código Fiscal</label>
              <input
                type="text"
                className="w-full h-9 px-3 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Ex: 01.01"
                value={form.codigoFiscal}
                onChange={e => setForm(f => ({ ...f, codigoFiscal: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Código de serviço da NFS-e (opcional)</p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Alíquota ISS (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Ex: 3.00"
                value={form.aliquota}
                onChange={e => setForm(f => ({ ...f, aliquota: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {editingId ? 'Salvar alterações' : 'Criar serviço'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
