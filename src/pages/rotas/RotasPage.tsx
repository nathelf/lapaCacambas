import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  CalendarDays, Truck, User, Plus, Loader2, RefreshCw,
  MapPin, ClipboardList, ChevronDown, ChevronUp, X,
} from 'lucide-react';
import {
  useExecucoes, useRotas, useMotoristasAll, useVeiculosAll,
  useAtribuirExecucao, useCriarRota, useAdicionarParada,
  useRemoverParada, useStatusRota,
} from '@/hooks/useQuery';
import { STATUS_EXECUCAO_LABELS } from '@/types/enums';
import { toast } from 'sonner';

// ─── Utilitários ──────────────────────────────────────────────────────────────

function hoje() {
  return new Date().toISOString().split('T')[0];
}

function fmtData(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR');
}

function fmtHora(h?: string | null) {
  if (!h) return '';
  return h.slice(0, 5);
}

// ─── Card de Execução ─────────────────────────────────────────────────────────

function ExecucaoCard({
  ex,
  motoristas,
  veiculos,
  onAtribuir,
  onAddRota,
}: {
  ex: any;
  motoristas: any[];
  veiculos: any[];
  onAtribuir: (id: number, motoristaId: number, veiculoId: number) => Promise<void>;
  onAddRota: (ex: any) => void;
}) {
  const [motoristaId, setMotoristaId] = useState('');
  const [veiculoId, setVeiculoId] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAtribuir = async () => {
    if (!motoristaId || !veiculoId) {
      toast.error('Selecione motorista e veículo.');
      return;
    }
    setSaving(true);
    try {
      await onAtribuir(ex.id, Number(motoristaId), Number(veiculoId));
      toast.success('Execução atribuída!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atribuir.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-foreground">{ex.pedidoNumero ?? `Pedido #${ex.pedidoId}`}</p>
          <p className="text-muted-foreground">{ex.clienteNome ?? '—'}</p>
        </div>
        <StatusBadge status={ex.status} labels={STATUS_EXECUCAO_LABELS} />
      </div>

      {ex.enderecoEntrega && (
        <p className="flex items-center gap-1 text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          {ex.enderecoEntrega}
        </p>
      )}

      <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
        {ex.dataProgramada && (
          <span className="flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" />
            {fmtData(ex.dataProgramada)} {fmtHora(ex.horaProgramada)}
          </span>
        )}
        {ex.cacambaNumero && <span>Caçamba {ex.cacambaNumero}</span>}
        <span className="capitalize">{ex.pedidoTipo?.replace(/_/g, ' ')}</span>
      </div>

      {!ex.motoristaId ? (
        <div className="pt-2 border-t space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Atribuir motorista e veículo</p>
          <div className="flex gap-2">
            <Select value={motoristaId} onValueChange={setMotoristaId}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Motorista" />
              </SelectTrigger>
              <SelectContent>
                {motoristas.map((m: any) => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={veiculoId} onValueChange={setVeiculoId}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Veículo" />
              </SelectTrigger>
              <SelectContent>
                {veiculos.map((v: any) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.placa}{v.modelo ? ` — ${v.modelo}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8 px-3 text-xs" onClick={handleAtribuir} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'OK'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="pt-2 border-t flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <User className="w-3.5 h-3.5" /> {ex.motoristaNome}
            <Truck className="w-3.5 h-3.5 ml-2" /> {ex.veiculoPlaca}
          </span>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onAddRota(ex)}>
            + Rota
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Card de Rota ─────────────────────────────────────────────────────────────

function RotaCard({
  rota,
  onStatusChange,
  onRemoveParada,
}: {
  rota: any;
  onStatusChange: (id: number, status: string) => void;
  onRemoveParada: (rotaId: number, paradaId: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const proximoStatus: Record<string, { label: string; value: string } | null> = {
    planejada:    { label: 'Iniciar Rota', value: 'em_andamento' },
    em_andamento: { label: 'Concluir Rota', value: 'concluida' },
    concluida:    null,
    cancelada:    null,
  };

  const proximo = proximoStatus[rota.status];

  return (
    <div className="rounded-lg border bg-card text-sm overflow-hidden">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/40 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Truck className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="font-medium truncate">{rota.motoristaNome ?? '—'}</p>
            <p className="text-xs text-muted-foreground">{rota.veiculoPlaca} · {fmtData(rota.data)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={rota.status} />
          <span className="text-xs text-muted-foreground">{rota.paradas?.length ?? 0} paradas</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t divide-y">
          {(rota.paradas ?? []).length === 0 ? (
            <p className="px-4 py-3 text-xs text-muted-foreground">Nenhuma parada adicionada.</p>
          ) : (
            (rota.paradas as any[]).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-2 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono text-muted-foreground w-4 shrink-0">{p.ordem}</span>
                  <div className="min-w-0">
                    <p className="truncate">{p.pedidoNumero ?? p.endereco ?? '—'}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.clienteNome}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={p.status} labels={STATUS_EXECUCAO_LABELS} />
                  <button
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => onRemoveParada(rota.id, p.id)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}

          {proximo && (
            <div className="p-3">
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs h-8"
                onClick={() => onStatusChange(rota.id, proximo.value)}
              >
                {proximo.label}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Modal Nova Rota ──────────────────────────────────────────────────────────

function NovaRotaDialog({
  open,
  onClose,
  dataSelecionada,
  motoristas,
  veiculos,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  dataSelecionada: string;
  motoristas: any[];
  veiculos: any[];
  onCreate: (motoristaId: number, veiculoId: number, observacao?: string) => Promise<void>;
}) {
  const [motoristaId, setMotoristaId] = useState('');
  const [veiculoId, setVeiculoId] = useState('');
  const [obs, setObs] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSalvar = async () => {
    if (!motoristaId || !veiculoId) {
      toast.error('Selecione motorista e veículo.');
      return;
    }
    setSaving(true);
    try {
      await onCreate(Number(motoristaId), Number(veiculoId), obs || undefined);
      toast.success('Rota criada!');
      setMotoristaId(''); setVeiculoId(''); setObs('');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar rota.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Rota — {fmtData(dataSelecionada)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Motorista</label>
            <Select value={motoristaId} onValueChange={setMotoristaId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {motoristas.map((m: any) => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Veículo</label>
            <Select value={veiculoId} onValueChange={setVeiculoId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {veiculos.map((v: any) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.placa}{v.modelo ? ` — ${v.modelo}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Observação</label>
            <input
              className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={obs}
              onChange={e => setObs(e.target.value)}
              placeholder="Opcional..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Criar Rota
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function RotasPage() {
  const [dataSelecionada, setDataSelecionada] = useState(hoje());
  const [novaRotaOpen, setNovaRotaOpen] = useState(false);
  const [addRotaExecucao, setAddRotaExecucao] = useState<any>(null);

  const { data: execucoes = [], isLoading: loadingEx, refetch: refetchEx } =
    useExecucoes({ data: dataSelecionada });

  const { data: rotas = [], isLoading: loadingRotas, refetch: refetchRotas } =
    useRotas({ data: dataSelecionada });

  const { data: motoristas = [] } = useMotoristasAll();
  const { data: veiculos = [] } = useVeiculosAll();

  const atribuirExecucao = useAtribuirExecucao();
  const criarRota = useCriarRota();
  const adicionarParada = useAdicionarParada();
  const removerParada = useRemoverParada();
  const statusRota = useStatusRota();

  const semAtribuicao = (execucoes as any[]).filter((e: any) => !e.motoristaId && e.status === 'pendente');
  const comAtribuicao = (execucoes as any[]).filter((e: any) => e.motoristaId && e.status === 'pendente');

  const handleAtribuir = async (id: number, motoristaId: number, veiculoId: number) => {
    await atribuirExecucao.mutateAsync({ id, motoristaId, veiculoId });
  };

  const handleCriarRota = async (motoristaId: number, veiculoId: number, observacao?: string) => {
    await criarRota.mutateAsync({ data: dataSelecionada, motoristaId, veiculoId, observacao });
  };

  const handleAddParada = async (rotaId: number, ex: any) => {
    const paradas = (rotas as any[]).find((r: any) => r.id === rotaId)?.paradas ?? [];
    try {
      await adicionarParada.mutateAsync({
        rotaId,
        dto: {
          pedidoId: ex.pedidoId,
          ordem: paradas.length + 1,
          endereco: ex.enderecoEntrega ?? undefined,
          tipo: ex.pedidoTipo ?? undefined,
        },
      });
      toast.success('Parada adicionada à rota!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao adicionar parada.');
    }
    setAddRotaExecucao(null);
  };

  const handleRemoverParada = async (rotaId: number, paradaId: number) => {
    try {
      await removerParada.mutateAsync({ rotaId, paradaId });
      toast.success('Parada removida.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover parada.');
    }
  };

  const handleStatusRota = async (id: number, status: string) => {
    try {
      await statusRota.mutateAsync({ id, status });
      toast.success('Status da rota atualizado!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar rota.');
    }
  };

  const isLoading = loadingEx || loadingRotas;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Programação Diária"
        subtitle="Atribuição de execuções e planejamento de rotas"
        actions={
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dataSelecionada}
              onChange={e => setDataSelecionada(e.target.value)}
              className="h-9 px-3 rounded-md border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button variant="outline" size="sm" onClick={() => { refetchEx(); refetchRotas(); }}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={() => setNovaRotaOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Nova Rota
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Coluna esquerda: Execuções do dia */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">Execuções — {fmtData(dataSelecionada)}</h2>
              <span className="ml-auto text-xs text-muted-foreground">
                {semAtribuicao.length} sem atribuição · {comAtribuicao.length} atribuídas
              </span>
            </div>

            {semAtribuicao.length === 0 && comAtribuicao.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nenhuma execução para esta data.
              </p>
            )}

            {semAtribuicao.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">
                  Aguardando atribuição ({semAtribuicao.length})
                </p>
                {semAtribuicao.map((ex: any) => (
                  <ExecucaoCard
                    key={ex.id}
                    ex={ex}
                    motoristas={motoristas as any[]}
                    veiculos={veiculos as any[]}
                    onAtribuir={handleAtribuir}
                    onAddRota={setAddRotaExecucao}
                  />
                ))}
              </div>
            )}

            {comAtribuicao.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                  Atribuídas ({comAtribuicao.length})
                </p>
                {comAtribuicao.map((ex: any) => (
                  <ExecucaoCard
                    key={ex.id}
                    ex={ex}
                    motoristas={motoristas as any[]}
                    veiculos={veiculos as any[]}
                    onAtribuir={handleAtribuir}
                    onAddRota={setAddRotaExecucao}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Coluna direita: Rotas do dia */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">Rotas — {fmtData(dataSelecionada)}</h2>
              <span className="ml-auto text-xs text-muted-foreground">
                {(rotas as any[]).length} rota(s)
              </span>
            </div>

            {(rotas as any[]).length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nenhuma rota para esta data.
              </p>
            ) : (
              (rotas as any[]).map((rota: any) => (
                <RotaCard
                  key={rota.id}
                  rota={rota}
                  onStatusChange={handleStatusRota}
                  onRemoveParada={handleRemoverParada}
                />
              ))
            )}
          </div>
        </div>
      )}

      <NovaRotaDialog
        open={novaRotaOpen}
        onClose={() => setNovaRotaOpen(false)}
        dataSelecionada={dataSelecionada}
        motoristas={motoristas as any[]}
        veiculos={veiculos as any[]}
        onCreate={handleCriarRota}
      />

      {/* Modal: vincular execução a uma rota existente */}
      {addRotaExecucao && (
        <Dialog open onOpenChange={v => !v && setAddRotaExecucao(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Adicionar à Rota</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-1">
              Pedido: <strong>{addRotaExecucao.pedidoNumero}</strong> · {addRotaExecucao.clienteNome}
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(rotas as any[])
                .filter((r: any) => r.status !== 'concluida' && r.status !== 'cancelada')
                .map((r: any) => (
                  <button
                    key={r.id}
                    className="w-full text-left rounded-md border px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                    onClick={() => handleAddParada(r.id, addRotaExecucao)}
                  >
                    <p className="font-medium">{r.motoristaNome}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.veiculoPlaca} · {r.paradas?.length ?? 0} paradas
                    </p>
                  </button>
                ))}
              {(rotas as any[]).filter((r: any) => r.status !== 'concluida' && r.status !== 'cancelada').length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma rota ativa. Crie uma rota primeiro.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddRotaExecucao(null)}>Cancelar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
