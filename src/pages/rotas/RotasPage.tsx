import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  CalendarDays, Truck, User, Plus, Loader2, RefreshCw,
  MapPin, ClipboardList, ChevronDown, ChevronUp, X, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  useExecucoes, useRotas, useMotoristasAll, useVeiculosAll,
  useAtribuirExecucao, useCriarRota, useAdicionarParada,
  useRemoverParada, useStatusRota, useOtimizarRota, useHasPermissao, useRotaUpdateDate,
} from '@/hooks/useQuery';
import { STATUS_EXECUCAO_LABELS } from '@/types/enums';
import { RoutePlannerPanel } from '@/components/rotas/RoutePlannerPanel';
import type { RouteOptimizationResult } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { corrigirMojibakeUtf8 } from '../../../shared/mojibake';

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

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function weekFrom(dateIso: string) {
  const d = new Date(`${dateIso}T12:00:00`);
  const day = d.getDay(); // 0 dom ... 6 sab
  const deltaToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + deltaToMonday);
  const days: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    days.push(isoDate(x));
  }
  return days;
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
  chegadaHighlight = false,
  onStatusChange,
  onRemoveParada,
}: {
  rota: any;
  chegadaHighlight?: boolean;
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
          {chegadaHighlight && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 animate-pulse">
              📍 Chegou
            </span>
          )}
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
  execucoesAbertas,
  canAdjustRate,
  motoristas,
  veiculos,
  onCreate,
  onOptimize,
  optimizeLoading,
  optimizeResult,
}: {
  open: boolean;
  onClose: () => void;
  dataSelecionada: string;
  execucoesAbertas: any[];
  canAdjustRate: boolean;
  motoristas: any[];
  veiculos: any[];
  onCreate: (args: { dataRota: string; motoristaId: number; veiculoId: number; observacao?: string; execucao: any; valorLocacao?: number }) => Promise<void>;
  onOptimize: (args: {
    destino: { lat: number; lng: number; label: string };
    consumoKmLitro: number;
    dieselPreco: number;
    custoManutencaoKm: number;
    custoHoraOperacao: number;
    valorLocacao?: number;
    veiculoId?: number;
  }) => void;
  optimizeLoading: boolean;
  optimizeResult: RouteOptimizationResult | null;
}) {
  const [dataRota, setDataRota] = useState(dataSelecionada);
  const [motoristaId, setMotoristaId] = useState('');
  const [veiculoId, setVeiculoId] = useState('');
  const [execucaoId, setExecucaoId] = useState('');
  const [obs, setObs] = useState('');
  const [saving, setSaving] = useState(false);
  const [destinoValidado, setDestinoValidado] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [valorLocacao, setValorLocacao] = useState('');

  useEffect(() => {
    if (open) setDataRota(dataSelecionada);
  }, [open, dataSelecionada]);

  const execucaoSelecionada = execucoesAbertas.find((e: any) => String(e.id) === execucaoId) ?? null;

  const clienteNome = (() => {
    const n = corrigirMojibakeUtf8(execucaoSelecionada?.clienteNome ?? '');
    return n || '—';
  })();
  const enderecoExecucao = corrigirMojibakeUtf8(execucaoSelecionada?.enderecoEntrega ?? '');
  const consumoVeiculo = (() => {
    const v = veiculos.find((x: any) => String(x.id) === veiculoId);
    const raw = Number(v?.consumoMedio ?? v?.consumo_medio ?? 2.8);
    return Number.isFinite(raw) && raw > 0 ? raw : 2.8;
  })();

  const handleSalvar = async () => {
    if (!execucaoSelecionada) {
      toast.error('Selecione uma ordem de serviço aberta.');
      return;
    }
    if (!motoristaId || !veiculoId) {
      toast.error('Selecione motorista e veículo.');
      return;
    }
    if (!enderecoExecucao) {
      toast.error('A OS selecionada não possui endereço de entrega.');
      return;
    }
    if (!destinoValidado) {
      toast.error('Valide o endereço da OS antes de criar a rota.');
      return;
    }
    setSaving(true);
    try {
      const sugestao = optimizeResult?.opcoes.find(o => o.id === optimizeResult.sugestaoId);
      const obsAuto = sugestao
        ? `Rota sugerida IA: ${sugestao.nome} | Dist: ${(sugestao.distanceMeters / 1000).toFixed(1)}km | Tempo: ${Math.round(sugestao.durationSec / 60)}min | Custo: R$ ${sugestao.custoTotal.toFixed(2)}`
        : '';
      const observacaoFinal = [obs.trim(), obsAuto].filter(Boolean).join(' | ');
      await onCreate({
        dataRota,
        motoristaId: Number(motoristaId),
        veiculoId: Number(veiculoId),
        observacao: observacaoFinal || undefined,
        execucao: execucaoSelecionada,
        valorLocacao: valorLocacao.trim() ? Number(valorLocacao.replace(',', '.')) : undefined,
      });
      toast.success('Rota criada!');
      setMotoristaId(''); setVeiculoId(''); setExecucaoId(''); setObs(''); setDestinoValidado(null); setValorLocacao(''); setDataRota(dataSelecionada);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar rota.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Nova Rota — {fmtData(dataSelecionada)}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5 py-2">
          <div className="space-y-4">
            <div className="rounded-lg border p-3 space-y-3">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Execução e equipe</Label>
              <div className="space-y-1">
                <Label>Ordem de serviço aberta</Label>
              <Select
                value={execucaoId}
                onValueChange={(v) => {
                  setExecucaoId(v);
                  setDestinoValidado(null);
                  const ex = execucoesAbertas.find((e: any) => String(e.id) === v);
                  if (ex?.motoristaId) setMotoristaId(String(ex.motoristaId));
                  if (ex?.veiculoId) setVeiculoId(String(ex.veiculoId));
                  const valor = ex?.valorLocacao ?? ex?.valor_total ?? ex?.valorTotal ?? null;
                  setValorLocacao(valor != null ? String(valor).replace('.', ',') : '');
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione a OS..." /></SelectTrigger>
                <SelectContent>
                  {execucoesAbertas.map((e: any) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.pedidoNumero ?? `Pedido #${e.pedidoId}`} — {e.clienteNome ?? 'Cliente'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Data da rota</Label>
              <input
                type="date"
                value={dataRota}
                onChange={e => setDataRota(e.target.value)}
                className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <Label>Motorista</Label>
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
              <Label>Veículo</Label>
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
              <p className="text-xs text-muted-foreground">Consumo: {consumoVeiculo.toFixed(1).replace('.', ',')} km/l</p>
            </div>
            <div className="space-y-1">
              <Label>Observação</Label>
              <input
                className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={obs}
                onChange={e => setObs(e.target.value)}
                placeholder="Opcional..."
              />
            </div>
            </div>
            <div className="rounded-lg border p-3 space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Cliente e destino</Label>
              <div className="space-y-1">
                <Label>Cliente</Label>
                <input className="w-full h-9 px-3 rounded-md border bg-muted text-sm" value={clienteNome} readOnly />
              </div>
              <div className="space-y-1">
                <Label>Endereço</Label>
                <input className="w-full h-9 px-3 rounded-md border bg-muted text-sm" value={enderecoExecucao || '—'} readOnly />
              </div>
            </div>
          </div>
          <div className="rounded-lg border p-3 space-y-3">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Origem e análise operacional</Label>
            <RoutePlannerPanel
              veiculoId={veiculoId ? Number(veiculoId) : undefined}
              presetAddress={enderecoExecucao || undefined}
              consumoKmLitro={consumoVeiculo}
              dieselPreco={6.2}
              custoManutencaoKm={1.15}
              custoHoraOperacao={68}
              valorLocacao={valorLocacao}
              canEditValorLocacao={canAdjustRate}
              onValorLocacaoChange={setValorLocacao}
              loading={optimizeLoading}
              result={optimizeResult}
              onDestinationResolved={setDestinoValidado}
              onOptimize={(args) => onOptimize({ ...args, veiculoId: veiculoId ? Number(veiculoId) : undefined })}
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
  const [optimizeResult, setOptimizeResult] = useState<RouteOptimizationResult | null>(null);
  const [visaoRotas, setVisaoRotas] = useState<'lista' | 'kanban'>('kanban');
  const [motoristaFiltroKanban, setMotoristaFiltroKanban] = useState('todos');
  const [statusRealtimeByRotaId, setStatusRealtimeByRotaId] = useState<Record<number, string>>({});
  const [chegadaHighlightByRotaId, setChegadaHighlightByRotaId] = useState<Record<number, boolean>>({});

  const { data: execucoes = [], isLoading: loadingEx, refetch: refetchEx } =
    useExecucoes({ data: dataSelecionada });
  const { data: execucoesPendentesTodas = [] } =
    useExecucoes({ status: 'pendente' });

  const { data: rotas = [], isLoading: loadingRotas, refetch: refetchRotas } =
    useRotas({ data: dataSelecionada });
  const diasSemana = useMemo(() => weekFrom(dataSelecionada), [dataSelecionada]);
  const { data: rotasAll = [] } = useRotas({ dataInicio: diasSemana[0], dataFim: diasSemana[6] });

  const { data: motoristas = [] } = useMotoristasAll();
  const { data: veiculos = [] } = useVeiculosAll();

  const atribuirExecucao = useAtribuirExecucao();
  const criarRota = useCriarRota();
  const adicionarParada = useAdicionarParada();
  const removerParada = useRemoverParada();
  const statusRota = useStatusRota();
  const otimizarRota = useOtimizarRota();
  const rotaUpdateDate = useRotaUpdateDate();
  const canAdjustRate = useHasPermissao('rotas.ajustar_taxa');

  const semAtribuicao = (execucoes as any[]).filter((e: any) => !e.motoristaId && e.status === 'pendente');
  const comAtribuicao = (execucoes as any[]).filter((e: any) => e.motoristaId && e.status === 'pendente');
  const rotasSemana = useMemo(() => {
    const set = new Set(diasSemana);
    const list = (rotasAll as any[]).filter((r: any) => set.has(String(r.data).slice(0, 10)));
    if (motoristaFiltroKanban === 'todos') return list;
    return list.filter((r: any) => String(r.motoristaId) === motoristaFiltroKanban);
  }, [rotasAll, diasSemana, motoristaFiltroKanban]);
  const rotaIdByParadaId = useMemo(() => {
    const map = new Map<number, number>();
    for (const r of rotasAll as any[]) {
      for (const p of (r.paradas ?? [])) {
        if (p?.id != null) map.set(Number(p.id), Number(r.id));
      }
    }
    for (const r of rotas as any[]) {
      for (const p of (r.paradas ?? [])) {
        if (p?.id != null && !map.has(Number(p.id))) map.set(Number(p.id), Number(r.id));
      }
    }
    return map;
  }, [rotasAll, rotas]);
  const execucoesAbertasSelect = (() => {
    const doDia = (execucoes as any[]).filter((e: any) => e.status === 'pendente');
    if (doDia.length > 0) return doDia;
    return (execucoesPendentesTodas as any[]).filter((e: any) => e.status === 'pendente');
  })();
  const handleAtribuir = async (id: number, motoristaId: number, veiculoId: number) => {
    await atribuirExecucao.mutateAsync({ id, motoristaId, veiculoId });
  };

  const handleCriarRota = async ({ dataRota, motoristaId, veiculoId, observacao, execucao, valorLocacao }: {
    dataRota: string;
    motoristaId: number;
    veiculoId: number;
    observacao?: string;
    execucao: any;
    valorLocacao?: number;
  }) => {
    const obsFinal = [
      observacao,
      valorLocacao != null ? `Valor locação: R$ ${valorLocacao.toFixed(2)}` : '',
    ].filter(Boolean).join(' | ');
    const rota = await criarRota.mutateAsync({ data: dataRota, motoristaId, veiculoId, observacao: obsFinal || undefined });
    const ordem = ((rota as any)?.paradas?.length ?? 0) + 1;
    await adicionarParada.mutateAsync({
      rotaId: (rota as any).id,
      dto: {
        pedidoId: execucao.pedidoId,
        ordem,
        endereco: execucao.enderecoEntrega ?? undefined,
        tipo: execucao.pedidoTipo ?? undefined,
      },
    });
  };

  const handleOptimizeRoute = async (args: {
    destino: { lat: number; lng: number; label: string };
    consumoKmLitro: number;
    dieselPreco: number;
    custoManutencaoKm: number;
    custoHoraOperacao: number;
    valorLocacao?: number;
    veiculoId?: number;
  }) => {
    try {
      const data = await otimizarRota.mutateAsync({
        origem: { lat: -24.9578, lng: -53.4595, label: 'Lapa Caçambas — Sede' },
        destino: args.destino,
        veiculoId: args.veiculoId,
        dieselPreco: args.dieselPreco,
        consumoKmLitro: args.consumoKmLitro,
        custoManutencaoKm: args.custoManutencaoKm,
        custoHoraOperacao: args.custoHoraOperacao,
        valorLocacao: args.valorLocacao,
      });
      setOptimizeResult(data);
      toast.success('Roteirização concluída com sugestão IA.');
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao otimizar rota.');
    }
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

  const changeWeek = (deltaDays: number) => {
    const d = new Date(`${dataSelecionada}T12:00:00`);
    d.setDate(d.getDate() + deltaDays);
    setDataSelecionada(isoDate(d));
  };

  const handleMoveRotaKanban = async (rotaId: number, diaDestino: string) => {
    try {
      await rotaUpdateDate.mutateAsync({ id: rotaId, data: diaDestino });
      toast.success('Data da rota atualizada.');
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível mover a rota.');
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel('rotas-kanban-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rotas' }, (payload: any) => {
        const id = Number(payload?.new?.id);
        const status = payload?.new?.status;
        if (Number.isFinite(id) && typeof status === 'string') {
          setStatusRealtimeByRotaId(prev => ({ ...prev, [id]: status }));
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'execucoes' }, (payload: any) => {
        const st = String(payload?.new?.status ?? '');
        if (st !== 'no_local' && st !== 'no_cliente') return;
        const paradaId = Number(payload?.new?.rota_parada_id);
        if (!Number.isFinite(paradaId)) return;
        const rotaId = rotaIdByParadaId.get(paradaId);
        if (!rotaId) return;

        setChegadaHighlightByRotaId(prev => ({ ...prev, [rotaId]: true }));
        setTimeout(() => {
          setChegadaHighlightByRotaId(prev => {
            const next = { ...prev };
            delete next[rotaId];
            return next;
          });
        }, 12000);
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [rotaIdByParadaId]);

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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisaoRotas(v => (v === 'lista' ? 'kanban' : 'lista'))}
            >
              {visaoRotas === 'lista' ? 'Kanban semanal' : 'Lista do dia'}
            </Button>
            <Button size="sm" onClick={() => { setOptimizeResult(null); setNovaRotaOpen(true); }}>
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
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-xl border bg-card p-4 sm:p-5 space-y-4">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-r from-primary/12 via-primary/5 to-cyan-400/10" />
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">Kanban semanal de rotas</h2>
              <span className="ml-auto text-xs text-muted-foreground">{rotasSemana.length} rota(s) na semana</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => changeWeek(-7)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <input
                type="date"
                value={dataSelecionada}
                onChange={e => setDataSelecionada(e.target.value)}
                className="h-9 px-3 rounded-md border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button variant="outline" size="sm" onClick={() => changeWeek(7)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Select value={motoristaFiltroKanban} onValueChange={setMotoristaFiltroKanban}>
                <SelectTrigger className="w-64 h-9">
                  <SelectValue placeholder="Todos os motoristas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os motoristas</SelectItem>
                  {(motoristas as any[]).map((m: any) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => setVisaoRotas(v => (v === 'kanban' ? 'lista' : 'kanban'))}
              >
                {visaoRotas === 'kanban' ? 'Mostrar lista do dia' : 'Ocultar lista do dia'}
              </Button>
            </div>

            <div className="overflow-x-auto pb-1">
              <div className="grid grid-cols-7 gap-4 min-w-[1420px]">
                {diasSemana.map((dia) => {
                  const isToday = dia === hoje();
                  const itens = rotasSemana
                    .filter((r: any) => String(r.data).slice(0, 10) === dia)
                    .sort((a: any, b: any) => (a.motoristaNome || '').localeCompare(b.motoristaNome || ''));
                  return (
                    <div
                      key={dia}
                      className={`rounded-lg border bg-background shadow-sm ${isToday ? 'ring-2 ring-primary/40' : ''}`}
                      onDragOver={e => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const id = Number(e.dataTransfer.getData('rotaId'));
                        if (Number.isFinite(id)) void handleMoveRotaKanban(id, dia);
                      }}
                    >
                      <div className="px-3 py-2 border-b bg-muted/70 backdrop-blur sticky top-0 z-10">
                        <div className="text-xs font-semibold">{fmtData(dia)}</div>
                        <div className="text-[11px] text-muted-foreground">{itens.length} rota(s)</div>
                      </div>
                      <div className="p-2.5 space-y-2.5 min-h-[320px] max-h-[520px] overflow-y-auto">
                        {itens.length === 0 && (
                          <div className="text-[11px] text-muted-foreground text-center py-6 border border-dashed rounded-md">Sem rotas</div>
                        )}
                        {itens.map((r: any, idx: number) => {
                          const statusRt = statusRealtimeByRotaId[Number(r.id)];
                          const statusView = statusRt ?? r.status;
                          const chegou = !!chegadaHighlightByRotaId[Number(r.id)];
                          const prioridadeVisual =
                            statusView === 'em_andamento'
                              ? 'border-l-4 border-l-amber-500 bg-amber-50/40 shadow-md'
                              : statusView === 'planejada'
                                ? 'border-l-4 border-l-blue-500 bg-blue-50/30 shadow-sm'
                                : statusView === 'concluida'
                                  ? 'border-l-4 border-l-green-500 bg-emerald-50/20 shadow-sm'
                                  : 'border-l-4 border-l-red-500 bg-rose-50/30 shadow-sm';
                          return (
                            <button
                              key={r.id}
                              draggable
                              onDragStart={(e) => e.dataTransfer.setData('rotaId', String(r.id))}
                              className={`w-full text-left rounded-md border p-2.5 opacity-0 animate-fade-in-up transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/30 ${prioridadeVisual}`}
                              style={{
                                animationDelay: `${idx * 45}ms`,
                                animationDuration: '380ms',
                                animationFillMode: 'forwards',
                              }}
                              onClick={() => setDataSelecionada(String(r.data).slice(0, 10))}
                            >
                              <div className="text-xs font-semibold truncate flex items-center gap-1">
                                <User className="w-3 h-3" /> {r.motoristaNome || 'Motorista não definido'}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                                <Truck className="w-3 h-3" /> {r.veiculoPlaca || 'Veículo —'}
                              </div>
                              <div className="mt-1.5 flex items-center justify-between gap-2">
                                <div className="text-[11px] text-muted-foreground">{r.paradas?.length ?? 0} paradas</div>
                                <StatusBadge status={statusView} />
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 min-h-4">
                                {chegou && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 animate-pulse">
                                    📍 Chegou
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {visaoRotas === 'lista' && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-semibold text-sm">Rotas do dia — {fmtData(dataSelecionada)}</h2>
                <span className="ml-auto text-xs text-muted-foreground">{(rotas as any[]).length} rota(s)</span>
              </div>
              {(rotas as any[]).length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center border rounded-lg bg-card">
                  Nenhuma rota para esta data.
                </p>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {(rotas as any[]).map((rota: any) => {
                    const statusRt = statusRealtimeByRotaId[Number(rota.id)];
                    const rotaView = statusRt ? { ...rota, status: statusRt } : rota;
                    return (
                      <RotaCard
                        key={rota.id}
                        rota={rotaView}
                        chegadaHighlight={!!chegadaHighlightByRotaId[Number(rota.id)]}
                        onStatusChange={handleStatusRota}
                        onRemoveParada={handleRemoverParada}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          )}

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">Execuções — {fmtData(dataSelecionada)}</h2>
              <span className="ml-auto text-xs text-muted-foreground">
                {semAtribuicao.length} sem atribuição · {comAtribuicao.length} atribuídas
              </span>
            </div>

            {semAtribuicao.length === 0 && comAtribuicao.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center border rounded-lg bg-card">
                Nenhuma execução para esta data.
              </p>
            )}

            {semAtribuicao.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">
                  Aguardando atribuição ({semAtribuicao.length})
                </p>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
              </div>
            )}

            {comAtribuicao.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                  Atribuídas ({comAtribuicao.length})
                </p>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
              </div>
            )}
          </section>
        </div>
      )}

      <NovaRotaDialog
        open={novaRotaOpen}
        onClose={() => { setNovaRotaOpen(false); setOptimizeResult(null); }}
        dataSelecionada={dataSelecionada}
        execucoesAbertas={execucoesAbertasSelect}
        canAdjustRate={canAdjustRate}
        motoristas={motoristas as any[]}
        veiculos={veiculos as any[]}
        onCreate={handleCriarRota}
        onOptimize={handleOptimizeRoute}
        optimizeLoading={otimizarRota.isPending}
        optimizeResult={optimizeResult}
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
