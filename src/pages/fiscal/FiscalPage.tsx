import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusFiscalBadge } from '@/components/shared/StatusFiscalBadge';
import { EmitirNotaFiscalDrawer } from '@/components/pedidos/EmitirNotaFiscalDrawer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import {
  Search, Filter, Download, Eye, FileText, Loader2, XCircle,
  MoreHorizontal, Building2, CheckCircle2, Clock, AlertTriangle,
  RefreshCw, Wifi, WifiOff, Shield, Send, Trash2, Mail,
  ChevronRight, Settings, Lock, Unlock,
} from 'lucide-react';
import {
  useFiscalKpis, useFiscalConfig, useUpdateFiscalConfig, useTestarConexaoFiscal,
  useNotasFiscais, usePedidos, useCancelarNotaFiscal, useHasPermissao,
} from '@/hooks/useQuery';
import { toast } from 'sonner';

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtCNPJ(v?: string | null) {
  if (!v) return '—';
  const d = v.replace(/\D/g, '');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return v;
}

function fmtData(v?: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('pt-BR');
}

// ─── KPI Cards ────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: React.ReactNode;
  sub?: string; accent?: 'green' | 'yellow' | 'red' | 'blue';
}) {
  const colors: Record<string, string> = {
    green:  'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
    yellow: 'text-amber-600  bg-amber-50  dark:bg-amber-950/30',
    red:    'text-red-600    bg-red-50    dark:bg-red-950/30',
    blue:   'text-blue-600   bg-blue-50   dark:bg-blue-950/30',
  };
  const cls = colors[accent ?? 'blue'];
  return (
    <div className="bg-card border rounded-xl p-5 flex gap-4 items-start">
      <div className={`p-2.5 rounded-lg ${cls}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
        <p className="text-2xl font-bold tabular-nums mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Status SEFAZ badge ────────────────────────────────────────────────────────

function SefazStatus() {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      SEFAZ Online
    </div>
  );
}

// ─── Aba: Emitidas ────────────────────────────────────────────────────────────

function EmitidaTab({
  notas, isLoading, onCancelar, onRefetch, podeCancelar,
}: {
  notas: any[]; isLoading: boolean;
  onCancelar: (n: any) => void; onRefetch: () => void; podeCancelar: boolean;
}) {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    let r = notas;
    if (busca.trim()) {
      const t = busca.toLowerCase();
      r = r.filter(n =>
        (n.numero || '').toLowerCase().includes(t) ||
        (n.clientes?.nome || '').toLowerCase().includes(t) ||
        (n.clientes?.cnpj || '').includes(t),
      );
    }
    if (statusFiltro) r = r.filter(n => n.status === statusFiltro);
    return r;
  }, [notas, busca, statusFiltro]);

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(n => n.id)));
  }

  function handleBulkDownload() {
    toast.info(`Download de ${selected.size} XML(s) em lote — funcionalidade em breve.`);
  }

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por número, cliente ou CNPJ..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-md border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={statusFiltro}
          onChange={e => setStatusFiltro(e.target.value)}
          className="h-9 px-3 rounded-md border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Todos os status</option>
          <option value="emitida">Autorizada</option>
          <option value="pendente">Pendente</option>
          <option value="processando">Processando</option>
          <option value="cancelada">Cancelada</option>
          <option value="erro">Rejeitada</option>
        </select>
        <Button variant="outline" size="sm" onClick={onRefetch}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Atualizar
        </Button>
        {selected.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">{selected.size} selecionada(s)</span>
            <Button variant="outline" size="sm" onClick={handleBulkDownload}>
              <Download className="w-3.5 h-3.5 mr-1" /> Baixar XML
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast.info('Exportação em lote em breve.')}>
              <Mail className="w-3.5 h-3.5 mr-1" /> Enviar e-mail
            </Button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border rounded-xl bg-card">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-25" />
          <p className="text-sm font-medium">Nenhuma nota fiscal encontrada</p>
          {busca && <p className="text-xs mt-1">Tente um termo diferente</p>}
        </div>
      ) : (
        <div className="bg-card rounded-xl border overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                <th>Nº</th>
                <th>Série</th>
                <th>Cliente</th>
                <th>CNPJ</th>
                <th className="text-right">Valor</th>
                <th>Emissão</th>
                <th>Status</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((n: any) => (
                <tr key={n.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(n.id)}
                      onChange={() => {
                        const s = new Set(selected);
                        s.has(n.id) ? s.delete(n.id) : s.add(n.id);
                        setSelected(s);
                      }}
                      className="rounded"
                    />
                  </td>
                  <td className="font-mono text-xs font-semibold">{n.numero || n.numero_nota || '—'}</td>
                  <td className="text-sm">{n.serie || '1'}</td>
                  <td>
                    <div>
                      <p className="text-sm font-medium">{n.clientes?.nome || '—'}</p>
                      {(n.nota_fiscal_pedidos || []).length > 0 && (
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {(n.nota_fiscal_pedidos as any[]).map((nfp: any) => (
                            <span
                              key={nfp.pedido_id}
                              onClick={() => navigate(`/pedidos/${nfp.pedido_id}`)}
                              className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
                            >
                              {nfp.pedidos?.numero || `#${nfp.pedido_id}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="text-xs font-mono text-muted-foreground">{fmtCNPJ(n.clientes?.cnpj)}</td>
                  <td className="text-right tabular-nums font-medium">
                    {fmtBRL(Number(n.valor_total || 0))}
                  </td>
                  <td className="text-sm text-muted-foreground">{fmtData(n.data_emissao)}</td>
                  <td><StatusFiscalBadge status={n.status} /></td>
                  <td>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toast.info('Visualização XML em breve.')}>
                          <Eye className="w-4 h-4 mr-2" /> Visualizar XML
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(`/api/fiscal/notas/${n.id}/xml`, '_blank')}>
                          <Download className="w-4 h-4 mr-2" /> Baixar XML
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(`/api/fiscal/notas/${n.id}/pdf`, '_blank')}>
                          <FileText className="w-4 h-4 mr-2" /> Gerar DANFE
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.info('Reenvio por e-mail em breve.')}>
                          <Mail className="w-4 h-4 mr-2" /> Reenviar por e-mail
                        </DropdownMenuItem>
                        {podeCancelar && n.status === 'emitida' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => onCancelar(n)}
                            >
                              <XCircle className="w-4 h-4 mr-2" /> Cancelar nota
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Aba: A Emitir ────────────────────────────────────────────────────────────

function AEmitirTab({ onEmitir }: { onEmitir: (pedidos: any[]) => void }) {
  const rawResult = usePedidos({ limit: 200 }) as any;
  const pedidosData = rawResult.data;
  const isLoading   = rawResult.isLoading;

  const todos: any[] = Array.isArray(pedidosData)
    ? pedidosData
    : Array.isArray(pedidosData?.data) ? pedidosData.data : [];

  const aptos = todos.filter(p =>
    ['concluido', 'faturado'].includes(p.status) && p.statusFiscal !== 'emitida',
  );

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (aptos.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground border rounded-xl bg-card">
        <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-25" />
        <p className="text-sm font-medium">Nenhum pedido pendente de emissão</p>
        <p className="text-xs mt-1">Pedidos concluídos/faturados sem NF aparecem aqui</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {aptos.map((p: any) => (
        <div
          key={p.id}
          className="bg-card border rounded-xl p-4 flex items-center justify-between gap-4 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg flex-shrink-0">
              <FileText className="w-4 h-4 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm">
                PED-{String(p.numero || p.id).padStart(4, '0')} — {p.clienteNome || '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {fmtCNPJ(p.clienteCnpj)} · {p.totalItens ?? '—'} itens · {fmtData(p.createdAt ?? p.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <p className="font-semibold tabular-nums">{fmtBRL(Number(p.valorTotal ?? 0))}</p>
            <Button
              size="sm"
              onClick={() =>
                onEmitir([{
                  id: p.id, numero: p.numero,
                  cliente: p.clienteNome || '—',
                  clienteId: p.clienteId,
                  valor: Number(p.valorTotal ?? 0),
                  status: p.status,
                  statusFiscal: p.statusFiscal,
                }])
              }
            >
              <Send className="w-3.5 h-3.5 mr-1" /> Emitir NF-e
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Aba: Clientes ────────────────────────────────────────────────────────────

function ClientesTab({ notas, onVerCliente }: { notas: any[]; onVerCliente: (c: any) => void }) {
  // Deriva clientes diretamente das notas já carregadas (sem chamada extra)
  const comNotas = useMemo(() => {
    const map = new Map<number, { cliente: any; qtd: number }>();
    notas.forEach(n => {
      if (!n.cliente_id || !n.clientes) return;
      const entry = map.get(n.cliente_id);
      if (entry) entry.qtd += 1;
      else map.set(n.cliente_id, { cliente: n.clientes, qtd: 1 });
    });
    return Array.from(map.values()).sort((a, b) => b.qtd - a.qtd);
  }, [notas]);

  const regimeLabel: Record<string, string> = {
    simples_nacional: 'Simples Nacional',
    lucro_presumido:  'Lucro Presumido',
    lucro_real:       'Lucro Real',
    mei:              'MEI',
  };

  if (comNotas.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground border rounded-xl bg-card">
        <Building2 className="w-10 h-10 mx-auto mb-3 opacity-25" />
        <p className="text-sm font-medium">Nenhum cliente com notas emitidas</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {comNotas.map(({ cliente: c, qtd }) => (
        <button
          key={c.id}
          onClick={() => onVerCliente(c)}
          className="bg-card border rounded-xl p-4 text-left hover:shadow-md hover:border-primary/30 transition-all group"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg flex-shrink-0">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{c.nome}</p>
              <p className="text-xs font-mono text-muted-foreground mt-0.5">{fmtCNPJ(c.cnpj)}</p>
              <div className="flex items-center gap-2 mt-2">
                {c.regime_tributario && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-medium">
                    {regimeLabel[c.regime_tributario] || c.regime_tributario}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{qtd} nota(s)</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Drawer: Detalhes do Cliente ──────────────────────────────────────────────

function ClienteDrawer({ cliente, notas, open, onClose }: {
  cliente: any; notas: any[]; open: boolean; onClose: () => void;
}) {
  const notasCliente = notas.filter(n => n.cliente_id === cliente?.id);
  if (!cliente) return null;

  return (
    <Sheet open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {cliente.nome}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Dados fiscais */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Dados fiscais</h3>
            <dl className="space-y-2">
              {[
                ['Razão Social', cliente.nome],
                ['CNPJ',        fmtCNPJ(cliente.cnpj)],
                ['IE',          cliente.inscricao_estadual || '—'],
                ['IM',          cliente.inscricao_municipal || '—'],
                ['Regime',      cliente.regime_tributario || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm py-1.5 border-b last:border-0">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium text-right max-w-48 truncate">{v}</span>
                </div>
              ))}
            </dl>
          </div>

          {/* Endereço */}
          {(cliente.endereco || cliente.cidade) && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Endereço</h3>
              <dl className="space-y-1.5">
                {[
                  ['Logradouro', `${cliente.endereco || ''}${cliente.numero ? `, ${cliente.numero}` : ''}`],
                  ['Bairro',     cliente.bairro],
                  ['Cidade/UF',  `${cliente.cidade || ''}${cliente.estado ? `/${cliente.estado}` : ''}`],
                  ['CEP',        cliente.cep],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k as string} className="flex justify-between text-sm py-1.5 border-b last:border-0">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium text-right">{v}</span>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Histórico */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Notas emitidas ({notasCliente.length})
            </h3>
            {notasCliente.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma nota para este cliente.</p>
            ) : (
              <div className="space-y-2">
                {notasCliente.slice(0, 10).map(n => (
                  <div key={n.id} className="flex items-center justify-between text-sm p-2.5 rounded-lg bg-muted/50">
                    <div>
                      <span className="font-mono font-medium">{n.numero || n.numero_nota || `#${n.id}`}</span>
                      <span className="text-muted-foreground ml-2">{fmtData(n.data_emissao)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums">{fmtBRL(Number(n.valor_total || 0))}</span>
                      <StatusFiscalBadge status={n.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Aba: Configurações ───────────────────────────────────────────────────────

function ConfiguracoesFiscaisTab() {
  const { data: config, isLoading } = useFiscalConfig();
  const updateConfig  = useUpdateFiscalConfig();
  const testarConexao = useTestarConexaoFiscal();
  const podeEditar    = useHasPermissao('configuracoes.editar');

  const [form, setForm] = useState<Record<string, any>>({});
  const [showSenha,      setShowSenha]      = useState(false);
  const [showToken,      setShowToken]      = useState(false);
  const [showCertSenha,  setShowCertSenha]  = useState(false);
  const [dirty, setDirty] = useState(false);

  const merged = { ...config, ...form };

  function set(k: string, v: any) {
    setForm(f => ({ ...f, [k]: v }));
    setDirty(true);
  }

  async function handleSalvar() {
    try {
      await updateConfig.mutateAsync(form);
      setForm({});
      setDirty(false);
      toast.success('Configurações salvas com sucesso.');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar configurações.');
    }
  }

  async function handleTestar() {
    try {
      const r = await testarConexao.mutateAsync(undefined);
      if (r?.ok) toast.success(r.message || 'Conexão estabelecida!');
      else toast.error(r?.message || 'Falha na conexão.');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao testar conexão.');
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const PROVEDORES = [
    { value: 'mock',       label: 'Mock (desenvolvimento)' },
    { value: 'focus',      label: 'Focus NFe' },
    { value: 'atendenet',  label: 'AtendeNet' },
    { value: 'plugnotas',  label: 'PlugNotas' },
    { value: 'nfeio',      label: 'NFe.io' },
    { value: 'enotas',     label: 'eNotas' },
  ];

  const REGIMES = [
    { value: 'simples_nacional', label: 'Simples Nacional' },
    { value: 'lucro_presumido',  label: 'Lucro Presumido' },
    { value: 'lucro_real',       label: 'Lucro Real' },
    { value: 'mei',              label: 'MEI' },
  ];

  const isProducao = (merged.ambiente || 'homologacao') === 'producao';

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Status do sistema */}
      <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
        <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Sistema fiscal operacional</p>
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            SEFAZ-SP online · Provedor: {PROVEDORES.find(p => p.value === merged.provedor_fiscal)?.label || merged.provedor_fiscal || '—'}
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-600 text-white">Online</span>
      </div>

      {!podeEditar && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg text-sm text-amber-700">
          <Lock className="w-4 h-4 flex-shrink-0" />
          Apenas administradores podem editar as configurações fiscais.
        </div>
      )}

      {/* Credenciais */}
      <div className="bg-card border rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Credenciais do sistema fiscal</h3>
          <span className="text-xs text-muted-foreground ml-1">Login no provedor de emissão de NF-e</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Provedor</label>
            <select
              disabled={!podeEditar}
              value={merged.provedor_fiscal || 'mock'}
              onChange={e => set('provedor_fiscal', e.target.value)}
              className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            >
              {PROVEDORES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Ambiente</label>
            <div className="flex items-center gap-3 h-9">
              <span className={`text-sm ${!isProducao ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                Homologação
              </span>
              <Switch
                disabled={!podeEditar}
                checked={isProducao}
                onCheckedChange={v => set('ambiente', v ? 'producao' : 'homologacao')}
              />
              <span className={`text-sm ${isProducao ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                Produção
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Usuário / Client ID</label>
          <input
            type="text"
            disabled={!podeEditar}
            value={merged.client_id || merged.login || ''}
            onChange={e => set('client_id', e.target.value)}
            placeholder="usuario@empresa.com.br"
            className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Senha / Client Secret</label>
          <div className="relative">
            <input
              type={showSenha ? 'text' : 'password'}
              disabled={!podeEditar}
              value={merged.client_secret || merged.senha || ''}
              onChange={e => set('client_secret', e.target.value)}
              placeholder="••••••••••••••••"
              className="w-full h-9 pl-3 pr-10 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowSenha(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showSenha ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Token de API</label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              disabled={!podeEditar}
              value={merged.api_key || merged.focus_token || ''}
              onChange={e => set('api_key', e.target.value)}
              placeholder="••••••••••••••••••••••••"
              className="w-full h-9 pl-3 pr-10 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowToken(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showToken ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {podeEditar && (
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={handleTestar} disabled={testarConexao.isPending}>
              {testarConexao.isPending
                ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                : <Wifi className="w-3.5 h-3.5 mr-1" />}
              Testar conexão
            </Button>
            <Button size="sm" onClick={handleSalvar} disabled={!dirty || updateConfig.isPending}>
              {updateConfig.isPending && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
              Salvar credenciais
            </Button>
          </div>
        )}
      </div>

      {/* Certificado digital */}
      <div className="bg-card border rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Certificado digital A1</h3>
        </div>
        <p className="text-xs text-muted-foreground -mt-3">Arquivo .pfx usado para assinar as notas</p>

        <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground hover:border-primary/40 transition-colors cursor-pointer">
          <Download className="w-6 h-6 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">
            {merged.certificate_ref || 'Nenhum certificado carregado'}
          </p>
          {podeEditar && <p className="text-xs mt-1">Clique para substituir</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Senha do certificado</label>
          <div className="relative">
            <input
              type={showCertSenha ? 'text' : 'password'}
              disabled={!podeEditar}
              value={merged.certificate_password_ref || ''}
              onChange={e => set('certificate_password_ref', e.target.value)}
              placeholder="••••••••"
              className="w-full h-9 pl-3 pr-10 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowCertSenha(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showCertSenha ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Numeração e tributação */}
      <div className="bg-card border rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Numeração e tributação</h3>
          <span className="text-xs text-muted-foreground ml-1">Configurações padrão para emissão</span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Série</label>
            <input
              type="text"
              disabled={!podeEditar}
              value={merged.serie_rps || '1'}
              onChange={e => set('serie_rps', e.target.value)}
              className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Inscrição Municipal</label>
            <input
              type="text"
              disabled={!podeEditar}
              value={merged.inscricao_municipal || ''}
              onChange={e => set('inscricao_municipal', e.target.value)}
              className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Cód. Município</label>
            <input
              type="text"
              disabled={!podeEditar}
              value={merged.municipio_codigo || merged.codigo_municipio || ''}
              onChange={e => set('municipio_codigo', e.target.value)}
              className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Regime tributário</label>
            <select
              disabled={!podeEditar}
              value={merged.regime_tributario || 'simples_nacional'}
              onChange={e => set('regime_tributario', e.target.value)}
              className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            >
              {REGIMES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Alíquota ISS (%)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              disabled={!podeEditar}
              value={merged.aliquota_iss ?? 2}
              onChange={e => set('aliquota_iss', parseFloat(e.target.value))}
              className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          </div>
        </div>

        {podeEditar && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSalvar} disabled={!dirty || updateConfig.isPending}>
              {updateConfig.isPending && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
              Salvar configurações
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page principal ───────────────────────────────────────────────────────────

export default function FiscalPage() {
  const [emitirDrawerOpen,  setEmitirDrawerOpen]  = useState(false);
  const [pedidosSelecionados, setPedidosSelecionados] = useState<any[]>([]);
  const [cancelarOpen,      setCancelarOpen]      = useState(false);
  const [notaParaCancelar,  setNotaParaCancelar]  = useState<any>(null);
  const [clienteDrawerOpen, setClienteDrawerOpen] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);

  const { data: kpis,  isLoading: kpisLoading  } = useFiscalKpis();
  const { data: notas = [], isLoading: notasLoading, refetch } = useNotasFiscais();
  const cancelarNF = useCancelarNotaFiscal();

  const podeCancelar = useHasPermissao('fiscal.cancelar');
  const podeEmitir   = useHasPermissao('fiscal.emitir');

  function handleEmitirNovas(pedidos: any[]) {
    if (!podeEmitir) { toast.error('Sem permissão para emitir notas fiscais.'); return; }
    if (pedidos.length === 0) { toast.info('Nenhum pedido selecionado.'); return; }
    setPedidosSelecionados(pedidos);
    setEmitirDrawerOpen(true);
  }

  function handleEmitirNova() {
    // Abre drawer sem pré-seleção — usuário escolhe no drawer
    setPedidosSelecionados([]);
    setEmitirDrawerOpen(true);
  }

  async function confirmarCancelamento() {
    if (!notaParaCancelar) return;
    try {
      await cancelarNF.mutateAsync(notaParaCancelar.id);
      toast.success('Nota fiscal cancelada.');
      setCancelarOpen(false);
      setNotaParaCancelar(null);
      refetch();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao cancelar nota.');
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <PageHeader
        title="Notas Fiscais"
        subtitle="Emissão e controle de notas fiscais eletrônicas"
        actions={
          <div className="flex items-center gap-3">
            <SefazStatus />
            {podeEmitir && (
              <Button size="sm" onClick={handleEmitirNova}>
                <FileText className="w-4 h-4 mr-1" /> Emitir nova NF-e
              </Button>
            )}
          </div>
        }
      />

      {/* KPIs */}
      {kpisLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => (
            <div key={i} className="bg-card border rounded-xl p-5 h-24 animate-pulse bg-muted/30" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={<FileText className="w-5 h-5" />}
            label="Emitidas no mês"
            value={kpis?.emitidas ?? 0}
            sub={kpis?.valorMes != null ? fmtBRL(kpis.valorMes) : undefined}
            accent="blue"
          />
          <KpiCard
            icon={<CheckCircle2 className="w-5 h-5" />}
            label="Autorizadas"
            value={kpis?.autorizadas ?? 0}
            sub={kpis?.autorizadas_pct != null ? `${kpis.autorizadas_pct}% do total` : undefined}
            accent="green"
          />
          <KpiCard
            icon={<Clock className="w-5 h-5" />}
            label="Pendentes"
            value={kpis?.pendentes ?? 0}
            sub="Aguardando SEFAZ"
            accent="yellow"
          />
          <KpiCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Rejeitadas / Canceladas"
            value={kpis?.rejeitadas ?? 0}
            sub="Requer atenção"
            accent="red"
          />
        </div>
      )}

      {/* Abas */}
      <Tabs defaultValue="emitidas">
        <TabsList>
          <TabsTrigger value="emitidas">Emitidas</TabsTrigger>
          <TabsTrigger value="a-emitir">A Emitir</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="configuracoes">
            <Settings className="w-3.5 h-3.5 mr-1" /> Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="emitidas" className="mt-4">
          <EmitidaTab
            notas={notas as any[]}
            isLoading={notasLoading}
            onCancelar={n => { setNotaParaCancelar(n); setCancelarOpen(true); }}
            onRefetch={refetch}
            podeCancelar={podeCancelar}
          />
        </TabsContent>

        <TabsContent value="a-emitir" className="mt-4">
          <AEmitirTab onEmitir={handleEmitirNovas} />
        </TabsContent>

        <TabsContent value="clientes" className="mt-4">
          <ClientesTab
            notas={notas as any[]}
            onVerCliente={c => { setClienteSelecionado(c); setClienteDrawerOpen(true); }}
          />
        </TabsContent>

        <TabsContent value="configuracoes" className="mt-4">
          <ConfiguracoesFiscaisTab />
        </TabsContent>
      </Tabs>

      {/* Drawer de emissão (reutiliza componente existente) */}
      <EmitirNotaFiscalDrawer
        open={emitirDrawerOpen}
        onOpenChange={setEmitirDrawerOpen}
        pedidos={pedidosSelecionados}
        onEmitido={() => { refetch(); setPedidosSelecionados([]); }}
      />

      {/* Drawer de detalhes do cliente */}
      <ClienteDrawer
        open={clienteDrawerOpen}
        onClose={() => setClienteDrawerOpen(false)}
        cliente={clienteSelecionado}
        notas={notas as any[]}
      />

      {/* Dialog de confirmação de cancelamento */}
      <Dialog open={cancelarOpen} onOpenChange={o => { if (!o) { setCancelarOpen(false); setNotaParaCancelar(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" /> Cancelar nota fiscal
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja cancelar a nota{' '}
            <span className="font-semibold text-foreground font-mono">
              {notaParaCancelar?.numero || `#${notaParaCancelar?.id}`}
            </span>
            ? Esta operação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCancelarOpen(false); setNotaParaCancelar(null); }}
              disabled={cancelarNF.isPending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmarCancelamento} disabled={cancelarNF.isPending}>
              {cancelarNF.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
