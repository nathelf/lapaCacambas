import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, MapPin, Truck, Trash2,
  ArrowUpRight, User, Rows3, LayoutList,
  CheckCircle2, History, MessageSquare, ArrowRight, Inbox, Filter,
  X, Phone, Camera,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useExecucoes, useAtribuirExecucao, useStatusExecucao,
  useMotoristasAll, useVeiculosAll, usePedidos, useCreateExecucao,
} from '@/hooks/useQuery';

// ── Tipos ──────────────────────────────────────────────────────────────────────

type OSStatus = 'pendente' | 'transito' | 'entregue' | 'coletada' | 'cancelada';
type Urgency  = 'normal' | 'atrasada' | 'critica';

// ── Helpers ────────────────────────────────────────────────────────────────────

function mapStatus(s: string): OSStatus {
  if (s === 'em_rota')                           return 'transito';
  if (s === 'no_local' || s === 'executando')    return 'entregue';
  if (s === 'concluida')                         return 'coletada';
  if (s === 'cancelada')                         return 'cancelada';
  return 'pendente';
}

function nextBackendStatus(current: string): string | null {
  if (current === 'pendente')                         return 'em_rota';
  if (current === 'em_rota')                          return 'no_local';
  if (current === 'no_local' || current === 'executando') return 'concluida';
  return null;
}

function calcUrgency(os: any): Urgency {
  if (['concluida', 'cancelada'].includes(os.status)) return 'normal';
  if (!os.dataProgramada) return 'normal';
  const prazo = new Date(`${os.dataProgramada}T${os.horaProgramada ?? '23:59'}`);
  const diff  = (prazo.getTime() - Date.now()) / 3_600_000;
  if (diff < 0) return 'atrasada';
  if (os.status === 'pendente' && diff < 2) return 'critica';
  return 'normal';
}

function prazoLabel(os: any): string {
  if (!os.dataProgramada) return '—';
  const today     = new Date().toISOString().slice(0, 10);
  const tomorrow  = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const hora = os.horaProgramada ? ` ${String(os.horaProgramada).slice(0, 5)}` : '';
  if (os.dataProgramada === today)     return `Hoje${hora}`;
  if (os.dataProgramada === tomorrow)  return `Amanhã${hora}`;
  if (os.dataProgramada === yesterday) return `Ontem${hora}`;
  const [, m, d] = os.dataProgramada.split('-');
  return `${d}/${m}${hora}`;
}

function fmtTipo(tipo: string): string {
  const map: Record<string, string> = {
    entrega_cacamba: 'Entrega', retirada: 'Retirada', troca: 'Troca',
    locacao_maquina: 'Máquina', terraplanagem: 'Terraplanagem', demolicao: 'Demolição',
  };
  return map[tipo] ?? tipo;
}

const STATUS_META: Record<OSStatus, { label: string; bar: string; text: string; dot: string }> = {
  pendente:  { label: 'Pendente',    bar: 'bg-status-os-pending',   text: 'text-status-os-pending',   dot: 'bg-status-os-pending' },
  transito:  { label: 'Em trânsito', bar: 'bg-status-os-transit',   text: 'text-status-os-transit',   dot: 'bg-status-os-transit' },
  entregue:  { label: 'Entregue',    bar: 'bg-status-os-delivered', text: 'text-status-os-delivered', dot: 'bg-status-os-delivered' },
  coletada:  { label: 'Coletada',    bar: 'bg-status-os-collected', text: 'text-status-os-collected', dot: 'bg-status-os-collected' },
  cancelada: { label: 'Cancelada',   bar: 'bg-destructive',         text: 'text-destructive',         dot: 'bg-destructive' },
};

const URGENCY_TEXT: Record<Urgency, string> = {
  normal:   'text-muted-foreground',
  atrasada: 'text-status-os-pending',
  critica:  'text-status-os-critical',
};

const ACTION_LABEL: Record<string, string> = {
  pendente:   'Designar motorista',
  em_rota:    'Confirmar no local',
  no_local:   'Registrar coleta',
  executando: 'Registrar coleta',
  concluida:  'Concluída',
  cancelada:  'Cancelada',
};

// ── Componente principal ───────────────────────────────────────────────────────

export default function OrdensServicoPage() {
  const navigate = useNavigate();

  const [tab,          setTab]          = useState<'todas' | 'pendentes'>('todas');
  const [density,      setDensity]      = useState<'comfortable' | 'compact'>('comfortable');
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<OSStatus | 'todos'>('todos');
  const [drawer,       setDrawer]       = useState<any | null>(null);
  const [assigning,    setAssigning]    = useState<any | null>(null);
  const [novaOS,       setNovaOS]       = useState(false);
  const [optimistic,   setOptimistic]   = useState<Record<number, string>>({});

  const { data: rawOrders = [], isLoading } = useExecucoes();
  const atribuir   = useAtribuirExecucao();
  const advStatus  = useStatusExecucao();
  const createOS   = useCreateExecucao();

  const orders = useMemo(() =>
    (rawOrders as any[]).map(o => ({ ...o, status: optimistic[o.id] ?? o.status })),
    [rawOrders, optimistic],
  );

  const filtered = useMemo(() => {
    const osStatus = statusFilter !== 'todos' ? statusFilter : null;
    return orders.filter(o => {
      if (osStatus && mapStatus(o.status) !== osStatus) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return [o.id, o.pedidoNumero, o.clienteNome, o.enderecoEntrega,
        o.cacambaNumero, o.motoristaNome, o.veiculoPlaca]
        .filter(Boolean).some((v: string) => String(v).toLowerCase().includes(q));
    });
  }, [orders, search, statusFilter]);

  const grouped = useMemo(() => ({
    urgent: filtered.filter(o => calcUrgency(o) !== 'normal'),
    normal: filtered.filter(o => calcUrgency(o) === 'normal'),
  }), [filtered]);

  const counts = {
    total:    orders.length,
    pendente: orders.filter(o => mapStatus(o.status) === 'pendente').length,
    transito: orders.filter(o => mapStatus(o.status) === 'transito').length,
    entregue: orders.filter(o => mapStatus(o.status) === 'entregue').length,
    coletada: orders.filter(o => mapStatus(o.status) === 'coletada').length,
    criticas: orders.filter(o => calcUrgency(o) === 'critica').length,
  };

  const handleAdvance = (os: any) => {
    if (!os.motoristaId && os.status === 'pendente') { setAssigning(os); return; }
    const next = nextBackendStatus(os.status);
    if (!next) return;
    setOptimistic(p => ({ ...p, [os.id]: next }));
    advStatus.mutate({ id: os.id, status: next }, {
      onSuccess: () => {
        setOptimistic(p => { const n = { ...p }; delete n[os.id]; return n; });
        toast.success(`OS-${os.id} · ${ACTION_LABEL[next] ?? 'Atualizada'}`);
        if (drawer?.id === os.id) setDrawer((d: any) => d ? { ...d, status: next } : d);
      },
      onError: () => {
        setOptimistic(p => { const n = { ...p }; delete n[os.id]; return n; });
        toast.error('Não foi possível atualizar o status. Tente novamente.');
      },
    });
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Ordens de Serviço</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Acompanhe suas caçambas e coletas sem burocracia.</p>
          </div>
          <Button onClick={() => setNovaOS(true)} className="h-10 px-5 font-medium">
            <Plus className="h-4 w-4 mr-2" />Nova OS
          </Button>
        </div>

        {/* Strip de KPIs */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 rounded-lg bg-card shadow-soft border border-border/60">
          <KpiStat label="Total"       value={counts.total} />
          <Divider />
          <KpiStat label="Pendentes"   value={counts.pendente} dot="bg-status-os-pending" />
          <KpiStat label="Em trânsito" value={counts.transito} dot="bg-status-os-transit" />
          <KpiStat label="Entregues"   value={counts.entregue} dot="bg-status-os-delivered" />
          <KpiStat label="Coletadas"   value={counts.coletada} dot="bg-status-os-collected" />
          <Divider />
          <KpiStat label="Críticas" value={counts.criticas} dot="bg-status-os-critical" highlight={counts.criticas > 0} />
          <div className="flex-1" />
          <button onClick={() => setTab('pendentes')}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
            <Inbox className="h-4 w-4" />
            Pedidos pendentes de OS
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Busca + tabs + densidade */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por OS, cliente, endereço, caçamba, motorista, placa ou pedido..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-11 h-12 text-[15px] bg-card border-border/60 shadow-soft focus-visible:ring-primary/30"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)}>
              <TabsList className="bg-muted/60 h-9">
                <TabsTrigger value="todas"    className="data-[state=active]:bg-card data-[state=active]:shadow-soft">Todas as OS</TabsTrigger>
                <TabsTrigger value="pendentes" className="data-[state=active]:bg-card data-[state=active]:shadow-soft">Pedidos pendentes</TabsTrigger>
              </TabsList>
            </Tabs>

            {tab === 'todas' && (
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground hidden md:block" />
                {(['todos','pendente','transito','entregue','coletada'] as const).map(s => (
                  <FilterChip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}
                    dot={s !== 'todos' ? STATUS_META[s as OSStatus]?.dot : undefined}>
                    {s === 'todos' ? 'Todos' : s === 'transito' ? 'Trânsito' : STATUS_META[s as OSStatus]?.label}
                  </FilterChip>
                ))}
                <div className="h-6 w-px bg-border mx-1" />
                <Tabs value={density} onValueChange={v => setDensity(v as typeof density)}>
                  <TabsList className="h-9 bg-muted/60">
                    <TabsTrigger value="comfortable" className="data-[state=active]:bg-card px-2"><LayoutList className="h-4 w-4" /></TabsTrigger>
                    <TabsTrigger value="compact"     className="data-[state=active]:bg-card px-2"><Rows3 className="h-4 w-4" /></TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}
          </div>
        </div>

        {/* Conteúdo */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'pendentes' ? (
          <PedidosPendentesView />
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : density === 'compact' ? (
          <CompactTable rows={filtered} onOpen={setDrawer} onAdvance={handleAdvance} />
        ) : (
          <div className="space-y-6">
            {grouped.urgent.length > 0 && (
              <Section title="Requer atenção"
                hint={`${grouped.urgent.length} OS crítica${grouped.urgent.length > 1 ? 's' : ''}/atrasada${grouped.urgent.length > 1 ? 's' : ''}`}
                tone="critical">
                {grouped.urgent.map(o => (
                  <OSCard key={o.id} os={o} onOpen={() => setDrawer(o)} onAdvance={() => handleAdvance(o)} />
                ))}
              </Section>
            )}
            {grouped.normal.length > 0 && (
              <Section title="Em andamento" hint={`${grouped.normal.length} OS`}>
                {grouped.normal.map(o => (
                  <OSCard key={o.id} os={o} onOpen={() => setDrawer(o)} onAdvance={() => handleAdvance(o)} />
                ))}
              </Section>
            )}
          </div>
        )}
      </div>

      {/* Drawer de detalhe */}
      <Sheet open={!!drawer} onOpenChange={o => !o && setDrawer(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
          {drawer && <OSDrawer os={drawer} onAdvance={() => handleAdvance(drawer)} onNavigate={navigate} />}
        </SheetContent>
      </Sheet>

      {/* Modal Nova OS */}
      <NovaOSModal
        open={novaOS}
        onClose={() => setNovaOS(false)}
        onConfirm={(pedidoId, tipo, motoristaId, veiculoId) => {
          createOS.mutate({ pedidoId, tipo, motoristaId, veiculoId }, {
            onSuccess: () => { toast.success('OS criada com sucesso!'); setNovaOS(false); },
            onError: (e: any) => toast.error(e?.message ?? 'Falha ao criar OS.'),
          });
        }}
        isPending={createOS.isPending}
      />

      {/* Modal de atribuição */}
      <AssignModal
        os={assigning}
        onClose={() => setAssigning(null)}
        onConfirm={(motoristaId, veiculoId) => {
          atribuir.mutate({ id: assigning!.id, motoristaId, veiculoId }, {
            onSuccess: () => { toast.success(`Motorista designado para OS-${assigning!.id}`); setAssigning(null); },
            onError:   () => toast.error('Falha ao designar motorista.'),
          });
        }}
        isPending={atribuir.isPending}
      />
    </TooltipProvider>
  );
}

// ── OSCard ─────────────────────────────────────────────────────────────────────

function OSCard({ os, onOpen, onAdvance }: { os: any; onOpen: () => void; onAdvance: () => void }) {
  const s       = STATUS_META[mapStatus(os.status)];
  const urgency = calcUrgency(os);
  const done    = ['concluida', 'cancelada'].includes(os.status);
  const lbl     = os.status === 'pendente' && !os.motoristaId ? 'Designar motorista' : ACTION_LABEL[os.status] ?? '—';

  return (
    <div onClick={onOpen}
      className="group relative flex items-stretch bg-card rounded-lg shadow-soft hover:shadow-soft-md transition-all cursor-pointer overflow-hidden border border-border/40">
      <div className={cn('w-1 flex-shrink-0', s.bar)} />
      <div className="flex-1 flex flex-col md:flex-row md:items-center gap-3 md:gap-6 px-4 md:px-5 py-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[15px]">OS-{os.id}</span>
            <span className="text-[11px] text-muted-foreground">{fmtTipo(os.pedidoTipo ?? os.tipo)}</span>
            <span className="text-[11px] text-muted-foreground/60">·</span>
            <span className="text-[11px] text-muted-foreground">Ref: {os.pedidoNumero ?? '—'}</span>
          </div>
          <div className="text-[15px] font-medium mt-0.5 truncate">{os.clienteNome ?? '—'}</div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5 truncate">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{os.enderecoEntrega ?? os.obraNome ?? '—'}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-muted-foreground text-xs">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5"><Trash2 className="h-3.5 w-3.5" />{os.cacambaNumero ?? '—'}</div>
            </TooltipTrigger>
            <TooltipContent>Caçamba</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn('flex items-center gap-1.5', !os.motoristaNome && 'text-status-os-pending')}>
                <User className="h-3.5 w-3.5" />{os.motoristaNome ?? 'Sem motorista'}
              </div>
            </TooltipTrigger>
            <TooltipContent>{os.motoristaNome ? `${os.motoristaNome} · ${os.veiculoPlaca}` : 'Aguardando designação'}</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex flex-col items-start md:items-end gap-0.5 min-w-[110px]">
          <span className={cn('text-sm font-semibold flex items-center gap-1.5', s.text)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />{s.label}
          </span>
          <span className={cn('text-xs', URGENCY_TEXT[urgency])}>{prazoLabel(os)}</span>
        </div>

        <Button size="sm" onClick={e => { e.stopPropagation(); onAdvance(); }} disabled={done}
          className={cn('h-9 font-medium min-w-[170px]',
            done ? 'bg-muted text-muted-foreground hover:bg-muted' : 'bg-foreground text-background hover:bg-foreground/85'
          )}>
          {done && <CheckCircle2 className="h-4 w-4 mr-1.5" />}
          {lbl}
        </Button>
      </div>
    </div>
  );
}

// ── CompactTable ───────────────────────────────────────────────────────────────

function CompactTable({ rows, onOpen, onAdvance }: { rows: any[]; onOpen: (o: any) => void; onAdvance: (o: any) => void }) {
  return (
    <div className="bg-card rounded-lg shadow-soft border border-border/40 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
              <th className="text-left font-semibold py-2.5 px-3 w-2" />
              <th className="text-left font-semibold py-2.5 px-3">OS</th>
              <th className="text-left font-semibold py-2.5 px-3">Cliente / Endereço</th>
              <th className="text-left font-semibold py-2.5 px-3 hidden md:table-cell">Caçamba</th>
              <th className="text-left font-semibold py-2.5 px-3 hidden md:table-cell">Motorista</th>
              <th className="text-left font-semibold py-2.5 px-3">Status</th>
              <th className="text-left font-semibold py-2.5 px-3 hidden md:table-cell">Prazo</th>
              <th className="text-right font-semibold py-2.5 px-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((o, i) => {
              const s       = STATUS_META[mapStatus(o.status)];
              const urgency = calcUrgency(o);
              const done    = ['concluida', 'cancelada'].includes(o.status);
              const lbl     = o.status === 'pendente' && !o.motoristaId ? 'Designar' : (ACTION_LABEL[o.status]?.split(' ')[0] ?? '—');
              return (
                <tr key={o.id} onClick={() => onOpen(o)}
                  className={cn('border-b border-border/40 last:border-0 cursor-pointer hover:bg-muted/40 transition-colors', i % 2 === 1 && 'bg-muted/20')}>
                  <td className="py-2.5 px-3"><span className={cn('block h-5 w-1 rounded-full', s.bar)} /></td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="font-semibold">OS-{o.id}</div>
                    <div className="text-[11px] text-muted-foreground">{fmtTipo(o.pedidoTipo ?? o.tipo)}</div>
                  </td>
                  <td className="py-2.5 px-3 max-w-xs">
                    <div className="font-medium truncate">{o.clienteNome ?? '—'}</div>
                    <div className="text-xs text-muted-foreground truncate">{o.enderecoEntrega ?? o.obraNome ?? '—'}</div>
                  </td>
                  <td className="py-2.5 px-3 hidden md:table-cell text-xs text-muted-foreground">{o.cacambaNumero ?? '—'}</td>
                  <td className="py-2.5 px-3 hidden md:table-cell text-xs">
                    {o.motoristaNome ?? <span className="text-status-os-pending">—</span>}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={cn('font-medium flex items-center gap-1.5 text-xs', s.text)}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />{s.label}
                    </span>
                  </td>
                  <td className={cn('py-2.5 px-3 hidden md:table-cell text-xs', URGENCY_TEXT[urgency])}>{prazoLabel(o)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <Button size="sm" variant="ghost" disabled={done}
                      onClick={e => { e.stopPropagation(); onAdvance(o); }}
                      className="h-7 px-2.5 text-xs font-medium text-primary hover:bg-primary/10">
                      {lbl}<ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── AssignModal ────────────────────────────────────────────────────────────────

function AssignModal({ os, onClose, onConfirm, isPending }: {
  os: any | null; onClose: () => void;
  onConfirm: (motoristaId: number, veiculoId: number) => void;
  isPending: boolean;
}) {
  const [motoristaId, setMotoristaId] = useState('');
  const [veiculoId,   setVeiculoId]   = useState('');
  const { data: rawMotoristas } = useMotoristasAll() as any;
  const { data: rawVeiculos   } = useVeiculosAll()   as any;
  const mList = Array.isArray(rawMotoristas?.data) ? rawMotoristas.data : (rawMotoristas ?? []);
  const vList = Array.isArray(rawVeiculos?.data)   ? rawVeiculos.data   : (rawVeiculos   ?? []);

  return (
    <Dialog open={!!os} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Designar motorista — OS-{os?.id}</DialogTitle>
          <DialogDescription>Selecione o motorista e o veículo disponíveis para esta OS.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Motorista</Label>
            <Select value={motoristaId} onValueChange={setMotoristaId}>
              <SelectTrigger><SelectValue placeholder="Selecionar motorista" /></SelectTrigger>
              <SelectContent>
                {(mList as any[]).filter((m: any) => m.status === 'ativo').map((m: any) => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Caminhão</Label>
            <Select value={veiculoId} onValueChange={setVeiculoId}>
              <SelectTrigger><SelectValue placeholder="Selecionar veículo" /></SelectTrigger>
              <SelectContent>
                {(vList as any[]).filter((v: any) => v.status === 'disponivel').map((v: any) => (
                  <SelectItem key={v.id} value={String(v.id)}>{v.placa} — {v.modelo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!motoristaId || !veiculoId || isPending}
            onClick={() => onConfirm(Number(motoristaId), Number(veiculoId))}>
            {isPending
              ? <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvando...</span>
              : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── OSDrawer ───────────────────────────────────────────────────────────────────

function OSDrawer({ os, onAdvance, onNavigate }: { os: any; onAdvance: () => void; onNavigate: (path: string) => void }) {
  const s       = STATUS_META[mapStatus(os.status)];
  const urgency = calcUrgency(os);
  const done    = ['concluida', 'cancelada'].includes(os.status);
  const lbl     = os.status === 'pendente' && !os.motoristaId ? 'Designar motorista' : ACTION_LABEL[os.status] ?? '—';

  const mapsUrl  = os.enderecoEntrega
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(os.enderecoEntrega)}`
    : null;
  const phoneHref = os.clienteTelefone ? `tel:${String(os.clienteTelefone).replace(/\D/g, '')}` : null;
  const waHref    = os.clienteTelefone
    ? `https://api.whatsapp.com/send?phone=55${String(os.clienteTelefone).replace(/\D/g, '')}`
    : null;

  const logEntries = [
    os.dataFim    && { at: os.dataFim,    msg: os.status === 'concluida' ? 'Execução concluída' : 'Cancelada' },
    os.dataInicio && { at: os.dataInicio, msg: 'Saída para o local' },
    os.createdAt  && { at: os.createdAt,  msg: 'OS criada', muted: true },
  ].filter(Boolean) as { at: string; msg: string; muted?: boolean }[];

  return (
    <div className="flex flex-col h-full">
      <div className={cn('h-1 w-full flex-shrink-0', s.bar)} />

      <div className="px-6 pt-6 pb-4 border-b border-border/60">
        <div className="text-xs text-muted-foreground mb-1.5">
          {fmtTipo(os.pedidoTipo ?? os.tipo)} · <span className="text-primary">Ref: {os.pedidoNumero ?? '—'}</span>
        </div>
        <h2 className="text-2xl font-semibold">OS-{os.id}</h2>
        <div className="font-medium mt-1">{os.clienteNome ?? '—'}</div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          {os.enderecoEntrega ?? os.obraNome ?? '—'}
        </div>
        <div className="flex items-center gap-3 mt-4">
          <span className={cn('text-sm font-semibold flex items-center gap-1.5', s.text)}>
            <span className={cn('h-2 w-2 rounded-full', s.dot)} />{s.label}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className={cn('text-sm', URGENCY_TEXT[urgency])}>{prazoLabel(os)}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <Detail label="Caçamba"   value={os.cacambaNumero ?? '—'} />
          <Detail label="Motorista" value={os.motoristaNome ?? 'Não designado'} muted={!os.motoristaNome} />
          <Detail label="Veículo"   value={os.veiculoPlaca  ?? '—'}             muted={!os.veiculoPlaca} />
          <Detail label="Prazo"     value={prazoLabel(os)} urgency={urgency} />
          <Detail label="Início"    value={os.dataInicio ? new Date(os.dataInicio).toLocaleString('pt-BR') : '—'} />
          <Detail label="Conclusão" value={os.dataFim    ? new Date(os.dataFim).toLocaleString('pt-BR')    : '—'} />
        </div>

        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/50 hover:bg-primary/10 transition-colors text-sm">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="flex-1">Ver localização no Google Maps</span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </a>
        )}

        {os.observacao && (
          <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{os.observacao}</div>
        )}

        {os.evidenciaUrl && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Camera className="h-3.5 w-3.5" />Evidência
            </h3>
            <a href={os.evidenciaUrl} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-border/60">
              <img src={os.evidenciaUrl} alt="Evidência" className="w-full object-cover max-h-48" />
            </a>
          </div>
        )}

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <History className="h-3.5 w-3.5" />Histórico
          </h3>
          <ol className="relative border-l-2 border-border/60 ml-1.5 space-y-3">
            {logEntries.map((l, i) => (
              <li key={i} className="ml-4">
                <span className="absolute -left-[7px] h-3 w-3 rounded-full bg-card border-2 border-primary" />
                <div className="text-[11px] text-muted-foreground tabular-nums">
                  {new Date(l.at).toLocaleString('pt-BR')}
                </div>
                <p className={cn('text-sm', l.muted && 'text-muted-foreground')}>{l.msg}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="border-t border-border/60 p-4 flex items-center gap-2 bg-card">
        {phoneHref && (
          <a href={phoneHref}>
            <Button variant="outline" size="icon" className="h-10 w-10"><Phone className="h-4 w-4" /></Button>
          </a>
        )}
        {waHref && (
          <a href={waHref} target="_blank" rel="noreferrer">
            <Button variant="outline" size="icon" className="h-10 w-10"><MessageSquare className="h-4 w-4" /></Button>
          </a>
        )}
        <Button variant="outline" className="h-10 flex-1"
          onClick={() => os.pedidoId && onNavigate(`/pedidos/${os.pedidoId}`)}>
          Ver pedido
        </Button>
        <Button onClick={onAdvance} disabled={done} className="h-10 flex-1 bg-foreground text-background hover:bg-foreground/85">
          {lbl}
        </Button>
      </div>
    </div>
  );
}

// ── NovaOSModal ────────────────────────────────────────────────────────────────

function NovaOSModal({ open, onClose, onConfirm, isPending }: {
  open: boolean; onClose: () => void; isPending: boolean;
  onConfirm: (pedidoId: number, tipo: string, motoristaId?: number, veiculoId?: number) => void;
}) {
  const TIPO_OPTIONS = [
    { value: 'entrega_cacamba', label: 'Entrega de caçamba' },
    { value: 'retirada',        label: 'Retirada de caçamba' },
    { value: 'troca',           label: 'Troca de caçamba' },
    { value: 'locacao_maquina', label: 'Locação de máquina' },
    { value: 'terraplanagem',   label: 'Terraplanagem' },
    { value: 'demolicao',       label: 'Demolição' },
  ];

  const [pedidoSearch,   setPedidoSearch]   = useState('');
  const [selectedPedido, setSelectedPedido] = useState<any | null>(null);
  const [tipo,           setTipo]           = useState('');
  const [motoristaId,    setMotoristaId]    = useState('');
  const [veiculoId,      setVeiculoId]      = useState('');

  const { data: rawPedidos } = usePedidos({ search: pedidoSearch || undefined, limit: 20 }) as any;
  const { data: rawMotoristas } = useMotoristasAll() as any;
  const { data: rawVeiculos   } = useVeiculosAll()   as any;

  const pedidos  = Array.isArray(rawPedidos?.data)    ? rawPedidos.data    : (rawPedidos  ?? []);
  const mList    = Array.isArray(rawMotoristas?.data) ? rawMotoristas.data : (rawMotoristas ?? []);
  const vList    = Array.isArray(rawVeiculos?.data)   ? rawVeiculos.data   : (rawVeiculos   ?? []);

  const reset = () => {
    setPedidoSearch(''); setSelectedPedido(null);
    setTipo(''); setMotoristaId(''); setVeiculoId('');
  };

  const handleClose = () => { reset(); onClose(); };

  const canConfirm = selectedPedido && tipo && !isPending;

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Ordem de Serviço</DialogTitle>
          <DialogDescription>Vincule um pedido aprovado e defina o tipo de serviço.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Busca de pedido */}
          <div className="space-y-1.5">
            <Label className="text-xs">Pedido</Label>
            {selectedPedido ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-border bg-muted/30 text-sm">
                <div className="min-w-0">
                  <span className="font-semibold">{selectedPedido.numero ?? `PED-${selectedPedido.id}`}</span>
                  <span className="text-muted-foreground ml-2">{selectedPedido.clienteNome ?? selectedPedido.cliente?.nome ?? '—'}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setSelectedPedido(null);
                      setPedidoSearch('');
                    }}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Limpar pedido selecionado"
                    type="button"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Buscar por número ou cliente..."
                  value={pedidoSearch}
                  onChange={e => setPedidoSearch(e.target.value)}
                  className="h-9"
                />
                {pedidos.length > 0 && (
                  <div className="border border-border rounded-md overflow-hidden max-h-40 overflow-y-auto">
                    {(pedidos as any[]).map((p: any) => (
                      <button key={p.id} onClick={() => { setSelectedPedido(p); setTipo(p.tipo ?? ''); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 border-b border-border/40 last:border-0">
                        <span className="font-medium">{p.numero ?? `PED-${p.id}`}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{p.clienteNome ?? '—'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tipo de serviço */}
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo de serviço</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar tipo" /></SelectTrigger>
              <SelectContent>
                {TIPO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Motorista opcional */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Motorista <span className="text-muted-foreground">(opcional)</span></Label>
              <Select value={motoristaId} onValueChange={setMotoristaId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {(mList as any[]).filter((m: any) => m.status === 'ativo').map((m: any) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Veículo <span className="text-muted-foreground">(opcional)</span></Label>
              <Select value={veiculoId} onValueChange={setVeiculoId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {(vList as any[]).filter((v: any) => v.status === 'disponivel').map((v: any) => (
                    <SelectItem key={v.id} value={String(v.id)}>{v.placa}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button disabled={!canConfirm}
            onClick={() => onConfirm(
              selectedPedido.id,
              tipo,
              motoristaId ? Number(motoristaId) : undefined,
              veiculoId   ? Number(veiculoId)   : undefined,
            )}>
            {isPending
              ? <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Criando...</span>
              : 'Criar OS'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PedidosPendentesView() {
  const navigate = useNavigate();
  const { data, isLoading } = usePedidos({ status: 'pendente_programacao', limit: 50 }) as any;
  const list: any[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

  if (isLoading) return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (list.length === 0) return (
    <div className="text-center py-16 bg-card rounded-lg shadow-soft border border-border/40">
      <CheckCircle2 className="h-10 w-10 mx-auto text-status-os-delivered mb-3" />
      <h3 className="font-semibold">Tudo em ordem</h3>
      <p className="text-sm text-muted-foreground mt-1">Todos os pedidos aprovados já possuem OS geradas.</p>
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-primary/5 border border-primary/10 text-sm">
        <Inbox className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <span>
          <span className="font-medium">{list.length} pedidos</span> aguardando programação de OS.
        </span>
      </div>
      {list.map((p: any) => (
        <div key={p.id} className="flex flex-col md:flex-row md:items-center gap-4 bg-card rounded-lg shadow-soft border border-border/40 p-4 hover:shadow-soft-md transition-shadow">
          <div className="flex-1 min-w-0">
            <div className="font-semibold">{p.numero ?? `PED-${p.id}`}</div>
            <div className="font-medium mt-0.5 text-sm">{p.clienteNome ?? '—'}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3.5 w-3.5" />{p.enderecoEntrega ?? '—'}
            </div>
          </div>
          <Button variant="outline" className="h-9 shrink-0"
            onClick={() => navigate(`/pedidos/${p.id}`)}>
            Ver pedido <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}

// ── Componentes auxiliares ─────────────────────────────────────────────────────

function Section({ title, hint, tone, children }: { title: string; hint: string; tone?: 'critical'; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-3 px-1">
        <h2 className={cn('text-sm font-semibold tracking-wide uppercase',
          tone === 'critical' ? 'text-status-os-critical' : 'text-muted-foreground')}>{title}</h2>
        <span className="text-xs text-muted-foreground/70">{hint}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function KpiStat({ label, value, dot, highlight }: { label: string; value: number; dot?: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {dot && <span className={cn('h-2 w-2 rounded-full', dot)} />}
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-semibold tabular-nums', highlight && 'text-status-os-critical')}>{value}</span>
    </div>
  );
}

function Divider() { return <span className="h-4 w-px bg-border" />; }

function FilterChip({ active, onClick, dot, children }: { active: boolean; onClick: () => void; dot?: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={cn('h-9 px-3 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors',
        active ? 'bg-primary text-primary-foreground shadow-soft' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-primary-foreground' : dot)} />}
      {children}
    </button>
  );
}

function Detail({ label, value, muted, urgency }: { label: string; value: string; muted?: boolean; urgency?: Urgency }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</div>
      <div className={cn('font-medium text-sm', muted && 'text-muted-foreground italic', urgency && URGENCY_TEXT[urgency])}>{value}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 bg-card rounded-lg shadow-soft border border-border/40">
      <div className="relative inline-flex">
        <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full" />
        <div className="relative h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Truck className="h-8 w-8 text-primary" strokeWidth={1.5} />
        </div>
      </div>
      <h3 className="text-lg font-semibold mt-5">Nenhuma OS encontrada</h3>
      <p className="text-sm text-muted-foreground mt-1.5">Ajuste os filtros ou aguarde novas ordens de serviço.</p>
    </div>
  );
}
