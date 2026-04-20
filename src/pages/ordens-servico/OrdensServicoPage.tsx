import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Search, Loader2, ChevronLeft, ChevronRight,
  ClipboardList, User, Truck, MapPin, Calendar, Clock, FileText,
} from 'lucide-react';
import { useOrdensServico } from '@/hooks/useQuery';
import { STATUS_EXECUCAO_LABELS } from '@/types/enums';

const LIMIT = 20;

function fmtData(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

function fmtHora(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtTipo(tipo?: string | null) {
  if (!tipo) return '—';
  return tipo.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function duracao(inicio?: string | null, fim?: string | null) {
  if (!inicio || !fim) return null;
  const diff = new Date(fim).getTime() - new Date(inicio).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

// ─── Drawer de detalhe ────────────────────────────────────────────────────────

function DetalheOS({ os, open, onClose }: { os: any; open: boolean; onClose: () => void }) {
  if (!os) return null;
  const dur = duracao(os.dataInicio, os.dataFim);

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            OS #{os.id}
            {os.pedidoNumero && (
              <span className="text-sm font-normal text-muted-foreground">· Pedido {os.pedidoNumero}</span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <StatusBadge status={os.status} labels={STATUS_EXECUCAO_LABELS} />
          </div>

          {/* Tipo */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Tipo de serviço</span>
            <span className="text-sm font-medium">{fmtTipo(os.pedidoTipo ?? os.tipo)}</span>
          </div>

          <hr />

          {/* Cliente */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cliente</p>
            <p className="text-sm font-medium">{os.clienteNome ?? '—'}</p>
            {os.clienteTelefone && (
              <p className="text-xs text-muted-foreground">{os.clienteTelefone}</p>
            )}
          </div>

          {/* Endereço */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Endereço de entrega
            </p>
            <p className="text-sm">{os.enderecoEntrega ?? '—'}</p>
            {os.obraNome && (
              <p className="text-xs text-muted-foreground">Obra: {os.obraNome}</p>
            )}
          </div>

          {/* Caçamba */}
          {os.cacambaNumero && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Caçamba</span>
              <span className="text-sm font-medium">#{os.cacambaNumero}</span>
            </div>
          )}

          <hr />

          {/* Programação */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Programação
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Data programada</p>
                <p className="font-medium">{fmtData(os.dataProgramada)}</p>
              </div>
              {os.horaProgramada && (
                <div>
                  <p className="text-xs text-muted-foreground">Hora programada</p>
                  <p className="font-medium">{os.horaProgramada.slice(0, 5)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Execução */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Clock className="w-3 h-3" /> Execução
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Início</p>
                <p className="font-medium">
                  {os.dataInicio ? `${fmtData(os.dataInicio)} ${fmtHora(os.dataInicio)}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fim</p>
                <p className="font-medium">
                  {os.dataFim ? `${fmtData(os.dataFim)} ${fmtHora(os.dataFim)}` : '—'}
                </p>
              </div>
            </div>
            {dur && <p className="text-xs text-muted-foreground">Duração: {dur}</p>}
          </div>

          <hr />

          {/* Equipe */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Equipe</p>
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              {os.motoristaNome
                ? <span>{os.motoristaNome}</span>
                : <span className="text-muted-foreground italic">Sem motorista atribuído</span>}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Truck className="w-4 h-4 text-muted-foreground shrink-0" />
              {os.veiculoPlaca
                ? <span className="font-mono">{os.veiculoPlaca}</span>
                : <span className="text-muted-foreground italic">Sem veículo atribuído</span>}
            </div>
          </div>

          {/* Observação */}
          {os.observacao && (
            <>
              <hr />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Observação
                </p>
                <p className="text-sm whitespace-pre-wrap">{os.observacao}</p>
              </div>
            </>
          )}

          {/* Evidência */}
          {os.evidenciaUrl && (
            <>
              <hr />
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Evidência</p>
                <img
                  src={os.evidenciaUrl}
                  alt="Evidência de conclusão"
                  className="rounded-md border w-full object-cover max-h-60"
                />
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function OrdensServicoPage() {
  const [status, setStatus] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<{ status?: string; dataInicio?: string; dataFim?: string }>({});
  const [page, setPage] = useState(1);
  const [osSelecionada, setOsSelecionada] = useState<any>(null);

  const { data: result, isLoading } = useOrdensServico({ ...filtroAtivo, page });

  const ordens: any[] = (result as any)?.data ?? [];
  const total: number = (result as any)?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setFiltroAtivo({
      status: status || undefined,
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
    });
  };

  const handleLimpar = () => {
    setStatus('');
    setDataInicio('');
    setDataFim('');
    setPage(1);
    setFiltroAtivo({});
  };

  const temFiltro = !!(filtroAtivo.status || filtroAtivo.dataInicio || filtroAtivo.dataFim);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Ordens de Serviço"
        subtitle="Histórico e acompanhamento de execuções"
      />

      {/* Filtros */}
      <form onSubmit={handleBuscar} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Status</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="h-9 px-3 rounded-md border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todos</option>
            {Object.entries(STATUS_EXECUCAO_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Data início</label>
          <input
            type="date"
            value={dataInicio}
            onChange={e => setDataInicio(e.target.value)}
            className="h-9 px-3 rounded-md border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Data fim</label>
          <input
            type="date"
            value={dataFim}
            onChange={e => setDataFim(e.target.value)}
            className="h-9 px-3 rounded-md border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <Button type="submit" variant="outline" size="sm" className="mb-0.5">
          <Search className="w-4 h-4 mr-1" /> Buscar
        </Button>
        {temFiltro && (
          <Button type="button" variant="ghost" size="sm" className="mb-0.5" onClick={handleLimpar}>
            Limpar
          </Button>
        )}
      </form>

      {/* Tabela */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : ordens.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {temFiltro
              ? 'Nenhuma OS encontrada para os filtros aplicados.'
              : 'Nenhuma ordem de serviço registrada.'}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th># OS</th>
                <th>Pedido</th>
                <th>Data prog.</th>
                <th>Cliente</th>
                <th>Endereço</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Motorista</th>
                <th>Veículo</th>
              </tr>
            </thead>
            <tbody>
              {ordens.map((os: any) => (
                <tr key={os.id} className="cursor-pointer" onClick={() => setOsSelecionada(os)}>
                  <td className="font-mono text-xs font-medium">{os.id}</td>
                  <td className="font-mono text-xs">{os.pedidoNumero ?? '—'}</td>
                  <td>{fmtData(os.dataProgramada)}</td>
                  <td className="font-medium">{os.clienteNome ?? '—'}</td>
                  <td className="text-xs max-w-[200px] truncate">{os.enderecoEntrega ?? '—'}</td>
                  <td className="text-xs">{fmtTipo(os.pedidoTipo ?? os.tipo)}</td>
                  <td><StatusBadge status={os.status} labels={STATUS_EXECUCAO_LABELS} /></td>
                  <td className="text-sm">{os.motoristaNome ?? <span className="text-muted-foreground text-xs">—</span>}</td>
                  <td className="font-mono text-xs">{os.veiculoPlaca ?? <span className="text-muted-foreground">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} ordens · página {page} de {totalPages}</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Drawer de detalhe */}
      <DetalheOS
        os={osSelecionada}
        open={!!osSelecionada}
        onClose={() => setOsSelecionada(null)}
      />
    </div>
  );
}
