import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Pencil, ToggleLeft, ToggleRight, Loader2, Users, Trash2 } from 'lucide-react';
import {
  useUsuarios,
  useCreateUsuario,
  useUpdateUsuario,
  usePatchUsuarioStatus,
  useDeleteUsuario,
  useHasPermissao,
} from '@/hooks/useQuery';
import { AppRole, APP_ROLE_LABELS } from '../../../shared/enums';
import { toast } from 'sonner';

const ALL_ROLES = Object.values(AppRole);

type CreateForm = {
  email: string;
  password: string;
  nome: string;
  role: AppRole;
};

type EditForm = {
  email: string;
  nome: string;
  password: string;
  roles: AppRole[];
};

const CREATE_EMPTY: CreateForm = {
  email: '',
  password: '',
  nome: '',
  role: AppRole.ATENDIMENTO,
};

export default function UsuariosPage() {
  const { data: usuarios = [], isLoading } = useUsuarios();
  const createUsuario = useCreateUsuario();
  const updateUsuario = useUpdateUsuario();
  const patchStatus = usePatchUsuarioStatus();
  const deleteUsuario = useDeleteUsuario();

  const podeCriar         = useHasPermissao('usuarios.criar');
  const podeEditar        = useHasPermissao('usuarios.editar');
  const podeAlterarStatus = useHasPermissao('usuarios.alterar_status');
  const podeDeletar       = useHasPermissao('usuarios.deletar');

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<CreateForm>(CREATE_EMPTY);
  const [editForm, setEditForm] = useState<EditForm>({ email: '', nome: '', password: '', roles: [] });

  function abrirNovo() {
    setCreateForm(CREATE_EMPTY);
    setCreateOpen(true);
  }

  function abrirEditar(u: any) {
    setEditingId(u.id);
    setEditForm({
      email: u.email ?? '',
      nome: u.nome ?? '',
      password: '',
      roles: u.roles ?? [],
    });
    setEditOpen(true);
  }

  async function handleCriar() {
    if (!createForm.email.trim()) { toast.error('E-mail é obrigatório.'); return; }
    if (!createForm.password.trim() || createForm.password.length < 6) {
      toast.error('Senha deve ter ao menos 6 caracteres.');
      return;
    }

    try {
      await createUsuario.mutateAsync({
        email: createForm.email.trim(),
        password: createForm.password,
        nome: createForm.nome.trim() || undefined,
        role: createForm.role,
      });
      toast.success('Usuário criado.');
      setCreateOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar usuário.');
    }
  }

  async function handleAtualizar() {
    if (!editingId) return;
    if (!editForm.email.trim()) { toast.error('E-mail é obrigatório.'); return; }
    if (editForm.password && editForm.password.length < 6) {
      toast.error('Nova senha deve ter ao menos 6 caracteres.');
      return;
    }

    const dto: any = {
      email: editForm.email.trim(),
      nome: editForm.nome.trim() || undefined,
      roles: editForm.roles,
    };
    if (editForm.password) dto.password = editForm.password;

    try {
      await updateUsuario.mutateAsync({ id: editingId, data: dto });
      toast.success('Usuário atualizado.');
      setEditOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar usuário.');
    }
  }

  async function handleToggleStatus(u: any) {
    try {
      await patchStatus.mutateAsync({ id: u.id, ativo: !u.ativo });
      toast.success(`Usuário ${u.ativo ? 'desativado' : 'ativado'}.`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar status.');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteUsuario.mutateAsync(id);
      toast.success('Usuário removido.');
      setDeleteConfirmId(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover usuário.');
    }
  }

  function toggleRole(role: AppRole) {
    setEditForm(f => ({
      ...f,
      roles: f.roles.includes(role)
        ? f.roles.filter(r => r !== role)
        : [...f.roles, role],
    }));
  }

  const isSaving = createUsuario.isPending || updateUsuario.isPending;
  const isDeleting = deleteUsuario.isPending;

  const usuarioParaDelete = deleteConfirmId
    ? (usuarios as any[]).find(u => u.id === deleteConfirmId)
    : null;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Usuários"
        subtitle="Gestão de usuários, perfis e permissões"
        actions={podeCriar ? (
          <Button size="sm" onClick={abrirNovo}>
            <Plus className="w-4 h-4 mr-1" /> Novo Usuário
          </Button>
        ) : undefined}
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (usuarios as any[]).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum usuário cadastrado.</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={abrirNovo}>
            <Plus className="w-4 h-4 mr-1" /> Criar primeiro usuário
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-lg border overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfis</th>
                <th>Último acesso</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(usuarios as any[]).map((u: any) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.nome || '—'}</td>
                  <td className="text-sm">{u.email}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {(u.roles as AppRole[]).length === 0 ? (
                        <span className="text-muted-foreground text-xs">Sem perfil</span>
                      ) : (
                        (u.roles as AppRole[]).map(r => (
                          <span
                            key={r}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary"
                          >
                            {APP_ROLE_LABELS[r]}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="text-sm text-muted-foreground">
                    {u.lastSignIn
                      ? new Date(u.lastSignIn).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                      : 'Nunca'}
                  </td>
                  <td>
                    <StatusBadge status={u.ativo ? 'ativo' : 'inativo'} />
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      {podeEditar && (
                        <Button size="sm" variant="ghost" title="Editar" onClick={() => abrirEditar(u)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      {podeAlterarStatus && (
                        <Button
                          size="sm"
                          variant="ghost"
                          title={u.ativo ? 'Desativar' : 'Ativar'}
                          disabled={patchStatus.isPending}
                          onClick={() => handleToggleStatus(u)}
                        >
                          {u.ativo
                            ? <ToggleRight className="w-4 h-4 text-green-500" />
                            : <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                          }
                        </Button>
                      )}
                      {podeDeletar && (
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Remover"
                          onClick={() => setDeleteConfirmId(u.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog — Novo usuário */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nome</label>
              <input
                type="text"
                className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Ex: João Silva"
                value={createForm.nome}
                onChange={e => setCreateForm(f => ({ ...f, nome: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">E-mail *</label>
              <input
                type="email"
                className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="usuario@empresa.com.br"
                value={createForm.email}
                onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Senha *</label>
              <input
                type="password"
                className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Mínimo 6 caracteres"
                value={createForm.password}
                onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Perfil *</label>
              <select
                className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={createForm.role}
                onChange={e => setCreateForm(f => ({ ...f, role: e.target.value as AppRole }))}
              >
                {ALL_ROLES.map(r => (
                  <option key={r} value={r}>{APP_ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleCriar} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Criar usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog — Editar usuário */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nome</label>
              <input
                type="text"
                className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={editForm.nome}
                onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">E-mail *</label>
              <input
                type="email"
                className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={editForm.email}
                onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Nova senha</label>
              <input
                type="password"
                className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Deixe em branco para não alterar"
                value={editForm.password}
                onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Perfis</label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_ROLES.map(r => (
                  <label key={r} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editForm.roles.includes(r)}
                      onChange={() => toggleRole(r)}
                      className="rounded"
                    />
                    <span className="text-sm">{APP_ROLE_LABELS[r]}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleAtualizar} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog — Confirmar exclusão */}
      <Dialog open={!!deleteConfirmId} onOpenChange={open => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover usuário</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover o usuário{' '}
            <span className="font-medium text-foreground">{usuarioParaDelete?.email}</span>?
            Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
