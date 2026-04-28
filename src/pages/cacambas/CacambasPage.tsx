import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, Plus, MapPin, Box, Truck, AlertTriangle, Warehouse, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useUnidades, useTipos, type Unidade } from '@/hooks/useUnidades';
import { STATUS_META, statusEfetivo, diasParado, type CacambaStatus } from '@/lib/status';
import { StatusBadge } from '@/components/StatusBadge';
import { FleetMap } from '@/components/FleetMap';
import { TimelineSheet } from '@/components/TimelineSheet';
import { CacambaFormDialog } from '@/components/CacambaFormDialog';
import { useDeleteCacamba } from '@/hooks/useQuery';
import { toast } from 'sonner';

const fmtBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

export default function CacambasPage() {
  const { unidades, loading } = useUnidades();
  const tipos = useTipos();

  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<CacambaStatus | 'todos'>('todos');
  const [bairroFilter, setBairroFilter] = useState('todos');
  const [selected,     setSelected]     = useState<Unidade | null>(null);

  // CRUD states
  const [dialogOpen,   setDialogOpen]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const deleteMutation = useDeleteCacamba();

  // ── Debounce da busca (300ms) ─────────────────────────────────────────────
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const normBusca = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  // ── IDs com match — compartilhados entre tabela e mapa ───────────────────
  const highlightedIds = useMemo(() => {
    if (!debouncedSearch) return new Set<number>();
    const q = normBusca(debouncedSearch);
    const str = (v: unknown) => normBusca(String(v ?? ''));
    return new Set(
      unidades
        .filter(u =>
          str(u.codigo_patrimonio).includes(q) ||
          str((u as { cliente_atual?: string }).cliente_atual).includes(q) ||
          str(u.cliente?.nome).includes(q) ||
          str(u.endereco_atual).includes(q) ||
          str(u.tipo?.descricao).includes(q) ||
          str((u.obra as { bairro?: string } | null)?.bairro).includes(q) ||
          (Number.isFinite(Number(debouncedSearch)) && u.id === Number(debouncedSearch)),
        )
        .map(u => u.id),
    );
  }, [debouncedSearch, unidades]);

  // ── Toast informativo quando a busca filtra por cliente ──────────────────
  useEffect(() => {
    if (!debouncedSearch || highlightedIds.size === 0) return;
    const matched = unidades.filter(u => highlightedIds.has(u.id));
    const clients = [...new Set(matched.map(u => u.cliente?.nome).filter(Boolean))];
    if (clients.length === 1 && clients[0]) {
      const name = clients[0];
      if (name.toLowerCase().includes(debouncedSearch.toLowerCase())) {
        toast.info(
          `${highlightedIds.size} caçamba${highlightedIds.size !== 1 ? 's' : ''} vinculada${highlightedIds.size !== 1 ? 's' : ''} ao cliente ${name}`,
          { id: 'fleet-search-client', duration: 3500 },
        );
        return;
      }
    }
    toast.info(
      `${highlightedIds.size} caçamba${highlightedIds.size !== 1 ? 's' : ''} encontrada${highlightedIds.size !== 1 ? 's' : ''}`,
      { id: 'fleet-search-count', duration: 2000 },
    );
  }, [debouncedSearch, highlightedIds.size]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { document.title = 'Caçambas — LAPA Locações'; }, []);

  const bairros = useMemo(
    () => Array.from(new Set(
      unidades.map(u => (u.obra as any)?.bairro).filter(Boolean) as string[],
    )).sort(),
    [unidades],
  );

  const filteredUnits = useMemo(() => {
    return unidades.filter(u => {
      const eff = statusEfetivo(u.status, u.ultima_atualizacao);
      if (statusFilter !== 'todos' && eff !== statusFilter) return false;
      if (bairroFilter !== 'todos' && (u.obra as any)?.bairro !== bairroFilter) return false;
      // Usa debouncedSearch para sincronizar com o mapa
      if (debouncedSearch) return highlightedIds.has(u.id);
      return true;
    });
  }, [unidades, statusFilter, bairroFilter, debouncedSearch, highlightedIds]);

  const kpis = useMemo(() => {
    const total      = unidades.length;
    const emCampo    = unidades.filter(u =>
      ['em_rota', 'no_cliente', 'atrasada'].includes(statusEfetivo(u.status, u.ultima_atualizacao)),
    ).length;
    const disponiveis = unidades.filter(u => u.status === 'disponivel').length;
    const retirar    = unidades.filter(u =>
      statusEfetivo(u.status, u.ultima_atualizacao) === 'atrasada',
    ).length;
    return { total, emCampo, disponiveis, retirar };
  }, [unidades]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Caçambas</h1>
          <p className="text-sm text-muted-foreground">
            Tipos de caçamba e controle patrimonial em tempo real.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Box}           label="Total de Caçambas"   value={kpis.total}       hint="frota completa"        tone="text-foreground" />
        <KpiCard icon={Truck}         label="Em campo"            value={kpis.emCampo}     hint="em rota ou no cliente" tone="text-primary" />
        <KpiCard icon={Warehouse}     label="Disponíveis no pátio" value={kpis.disponiveis} hint="prontas para entrega"  tone="text-success" />
        <KpiCard icon={AlertTriangle} label="Precisam retirada"   value={kpis.retirar}     hint=">15 dias no cliente"   tone="text-destructive" />
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className={`pl-9 ${search ? 'pr-9' : ''} transition-all`}
            placeholder="Buscar por patrimônio, tipo, cliente ou endereço..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
              title="Limpar busca"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" className="h-3 w-3 text-muted-foreground fill-current">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {(Object.keys(STATUS_META) as CacambaStatus[]).map(s => (
              <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {bairros.length > 0 && (
          <Select value={bairroFilter} onValueChange={setBairroFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Todos os bairros" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os bairros</SelectItem>
              {bairros.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Mapa da frota */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold">Mapa da frota</h2>
          <div className="flex flex-wrap gap-3 text-xs">
            {(Object.keys(STATUS_META) as CacambaStatus[]).map(s => (
              <span key={s} className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_META[s].pinColor }} />
                {STATUS_META[s].label}
              </span>
            ))}
          </div>
        </div>
        <div className="p-4">
          <FleetMap
            unidades={unidades}
            height={360}
            onSelect={setSelected}
            highlightedIds={debouncedSearch ? highlightedIds : undefined}
          />
        </div>
      </Card>

      {/* Tipos de caçamba — preços */}
      <Card>
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Tipos de Caçamba — Preços</h2>
          <Button
            size="sm" variant="outline"
            onClick={() => { setEditTarget(null); setDialogOpen(true); }}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />Novo Caçamba
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Descrição</th>
                <th className="text-left px-4 py-3 font-medium">Capacidade</th>
                <th className="text-right px-4 py-3 font-medium">Dia</th>
                <th className="text-right px-4 py-3 font-medium">Semana</th>
                <th className="text-right px-4 py-3 font-medium">Quinzena</th>
                <th className="text-right px-4 py-3 font-medium">Mês</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {tipos.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum tipo cadastrado.
                  </td>
                </tr>
              )}
              {tipos.map(t => (
                <tr key={t.id} className="group hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{t.descricao}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {t.capacidade_m3 > 0 ? `${t.capacidade_m3} m³` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtBRL(t.preco_dia)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtBRL(t.preco_semana)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtBRL(t.preco_quinzena)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtBRL(t.preco_mes)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditTarget({
                            id:            t.id,
                            descricao:     t.descricao,
                            capacidade:    t.capacidade_m3 > 0 ? String(t.capacidade_m3) : '',
                            precoDia:      t.preco_dia,
                            precoSemana:   t.preco_semana,
                            precoQuinzena: t.preco_quinzena,
                            precoMes:      t.preco_mes,
                          });
                          setDialogOpen(true);
                        }}
                        title="Editar"
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(t)}
                        title="Excluir"
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Patrimônio / Unidades */}
      <Card>
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Patrimônio / Unidades</h2>
          <span className="text-xs text-muted-foreground">
            {filteredUnits.length} / {unidades.length} unidades
          </span>
        </div>

        {/* Tabela — desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Patrimônio</th>
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Cliente atual</th>
                <th className="text-left px-4 py-3 font-medium">Localização atual</th>
                <th className="text-left px-4 py-3 font-medium">Dias parado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">Carregando…</td>
                </tr>
              )}
              {!loading && filteredUnits.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma unidade encontrada.</td>
                </tr>
              )}
              {!loading && filteredUnits.map(u => {
                const eff     = statusEfetivo(u.status, u.ultima_atualizacao);
                const dias    = ['no_cliente', 'atrasada'].includes(eff) ? diasParado(u.ultima_atualizacao) : 0;
                const showLoc = ['em_rota', 'no_cliente', 'atrasada'].includes(eff);
                return (
                  <tr
                    key={u.id}
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => setSelected(u)}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{u.codigo_patrimonio}</td>
                    <td className="px-4 py-3">{u.tipo?.descricao ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={eff} /></td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.cliente?.nome ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {showLoc && u.endereco_atual ? (
                        <div className="flex items-start gap-1.5 max-w-xs">
                          <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                          <div>
                            <div className="text-xs leading-tight">{u.endereco_atual}</div>
                            {u.lat && u.lng && (
                              <a
                                className="text-xs text-primary hover:underline"
                                href={`https://www.google.com/maps?q=${u.lat},${u.lng}`}
                                target="_blank" rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                              >
                                Abrir no mapa →
                              </a>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {dias > 0 ? (
                        <span className={dias > 15 ? 'text-destructive font-semibold' : 'text-muted-foreground'}>
                          {dias}d
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Cards — mobile */}
        <div className="md:hidden divide-y">
          {filteredUnits.map(u => {
            const eff = statusEfetivo(u.status, u.ultima_atualizacao);
            return (
              <button
                key={u.id}
                onClick={() => setSelected(u)}
                className="w-full text-left p-4 hover:bg-muted/30"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-semibold">{u.codigo_patrimonio}</span>
                  <StatusBadge status={eff} />
                </div>
                <div className="text-sm">{u.tipo?.descricao ?? '—'}</div>
                {u.endereco_atual && (
                  <div className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                    <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                    {u.endereco_atual}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Painel lateral de timeline */}
      <TimelineSheet unidade={selected} onClose={() => setSelected(null)} />

      {/* Modal criar / editar tipo de caçamba */}
      <CacambaFormDialog
        open={dialogOpen}
        cacamba={editTarget}
        onClose={() => { setDialogOpen(false); setEditTarget(null); }}
      />

      {/* Confirmação de exclusão */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={o => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar tipo de caçamba?</AlertDialogTitle>
            <AlertDialogDescription>
              O tipo <strong>{deleteTarget?.descricao}</strong> será marcado como
              inativo e não aparecerá em novos pedidos. Unidades físicas existentes
              não são afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (!deleteTarget) return;
                deleteMutation.mutate(deleteTarget.id, {
                  onSuccess: () => {
                    toast.success(`${deleteTarget.descricao} desativado.`);
                    setDeleteTarget(null);
                  },
                  onError: (e: any) => toast.error(e?.message ?? 'Erro ao desativar.'),
                });
              }}
            >
              {deleteMutation.isPending
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Desativando…</>
                : 'Sim, desativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, hint, tone,
}: { icon: React.ElementType; label: string; value: number; hint: string; tone: string }) {
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between">
        <div>
          <div className="kpi-card-label">{label}</div>
          <div className={`kpi-card-value ${tone}`}>{value}</div>
          <div className="kpi-card-sub">{hint}</div>
        </div>
        <div className="h-9 w-9 rounded-lg bg-muted grid place-items-center shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
