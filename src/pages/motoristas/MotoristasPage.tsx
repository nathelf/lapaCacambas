import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchBar } from '@/components/shared/SearchBar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Link2, Pencil, User, UserPlus } from 'lucide-react';
import {
  useMotoristasAll,
  useMotoristasUsuariosSemFicha,
  useMotoristasVinculoCandidatos,
  useCriarFichaMotoristaPorUsuario,
  useUpdateMotorista,
} from '@/hooks/useQuery';
import { toast } from 'sonner';
import type { CandidatoVinculoMotorista } from '@/lib/api';
import {
  MotoristaFichaFields,
  motoristaApiToFichaValues,
  fichaValuesToUpdateDto,
  type MotoristaFichaValues,
} from '@/components/motoristas/MotoristaFichaFields';

const NONE = '__none__';

type MotoristaView = {
  id: number;
  nome: string;
  cpf: string | null;
  cnh: string | null;
  categorias: string[];
  dataNascimento: string | null;
  dataVencimentoCnh: string | null;
  celular: string | null;
  telefone: string | null;
  email: string | null;
  status: string;
  userId: string | null;
};

function asMotorista(m: Record<string, unknown>): MotoristaView {
  const cats = m.categorias;
  return {
    id: Number(m.id),
    nome: String(m.nome ?? ''),
    cpf: (m.cpf as string) ?? null,
    cnh: (m.cnh as string) ?? null,
    categorias: Array.isArray(cats) ? (cats as string[]) : [],
    dataNascimento: (m.dataNascimento as string) ?? (m.data_nascimento as string) ?? null,
    dataVencimentoCnh: (m.dataVencimentoCnh as string) ?? (m.data_vencimento_cnh as string) ?? null,
    celular: (m.celular as string) ?? null,
    telefone: (m.telefone as string) ?? null,
    email: (m.email as string) ?? null,
    status: String(m.status ?? ''),
    userId: (m.userId as string) ?? (m.user_id as string) ?? null,
  };
}

function cnhVencida(dataVenc: string | null): boolean {
  if (!dataVenc) return false;
  return new Date(dataVenc) < new Date();
}

function fmtCategorias(m: MotoristaView): string {
  return m.categorias.length ? m.categorias.join(', ') : '—';
}

function viewToFichaInitial(m: MotoristaView): MotoristaFichaValues {
  return motoristaApiToFichaValues({
    nome: m.nome,
    cpf: m.cpf,
    cnh: m.cnh,
    categorias: m.categorias,
    data_nascimento: m.dataNascimento,
    data_vencimento_cnh: m.dataVencimentoCnh,
    telefone: m.telefone,
    celular: m.celular,
    email: m.email,
    status: m.status,
  });
}

export default function MotoristasPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [vinculoOpen, setVinculoOpen] = useState(false);
  const [fichaOpen, setFichaOpen] = useState(false);
  const [fichaMotorista, setFichaMotorista] = useState<MotoristaView | null>(null);
  const [fichaForm, setFichaForm] = useState<MotoristaFichaValues | null>(null);
  const [editando, setEditando] = useState<MotoristaView | null>(null);
  const [userSelect, setUserSelect] = useState(NONE);

  const { data: rawList = [], isLoading } = useMotoristasAll();
  const { data: semFicha = [], isLoading: loadingSemFicha } = useMotoristasUsuariosSemFicha();
  const { data: candidatos = [], isLoading: loadingCandidatos } = useMotoristasVinculoCandidatos(vinculoOpen);
  const updateMotorista = useUpdateMotorista();
  const criarFicha = useCriarFichaMotoristaPorUsuario();

  const motoristas = useMemo(() => {
    const list = (rawList as Record<string, unknown>[]).map(asMotorista);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (m) =>
        m.nome.toLowerCase().includes(q) ||
        (m.cpf && m.cpf.replace(/\D/g, '').includes(q.replace(/\D/g, ''))) ||
        (m.celular && m.celular.includes(q)),
    );
  }, [rawList, search]);

  function abrirVinculo(m: MotoristaView) {
    setEditando(m);
    setUserSelect(m.userId ?? NONE);
    setVinculoOpen(true);
  }

  function abrirEdicao(m: MotoristaView) {
    if (m.userId) {
      navigate(`/usuarios?edit=${encodeURIComponent(m.userId)}&motoristaId=${m.id}`);
      return;
    }
    setFichaMotorista(m);
    setFichaForm(viewToFichaInitial(m));
    setFichaOpen(true);
  }

  async function salvarFicha() {
    if (!fichaMotorista || !fichaForm) return;
    try {
      await updateMotorista.mutateAsync({
        id: fichaMotorista.id,
        dto: fichaValuesToUpdateDto(fichaForm),
      });
      toast.success('Dados do motorista atualizados.');
      setFichaOpen(false);
      setFichaMotorista(null);
      setFichaForm(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível salvar.');
    }
  }

  async function salvarVinculo() {
    if (!editando) return;
    const userId = userSelect === NONE ? null : userSelect;
    try {
      await updateMotorista.mutateAsync({
        id: editando.id,
        dto: { userId },
      });
      toast.success(userId ? 'Login do app vinculado ao motorista.' : 'Vínculo com o app removido.');
      setVinculoOpen(false);
      setEditando(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível salvar o vínculo.');
    }
  }

  const opcoesSelect = useMemo(() => {
    const base: CandidatoVinculoMotorista[] = [...candidatos];
    if (editando?.userId && !base.some((c) => c.id === editando.userId)) {
      base.unshift({
        id: editando.userId,
        nome: 'Usuário atual (fora da lista)',
        email: `${editando.userId.slice(0, 8)}…`,
        temPapelMotorista: false,
      });
    }
    return base;
  }, [candidatos, editando?.userId]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Motoristas"
        subtitle='Lista vem da tabela motoristas (frota). Dar papel "motorista" a um usuário não cria essa linha — use o aviso abaixo ou cadastre o motorista com vínculo ao login do app.'
      />

      {!loadingSemFicha && semFicha.length > 0 ? (
        <Alert>
          <UserPlus className="h-4 w-4" />
          <AlertTitle>Usuários com papel motorista sem ficha na frota</AlertTitle>
          <AlertDescription className="space-y-3 mt-2">
            <p>
              Estes perfis existem no seu tenant e têm papel <strong>motorista</strong>, mas ainda não há registro
              correspondente em <strong>motoristas</strong> (por isso não aparecem na tabela). Criar a ficha gera a
              linha no banco e já vincula o login do app.
            </p>
            <ul className="space-y-2 list-none p-0 m-0">
              {semFicha.map((u) => (
                <li
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2"
                >
                  <span className="text-sm">
                    <span className="font-medium">{u.nome}</span>
                    {u.email ? (
                      <span className="text-muted-foreground"> — {u.email}</span>
                    ) : null}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={criarFicha.isPending}
                    onClick={() => {
                      void (async () => {
                        try {
                          await criarFicha.mutateAsync(u.id);
                          toast.success(`Ficha criada para ${u.nome}.`);
                        } catch (e: unknown) {
                          toast.error(e instanceof Error ? e.message : 'Não foi possível criar a ficha.');
                        }
                      })();
                    }}
                  >
                    {criarFicha.isPending && criarFicha.variables === u.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        Criando…
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5 mr-1" />
                        Criar ficha na frota
                      </>
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome, CPF ou celular…"
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : motoristas.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border">
          <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum motorista encontrado.</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>CNH</th>
                <th>Categorias</th>
                <th>Vencimento CNH</th>
                <th>Telefone</th>
                <th>App motorista</th>
                <th>Status</th>
                <th className="text-right w-[1%]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {motoristas.map((m) => {
                const vencida = cnhVencida(m.dataVencimentoCnh);
                return (
                  <tr key={m.id}>
                    <td className="font-medium">{m.nome}</td>
                    <td className="font-mono text-xs">{m.cpf || '—'}</td>
                    <td className="font-mono text-xs">{m.cnh || '—'}</td>
                    <td>{fmtCategorias(m)}</td>
                    <td>
                      {m.dataVencimentoCnh ? (
                        <span className={vencida ? 'text-destructive font-medium' : ''}>
                          {new Date(m.dataVencimentoCnh).toLocaleDateString('pt-BR')}
                          {vencida && ' ⚠'}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{m.celular || m.telefone || '—'}</td>
                    <td>
                      {m.userId ? (
                        <Badge variant="secondary" className="font-normal">
                          Vinculado
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Não vinculado</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button type="button" variant="outline" size="sm" onClick={() => abrirEdicao(m)}>
                          <Pencil className="w-3.5 h-3.5 mr-1" />
                          Editar
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => abrirVinculo(m)}>
                          <Link2 className="w-3.5 h-3.5 mr-1" />
                          Login app
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={fichaOpen}
        onOpenChange={(o) => {
          setFichaOpen(o);
          if (!o) {
            setFichaMotorista(null);
            setFichaForm(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar ficha do motorista</DialogTitle>
            <DialogDescription>
              Sem login do app vinculado, a edição fica nesta tela. Com vínculo, use <strong>Editar</strong> para abrir o
              cadastro de usuário com CNH e dados da frota.
            </DialogDescription>
          </DialogHeader>
          {fichaForm && (
            <MotoristaFichaFields
              value={fichaForm}
              onChange={(patch) => setFichaForm((prev) => (prev ? { ...prev, ...patch } : prev))}
              disabled={updateMotorista.isPending}
            />
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setFichaOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void salvarFicha()} disabled={updateMotorista.isPending || !fichaForm}>
              {updateMotorista.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando…
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={vinculoOpen} onOpenChange={(o) => { setVinculoOpen(o); if (!o) setEditando(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular usuário do app</DialogTitle>
            <DialogDescription>
              Escolha o perfil (mesmo tenant) que o motorista usará para acessar{' '}
              <strong>/motorista</strong>. Recomenda-se que esse usuário tenha o papel{' '}
              <strong>motorista</strong> em Usuários.
            </DialogDescription>
          </DialogHeader>

          {editando && (
            <div className="space-y-3 py-1">
              <p className="text-sm text-muted-foreground">
                Motorista: <span className="font-medium text-foreground">{editando.nome}</span>
              </p>
              <div className="space-y-2">
                <Label htmlFor="motorista-user">Usuário (login)</Label>
                <Select value={userSelect} onValueChange={setUserSelect} disabled={loadingCandidatos}>
                  <SelectTrigger id="motorista-user">
                    <SelectValue placeholder={loadingCandidatos ? 'Carregando…' : 'Selecionar usuário'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>(sem vínculo)</SelectItem>
                    {opcoesSelect.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <span className="flex items-center gap-2 flex-wrap">
                          <span>{u.nome}</span>
                          {u.email && (
                            <span className="text-muted-foreground text-xs">({u.email})</span>
                          )}
                          {u.temPapelMotorista && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-5">
                              papel motorista
                            </Badge>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setVinculoOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void salvarVinculo()} disabled={updateMotorista.isPending}>
              {updateMotorista.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando…
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
