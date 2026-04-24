/**
 * App Motorista — operação de campo integrada (OS, caçamba, GPS, histórico).
 * Dark nativo, toques ≥44px, fila offline básica para ações.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  MapPin, Truck, CheckCircle2, PackageCheck, Trash2,
  Camera, ChevronRight, ArrowLeft, Wifi, WifiOff,
  Clock, Phone, AlertTriangle, Loader2, RefreshCw,
  LogOut, Navigation, History, Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessBackOffice } from '@/lib/permissions';
import {
  useMinhasOs,
  useUnidadesDisponiveis,
  useRetirarCacamba,
  useEntregarCacamba,
  useColetarCacamba,
  useChegouPatio,
  useMotoristaHistoricoDia,
} from '@/hooks/useQuery';
import type { HistoricoDiaMotoristaItem } from '@/lib/api';

// ── Constantes ───────────────────────────────────────────────────────────────

const QUEUE_KEY = 'motorista_offline_queue';
const DISP_KEY = 'motorista_disponibilidade_v1';

type Step =
  | 'retirar_cacamba'
  | 'entregar_cliente'
  | 'iniciar_coleta'
  | 'chegou_patio'
  | 'concluida';

type Disp = 'disponivel' | 'em_rota' | 'pausa';

// ── Tipos fila offline ────────────────────────────────────────────────────────

interface QueueItem {
  id: string;
  endpoint: string;
  payload: Record<string, unknown>;
  ts: number;
}

function enqueue(endpoint: string, payload: Record<string, unknown>) {
  const queue: QueueItem[] = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
  queue.push({ id: `${Date.now()}-${Math.random()}`, endpoint, payload, ts: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function queueSize(): number {
  return (JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as QueueItem[]).length;
}

// ── Helpers OS ─────────────────────────────────────────────────────────────────

function proximoStep(tipo: string, status: string): Step | null {
  if (['concluida', 'cancelada'].includes(status)) return 'concluida';
  const isEntrega = ['entrega_cacamba', 'troca'].includes(tipo);
  const isColeta  = ['retirada', 'troca'].includes(tipo);

  if (status === 'pendente' || status === 'em_rota') {
    if (isEntrega) return 'retirar_cacamba';
    if (isColeta)  return 'iniciar_coleta';
  }
  if (status === 'no_local') {
    return isColeta ? 'chegou_patio' : 'concluida';
  }
  return null;
}

function stepAposRetirada(tipo: string): Step {
  return ['retirada', 'troca'].includes(tipo) ? 'iniciar_coleta' : 'entregar_cliente';
}

const STEP_META: Record<Step, { label: string; cor: string; icone: typeof Truck }> = {
  retirar_cacamba:  { label: 'Confirmar Retirada',  cor: 'bg-amber-500',   icone: Truck },
  entregar_cliente: { label: 'Confirmar Entrega',   cor: 'bg-blue-500',    icone: PackageCheck },
  iniciar_coleta:   { label: 'Confirmar Coleta',    cor: 'bg-orange-500',  icone: Trash2 },
  chegou_patio:     { label: 'Confirmar Chegada',   cor: 'bg-green-600',   icone: CheckCircle2 },
  concluida:        { label: 'Concluída',           cor: 'bg-slate-400',    icone: CheckCircle2 },
};

function fmtTipo(t: string) {
  const m: Record<string, string> = {
    entrega_cacamba: 'Entrega', retirada: 'Coleta',
    troca: 'Troca', locacao_maquina: 'Máquina',
  };
  return m[t] ?? t;
}

function enderecoOs(os: any): string {
  const ee = os.pedidos?.enderecos_entrega;
  if (ee) return [ee.endereco, ee.numero, ee.bairro, ee.cidade].filter(Boolean).join(', ');
  const ob = os.pedidos?.obras;
  if (ob) return [ob.endereco, ob.numero, ob.bairro, ob.cidade].filter(Boolean).join(', ');
  return '—';
}

function rotulosOrigemDestino(os: any, step: Step): { origem: string; destino: string } {
  const dest = enderecoOs(os);
  if (step === 'retirar_cacamba') {
    return { origem: 'Pátio / base — retirada da unidade', destino: dest };
  }
  if (step === 'entregar_cliente') {
    return { origem: 'Em rota — caçamba a bordo', destino: dest || 'Obra / cliente' };
  }
  if (step === 'iniciar_coleta') {
    return { origem: dest || 'Cliente / obra', destino: 'Pátio ou usina — próximo passo' };
  }
  if (step === 'chegou_patio') {
    return { origem: 'Em rota — retorno', destino: 'Pátio / base — descarga' };
  }
  return { origem: '—', destino: dest };
}

function linksNavegacao(endereco: string) {
  const q = encodeURIComponent(endereco);
  return {
    waze: `https://waze.com/ul?q=${q}&navigate=yes`,
    google: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
  };
}

async function capturarGPS(): Promise<{ lat: number; lng: number } | undefined> {
  if (!navigator.geolocation) return undefined;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(undefined),
      { timeout: 12000, maximumAge: 15000, enableHighAccuracy: true },
    );
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function MotoristaPage() {
  const { profile, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<any | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(queueSize());
  const [tab, setTab] = useState('missao');
  const [disp, setDisp] = useState<Disp>(() => (localStorage.getItem(DISP_KEY) as Disp) || 'disponivel');
  const [busca, setBusca] = useState('');

  const podeChamarApiMotorista = roles.includes('motorista') || canAccessBackOffice(roles);
  const { data: raw, isLoading, refetch } = useMinhasOs({ enabled: podeChamarApiMotorista });
  const osList: any[] = raw?.data ?? [];
  const vinculoPendente = Boolean(raw?.vinculoPendente);
  const cabecalho = raw?.cabecalho;

  const { data: historicoRaw = [], refetch: refetchHistorico } = useMotoristaHistoricoDia({
    enabled: podeChamarApiMotorista && !vinculoPendente && tab === 'historico',
  });

  useEffect(() => {
    localStorage.setItem(DISP_KEY, disp);
  }, [disp]);

  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setPending(queueSize()), 4000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (roles.length === 0) return;
    if (canAccessBackOffice(roles) && !roles.includes('motorista')) {
      navigate('/');
    }
  }, [roles, navigate]);

  const invalidateMotorista = () => {
    void qc.invalidateQueries({ queryKey: ['minhas-os'] });
    void qc.invalidateQueries({ queryKey: ['motorista-historico-dia'] });
    void refetch();
    void refetchHistorico();
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/motorista/login', { replace: true });
  };

  const osFiltradas = osList.filter((os) => {
    const q = busca.trim().toLowerCase();
    if (!q) return true;
    const s = `${os.id} ${os.pedidos?.clientes?.nome ?? ''} ${enderecoOs(os)} ${os.unidades_cacamba?.patrimonio ?? ''}`.toLowerCase();
    return s.includes(q);
  });

  if (canAccessBackOffice(roles) && !roles.includes('motorista')) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-950">
        <Loader2 className="h-10 w-10 text-emerald-400 animate-spin" />
        <p className="text-slate-400 text-sm">Redirecionando…</p>
      </div>
    );
  }

  if (isLoading && podeChamarApiMotorista) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-950">
        <Loader2 className="h-10 w-10 text-emerald-400 animate-spin" />
        <p className="text-slate-400 text-sm">Carregando sua operação…</p>
      </div>
    );
  }

  if (selected) {
    return (
      <OsFluxo
        os={selected}
        podeChamarApiMotorista={podeChamarApiMotorista}
        onVoltar={() => setSelected(null)}
        onConcluido={() => {
          invalidateMotorista();
          setSelected(null);
        }}
      />
    );
  }

  const mailAdmin = () => {
    const subject = encodeURIComponent('App motorista — cadastro não vinculado');
    const body = encodeURIComponent(
      `Olá,\n\nMeu usuário (${profile?.email ?? '—'}) precisa ser vinculado ao cadastro de motorista no sistema Lapa Caçambas.\n\nObrigado.`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col max-w-lg mx-auto">
      <header className="px-4 pt-8 pb-4 border-b border-slate-800/80">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-500/90 font-semibold">SensoriAI · Lapa</p>
            <h1 className="text-xl font-bold truncate mt-0.5">
              {cabecalho?.motoristaNome ?? profile?.nome?.split(' ')[0] ?? 'Motorista'}
            </h1>
            {cabecalho?.veiculo ? (
              <p className="text-sm text-slate-400 mt-1 flex items-center gap-2 truncate">
                <Truck className="h-4 w-4 shrink-0 text-slate-500" />
                <span className="font-mono">{cabecalho.veiculo.placa}</span>
                <span className="text-slate-500">·</span>
                <span className="truncate">{cabecalho.veiculo.modelo}{cabecalho.veiculo.marca ? ` · ${cabecalho.veiculo.marca}` : ''}</span>
              </p>
            ) : (
              <p className="text-xs text-amber-500/90 mt-1">Veículo ainda não atribuído nesta OS — combine com a logística.</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {online ? (
              <span className="flex items-center gap-1 text-xs text-emerald-400"><Wifi className="h-4 w-4" />Online</span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-amber-400"><WifiOff className="h-4 w-4" />Offline</span>
            )}
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => { void refetch(); void refetchHistorico(); }}
                className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-700 flex items-center justify-center hover:bg-slate-800"
                aria-label="Atualizar"
              >
                <RefreshCw className="h-5 w-5 text-slate-400" />
              </button>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-700 flex items-center justify-center hover:bg-red-950/40 text-slate-300"
                aria-label="Sair"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <p className="text-slate-500 text-xs mt-3">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>

        {podeChamarApiMotorista && !vinculoPendente && (
          <div className="mt-4">
            <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Disponibilidade</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'disponivel' as Disp, label: 'Disponível' },
                { id: 'em_rota' as Disp, label: 'Em rota' },
                { id: 'pausa' as Disp, label: 'Em pausa' },
              ]).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setDisp(o.id)}
                  className={cn(
                    'min-h-[44px] rounded-xl text-sm font-medium border transition-colors',
                    disp === o.id
                      ? 'bg-emerald-600/25 border-emerald-500 text-emerald-100'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500',
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {pending > 0 && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {pending} ação(ões) na fila offline — serão enviadas ao voltar o sinal.
          </div>
        )}

        {podeChamarApiMotorista && vinculoPendente && (
          <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-left text-sm">
            <p className="font-semibold text-amber-200 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Cadastro não vinculado
            </p>
            <p className="mt-1.5 text-amber-100/90 text-xs leading-relaxed">
              Seu login ainda não está associado ao cadastro de motorista no sistema.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-3 w-full min-h-[44px] bg-amber-950/50 border border-amber-600/40 text-amber-100 hover:bg-amber-900/50"
              onClick={mailAdmin}
            >
              <Mail className="h-4 w-4 mr-2" />
              Contatar administrador
            </Button>
          </div>
        )}
      </header>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
        <div className="px-4 pt-3 pb-2">
          <TabsList className="w-full grid grid-cols-2 h-12 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <TabsTrigger value="missao" className="rounded-lg min-h-[44px] data-[state=active]:bg-slate-800">
              Missões
            </TabsTrigger>
            <TabsTrigger value="historico" className="rounded-lg min-h-[44px] data-[state=active]:bg-slate-800">
              <History className="h-4 w-4 inline mr-1.5 -mt-0.5" />
              Histórico do dia
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="missao" className="flex-1 flex flex-col mt-0 px-4 pb-4 data-[state=inactive]:hidden">
          {!podeChamarApiMotorista ? (
            <p className="text-center text-slate-400 text-sm py-12">Seu usuário não tem o papel motorista.</p>
          ) : vinculoPendente ? null : (
            <>
              <div className="mb-3">
                <input
                  type="search"
                  placeholder="Buscar OS, cliente, endereço ou patrimônio…"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm placeholder:text-slate-600"
                />
              </div>
              {podeChamarApiMotorista && !vinculoPendente && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: 'Total', value: osList.length },
                    { label: 'Pendentes', value: osList.filter((o) => o.status === 'pendente').length },
                    { label: 'Em rota', value: osList.filter((o) => o.status === 'em_rota').length },
                  ].map((s) => (
                    <div key={s.label} className="bg-slate-900 rounded-xl p-3 text-center border border-slate-800">
                      <div className="text-xl font-bold text-white">{s.value}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-3 flex-1 overflow-y-auto pb-4">
                {osFiltradas.length === 0 ? (
                  <div className="text-center py-16">
                    <CheckCircle2 className="h-14 w-14 mx-auto text-emerald-500 mb-3 opacity-90" strokeWidth={1.5} />
                    <h2 className="text-lg font-semibold">Tudo em dia</h2>
                    <p className="text-slate-500 text-sm mt-1">Nenhuma OS pendente no filtro atual.</p>
                  </div>
                ) : (
                  osFiltradas.map((os) => (
                    <OsCard key={os.id} os={os} onTap={() => setSelected(os)} />
                  ))
                )}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="historico" className="flex-1 flex flex-col mt-0 px-4 pb-4 data-[state=inactive]:hidden overflow-y-auto">
          {!podeChamarApiMotorista || vinculoPendente ? (
            <p className="text-slate-500 text-sm text-center py-12">Histórico disponível após o vínculo do cadastro.</p>
          ) : (historicoRaw as HistoricoDiaMotoristaItem[]).length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-12">Nenhuma movimentação registrada hoje.</p>
          ) : (
            <ul className="space-y-3">
              {(historicoRaw as HistoricoDiaMotoristaItem[]).map((h) => (
                <li
                  key={h.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-sm"
                >
                  <div className="flex justify-between gap-2 text-xs text-slate-500">
                    <span>{new Date(h.horario).toLocaleString('pt-BR')}</span>
                    <span className="text-emerald-500/90 font-medium">{h.tipoLabel}</span>
                  </div>
                  <p className="mt-2 text-slate-200">
                    <span className="text-slate-500">Motorista:</span>{' '}
                    {h.motoristaNome ?? '—'}
                  </p>
                  <p className="text-slate-300 mt-1">
                    <span className="text-slate-500">Caminhão:</span>{' '}
                    {h.placaVeiculo ? `${h.placaVeiculo} · ${h.modeloVeiculo ?? ''}` : '—'}
                  </p>
                  <p className="text-slate-300 mt-1">
                    <span className="text-slate-500">Caçamba:</span>{' '}
                    {h.patrimonio ?? '—'}
                  </p>
                  <p className="text-slate-400 text-xs mt-1 font-mono">
                    GPS: {h.latitude != null && h.longitude != null ? `${h.latitude.toFixed(5)}, ${h.longitude.toFixed(5)}` : '—'}
                  </p>
                  {h.observacao && (
                    <p className="text-xs text-slate-500 mt-2 border-t border-slate-800 pt-2">{h.observacao}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <footer className="mt-auto px-4 py-5 border-t border-slate-800/80 text-center space-y-1">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Logística e reciclagem com precisão de elite.
        </p>
        <p className="text-[10px] text-slate-600">SensoriAI</p>
      </footer>
    </div>
  );
}

// ── OsCard ─────────────────────────────────────────────────────────────────────

function OsCard({ os, onTap }: { os: any; onTap: () => void }) {
  const step = proximoStep(os.tipo, os.status);
  const meta = step ? STEP_META[step] : null;
  const Icon = meta?.icone ?? Truck;
  const done = os.status === 'concluida';

  return (
    <button
      type="button"
      onClick={onTap}
      className={cn(
        'w-full text-left rounded-2xl border p-4 min-h-[72px] transition-all active:scale-[0.99]',
        done
          ? 'bg-slate-900/40 border-slate-800 opacity-70'
          : 'bg-slate-900 border-slate-700 hover:border-emerald-600/50',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-base">OS-{os.id}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{fmtTipo(os.tipo)}</span>
            {os.unidades_cacamba?.patrimonio && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300 font-mono">
                {os.unidades_cacamba.patrimonio}
              </span>
            )}
          </div>
          <p className="font-semibold text-base mt-1 truncate">{os.pedidos?.clientes?.nome ?? '—'}</p>
          <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5 truncate">
            <MapPin className="h-3.5 w-3.5 shrink-0" />{enderecoOs(os)}
          </p>
          {os.pedidos?.hora_programada && (
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3" />{String(os.pedidos.hora_programada).slice(0, 5)}
            </p>
          )}
        </div>
        {!done && meta && (
          <div className={cn('shrink-0 h-11 w-11 rounded-full flex items-center justify-center', meta.cor)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        )}
        {done && <CheckCircle2 className="h-7 w-7 text-emerald-500 shrink-0" />}
      </div>
      {!done && meta && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-emerald-500/90 font-medium">{meta.label}</span>
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </div>
      )}
    </button>
  );
}

// ── OsFluxo ───────────────────────────────────────────────────────────────────

function OsFluxo({
  os,
  podeChamarApiMotorista,
  onVoltar,
  onConcluido,
}: {
  os: any;
  podeChamarApiMotorista: boolean;
  onVoltar: () => void;
  onConcluido: () => void;
}) {
  const [step, setStep] = useState<Step>(() => proximoStep(os.tipo, os.status) ?? 'concluida');
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [cacambaId, setCacambaId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [buscaUnid, setBuscaUnid] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: unidades = [] } = useUnidadesDisponiveis({
    enabled: podeChamarApiMotorista && step === 'retirar_cacamba',
  }) as any;

  const retirar  = useRetirarCacamba();
  const entregar = useEntregarCacamba();
  const coletar  = useColetarCacamba();
  const chegou   = useChegouPatio();

  const disponiveisRaw: any[] = Array.isArray(unidades?.data) ? unidades.data : unidades;
  const disponiveis = disponiveisRaw.filter((u: any) => {
    const q = buscaUnid.trim().toLowerCase();
    if (!q) return true;
    return String(u.patrimonio ?? '').toLowerCase().includes(q)
      || String(u.id).includes(q)
      || String(u.cacambas?.descricao ?? '').toLowerCase().includes(q);
  });

  const { origem, destino } = rotulosOrigemDestino(os, step);
  const endDest = enderecoOs(os);
  const nav = linksNavegacao(endDest);

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFotoFile(f);
    setFotoPreview(URL.createObjectURL(f));
  };

  const capturarAcao = async () => {
    setLoading(true);
    const geo = await capturarGPS();

    try {
      if (step === 'retirar_cacamba') {
        if (!cacambaId) {
          toast.error('Selecione a caçamba (patrimônio) antes de confirmar a retirada.');
          setLoading(false);
          return;
        }
        await retirar.mutateAsync({ execucaoId: os.id, unidadeCacambaId: cacambaId, geo });
        toast.success('Retirada registrada com GPS e horário.');
        setStep(stepAposRetirada(os.tipo));
      } else if (step === 'entregar_cliente') {
        if (!fotoFile && !fotoPreview) {
          toast.error('Tire a foto de comprovante no local antes de confirmar a entrega.');
          setLoading(false);
          return;
        }
        let fotoUrl: string | undefined;
        if (fotoFile) fotoUrl = await fileToDataUrl(fotoFile);
        else if (fotoPreview?.startsWith('data:')) fotoUrl = fotoPreview;
        await entregar.mutateAsync({ execucaoId: os.id, geo: { ...geo, fotoUrl } });
        toast.success('Entrega confirmada. Caçamba atualizada no escritório.');
        setStep('concluida');
      } else if (step === 'iniciar_coleta') {
        await coletar.mutateAsync({ execucaoId: os.id, geo });
        toast.success('Coleta registrada.');
        setStep('chegou_patio');
      } else if (step === 'chegou_patio') {
        await chegou.mutateAsync({ execucaoId: os.id, geo });
        toast.success('Chegada ao pátio registrada.');
        setStep('concluida');
      }
    } catch (err: any) {
      const msg = err?.message ?? 'Erro ao executar ação.';
      toast.error(msg);
      if (!navigator.onLine) {
        enqueue(`execucoes/${os.id}/${step}`, { cacambaId, geo, fotoDataUrl: fotoFile ? await fileToDataUrl(fotoFile).catch(() => null) : undefined });
        toast.info('Sem rede: ação guardada na fila com coordenadas para envio automático.');
      }
    } finally {
      setLoading(false);
    }
  };

  const meta = STEP_META[step];
  const Icon = meta.icone;
  const primarioDesabilitado =
    loading
    || (step === 'retirar_cacamba' && !cacambaId)
    || (step === 'entregar_cliente' && !fotoFile && !fotoPreview);

  if (step === 'concluida') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-6 max-w-lg mx-auto">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" />
          <div className="relative h-24 w-24 rounded-full bg-emerald-500/15 flex items-center justify-center border border-emerald-500/30">
            <CheckCircle2 className="h-12 w-12 text-emerald-400" strokeWidth={1.5} />
          </div>
        </div>
        <h2 className="text-2xl font-bold">OS-{os.id} concluída</h2>
        <p className="text-slate-400 text-sm mt-2 text-center">
          {os.pedidos?.clientes?.nome} — {fmtTipo(os.tipo)}
        </p>
        <Button onClick={onConcluido} className="mt-10 min-h-[48px] w-full text-base rounded-2xl bg-emerald-600 hover:bg-emerald-500">
          Voltar às missões
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col max-w-lg mx-auto">
      <div className="flex items-center gap-2 px-4 pt-6 pb-3 border-b border-slate-800/80">
        <button
          type="button"
          onClick={onVoltar}
          className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center hover:bg-slate-800 border border-slate-800"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-emerald-500/90 font-semibold">OS ativa</p>
          <p className="text-xs text-slate-500">OS-{os.id} · {fmtTipo(os.tipo)}</p>
          <h2 className="font-bold text-lg leading-tight truncate">{os.pedidos?.clientes?.nome ?? '—'}</h2>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 flex-1 overflow-y-auto">
        <div className="rounded-2xl border border-emerald-600/30 bg-gradient-to-br from-emerald-950/40 to-slate-900 p-4">
          <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold mb-2 flex items-center gap-1">
            <Navigation className="h-3.5 w-3.5" /> Rota
          </p>
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Origem</p>
              <p className="text-slate-100">{origem}</p>
            </div>
            <div className="border-t border-slate-700/80 pt-2">
              <p className="text-[10px] text-slate-500 uppercase">Destino</p>
              <p className="text-slate-100">{destino}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <a
              href={nav.google}
              target="_blank"
              rel="noreferrer"
              className="flex-1 min-h-[44px] flex items-center justify-center rounded-xl bg-slate-800 border border-slate-600 text-sm font-medium hover:bg-slate-700"
            >
              Maps
            </a>
            <a
              href={nav.waze}
              target="_blank"
              rel="noreferrer"
              className="flex-1 min-h-[44px] flex items-center justify-center rounded-xl bg-slate-800 border border-slate-600 text-sm font-medium hover:bg-slate-700"
            >
              Waze
            </a>
          </div>
        </div>

        <StepProgress tipo={os.tipo} atual={step} />

        {step === 'retirar_cacamba' && (
          <div>
            <p className="text-sm text-slate-400 mb-2 font-medium">Selecione a caçamba no pátio (obrigatório)</p>
            <input
              placeholder="Buscar patrimônio ou ID…"
              value={buscaUnid}
              onChange={(e) => setBuscaUnid(e.target.value)}
              className="w-full min-h-[44px] mb-3 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto">
              {disponiveis.length === 0 && (
                <p className="col-span-full text-sm text-slate-500 text-center py-6">Nenhuma unidade disponível.</p>
              )}
              {disponiveis.map((u: any) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setCacambaId(u.id === cacambaId ? null : u.id)}
                  className={cn(
                    'min-h-[48px] rounded-xl border py-2 px-2 text-center text-sm font-bold transition-all',
                    u.id === cacambaId
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-100'
                      : 'border-slate-700 bg-slate-900 text-slate-300',
                  )}
                >
                  {u.patrimonio}
                  <div className="text-[10px] font-normal text-slate-500 mt-0.5 truncate">#{u.id}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'entregar_cliente' && (
          <div>
            <p className="text-sm text-slate-400 mb-2 font-medium">Prova de entrega (foto no local)</p>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto} />
            {fotoPreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-700">
                <img src={fotoPreview} alt="Comprovante" className="w-full h-48 object-cover" />
                <button
                  type="button"
                  onClick={() => { setFotoFile(null); setFotoPreview(null); }}
                  className="absolute top-2 right-2 min-h-[40px] px-3 rounded-full bg-black/70 text-white text-xs"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full min-h-[120px] rounded-2xl border-2 border-dashed border-slate-600 flex flex-col items-center justify-center gap-2 text-slate-400"
              >
                <Camera className="h-9 w-9" strokeWidth={1.5} />
                <span className="text-sm">Abrir câmera / galeria</span>
              </button>
            )}
          </div>
        )}

        <InfoCard icon={MapPin} label="Endereço destino">
          <span>{endDest}</span>
        </InfoCard>

        {os.pedidos?.clientes?.celular && (
          <InfoCard icon={Phone} label="Contato cliente">
            <a href={`tel:${os.pedidos.clientes.celular}`} className="text-emerald-400 min-h-[44px] inline-flex items-center">
              {os.pedidos.clientes.celular}
            </a>
          </InfoCard>
        )}

        {os.pedidos?.observacao && (
          <InfoCard icon={AlertTriangle} label="Observação">
            <span className="text-amber-300">{os.pedidos.observacao}</span>
          </InfoCard>
        )}
      </div>

      <div className="px-4 pb-8 pt-2 border-t border-slate-800/80">
        <button
          type="button"
          onClick={() => void capturarAcao()}
          disabled={primarioDesabilitado}
          className={cn(
            'w-full min-h-[52px] rounded-2xl text-white font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-[0.99] disabled:opacity-40',
            meta.cor,
          )}
        >
          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
            <>
              <Icon className="h-6 w-6" />
              {meta.label}
            </>
          )}
        </button>
        <p className="text-[10px] text-slate-600 text-center mt-2">
          GPS e horário são enviados junto à ação. Sem sinal, a fila local guarda os dados.
        </p>
      </div>
    </div>
  );
}

const STEPS_ENTREGA: Step[] = ['retirar_cacamba', 'entregar_cliente', 'concluida'];
const STEPS_COLETA:  Step[] = ['iniciar_coleta', 'chegou_patio', 'concluida'];
const STEPS_TROCA:   Step[] = ['retirar_cacamba', 'entregar_cliente', 'iniciar_coleta', 'chegou_patio', 'concluida'];

function StepProgress({ tipo, atual }: { tipo: string; atual: Step }) {
  const steps =
    tipo === 'troca'    ? STEPS_TROCA :
    tipo === 'retirada' ? STEPS_COLETA :
                          STEPS_ENTREGA;
  const idx = steps.indexOf(atual);
  return (
    <div className="flex items-center gap-1 py-2">
      {steps.map((s, i) => {
        const done = i < idx;
        const current = i === idx;
        return (
          <div key={s} className="flex items-center gap-1 flex-1">
            <div
              className={cn(
                'h-2 flex-1 rounded-full transition-all',
                done ? 'bg-emerald-500' : current ? STEP_META[s].cor.replace('bg-', 'bg-') : 'bg-slate-800',
              )}
            />
          </div>
        );
      })}
    </div>
  );
}

function InfoCard({ icon: Icon, label, children }: { icon: typeof MapPin; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />{label}
      </p>
      <div className="text-sm text-slate-200">{children}</div>
    </div>
  );
}
