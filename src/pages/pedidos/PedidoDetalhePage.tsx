import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatusFiscalBadge } from '@/components/shared/StatusFiscalBadge';
import { EmitirNotaFiscalDrawer } from '@/components/pedidos/EmitirNotaFiscalDrawer';
import { EmitirBoletoDrawer } from '@/components/financeiro/EmitirBoletoDrawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Truck, CheckCircle2, Receipt, FileText,
  Clock, Calendar, User, DollarSign, X, Download, AlertCircle, Loader2, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import {
  usePedido, usePedidoHistorico, useUpdatePedidoStatus,
  useMotoristas, useVeiculos, useCreateFatura
} from '@/hooks/useQuery';

type ModalType = 'programar' | 'colocacao' | 'retirada' | 'faturar' | null;

function formatEndereco(e: any): string {
  if (!e) return '—';
  const parts = [e.endereco, e.numero, e.bairro].filter(Boolean).join(', ');
  const cidade = e.cidade && e.estado ? `${e.cidade}/${e.estado}` : (e.cidade || '');
  return [parts, cidade].filter(Boolean).join(' — ');
}

function formatData(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

export default function PedidoDetalhePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const pedidoId = id ? Number(id) : undefined;

  const { data: pedido, isLoading, error } = usePedido(pedidoId);
  const { data: historico = [] } = usePedidoHistorico(pedidoId);
  const { data: motoristas = [] } = useMotoristas();
  const { data: veiculos = [] } = useVeiculos();
  const updateStatus = useUpdatePedidoStatus();
  const createFatura = useCreateFatura();

  const [modal, setModal] = useState<ModalType>(null);
  const [drawerNFOpen, setDrawerNFOpen] = useState(false);
  const [drawerBoletoOpen, setDrawerBoletoOpen] = useState(false);

  // Modal form states
  const [formMotoristaId, setFormMotoristaId] = useState('');
  const [formVeiculoId, setFormVeiculoId] = useState('');
  const [formData, setFormData] = useState('');
  const [formHora, setFormHora] = useState('');
  const [formObs, setFormObs] = useState('');
  const [formAterro, setFormAterro] = useState('');
  const [formTipoPgto, setFormTipoPgto] = useState('');
  const [formVencimento, setFormVencimento] = useState('');
  const [formGerarBoleto, setFormGerarBoleto] = useState(false);
  const [formGerarNF, setFormGerarNF] = useState(false);

  const resetForm = () => {
    setFormMotoristaId(''); setFormVeiculoId(''); setFormData(''); setFormHora('');
    setFormObs(''); setFormAterro(''); setFormTipoPgto(''); setFormVencimento('');
    setFormGerarBoleto(false); setFormGerarNF(false);
  };

  const handleProgramar = async () => {
    if (!formMotoristaId || !formVeiculoId || !formData) {
      toast.error('Preencha: motorista, veículo e data');
      return;
    }
    const motoristaNome = (motoristas as any[]).find((m: any) => m.id === Number(formMotoristaId))?.nome || '';
    const veiculoInfo = (veiculos as any[]).find((v: any) => v.id === Number(formVeiculoId));
    const veiculoLabel = veiculoInfo ? `${veiculoInfo.placa} — ${veiculoInfo.modelo}` : '';
    try {
      await updateStatus.mutateAsync({
        id: pedidoId!,
        status: 'programado',
        obs: `Motorista: ${motoristaNome} — Veículo: ${veiculoLabel}${formObs ? ` — ${formObs}` : ''}`,
        extra: {
          motoristaColocacaoId: Number(formMotoristaId),
          veiculoColocacaoId: Number(formVeiculoId),
          dataProgramada: formData,
          horaProgramada: formHora || null,
        },
      });
      toast.success('Pedido programado!');
      setModal(null); resetForm();
    } catch (e: any) { toast.error(e?.message || 'Erro ao programar'); }
  };

  const handleConfirmarColocacao = async () => {
    if (!formData || !formHora) { toast.error('Data e hora obrigatórios'); return; }
    try {
      await updateStatus.mutateAsync({
        id: pedidoId!,
        status: 'em_execucao',
        obs: `Colocação confirmada${formObs ? ` — ${formObs}` : ''}`,
        extra: { dataColocacao: `${formData}T${formHora}:00`, obsColocacao: formObs || null },
      });
      toast.success('Colocação confirmada!');
      setModal(null); resetForm();
    } catch (e: any) { toast.error(e?.message || 'Erro'); }
  };

  const handleConfirmarRetirada = async () => {
    if (!formData || !formHora) { toast.error('Data e hora obrigatórios'); return; }
    try {
      await updateStatus.mutateAsync({
        id: pedidoId!,
        status: 'concluido',
        obs: `Retirada confirmada${formAterro ? ` — Aterro: ${formAterro}` : ''}${formObs ? ` — ${formObs}` : ''}`,
        extra: { dataRetirada: `${formData}T${formHora}:00`, aterroDestino: formAterro || null },
      });
      toast.success('Retirada confirmada! Pedido concluído.');
      setModal(null); resetForm();
    } catch (e: any) { toast.error(e?.message || 'Erro'); }
  };

  const handleFaturar = async () => {
    if (!formTipoPgto || !formVencimento) {
      toast.error('Forma de pagamento e vencimento obrigatórios');
      return;
    }
    try {
      const fatura = await createFatura.mutateAsync({
        fatura: {
          cliente_id: p.clienteId,
          data_emissao: new Date().toISOString().split('T')[0],
          data_vencimento: formVencimento,
          valor_bruto: Number(p.valorTotal),
          valor_liquido: Number(p.valorTotal),
          forma_cobranca: formTipoPgto,
          observacao: formObs || null,
        },
        pedidoIds: [pedidoId!],
      });
      toast.success(`Pedido faturado! Fatura ${(fatura as any).numero || (fatura as any).id} criada.`);
      setModal(null); resetForm();
    } catch (e: any) { toast.error(e?.message || 'Erro ao faturar'); }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error || !pedido) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle className="w-10 h-10 text-destructive" />
        <p className="text-sm text-muted-foreground">Pedido não encontrado ou erro ao carregar.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/pedidos')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
      </div>
    );
  }

  const p = pedido as any;
  const clienteNome = p.clienteNome || '—';
  const enderecoFormatado = formatEndereco(p.enderecoEntrega);
  const cacambaDesc = p.cacambaDescricao || '—';
  const servicoDesc = p.servicoDescricao || '—';

  const statusActions: Record<string, { label: string; action: ModalType; icon: React.ElementType }[]> = {
    orcamento:    [{ label: 'Programar', action: 'programar', icon: Calendar }],
    programado:   [
      { label: 'Confirmar Colocação', action: 'colocacao', icon: Truck },
      { label: 'Reprogramar', action: 'programar', icon: Calendar },
    ],
    em_rota:      [{ label: 'Confirmar Colocação', action: 'colocacao', icon: Truck }],
    em_execucao:  [{ label: 'Confirmar Retirada', action: 'retirada', icon: CheckCircle2 }],
    concluido:    [{ label: 'Faturar', action: 'faturar', icon: Receipt }],
    faturado:     [],
    cancelado:    [],
  };

  const actions = statusActions[p.status] || [];
  const isMutating = updateStatus.isPending || createFatura.isPending;

  const tiposLocacaoLabel: Record<string, string> = {
    dia: 'Diária', semana: 'Semanal', quinzena: 'Quinzenal', mes: 'Mensal',
  };

  // Montar timeline a partir do histórico real
  const timelineEvents = (historico as any[]).map((h: any, i: number) => {
    const statusMap: Record<string, { label: string; icon: React.ElementType; color: string }> = {
      orcamento:    { label: 'Pedido Criado', icon: Clock, color: 'hsl(var(--muted-foreground))' },
      programado:   { label: 'Pedido Programado', icon: Calendar, color: 'hsl(var(--primary))' },
      em_rota:      { label: 'Em Rota', icon: Truck, color: 'hsl(var(--info))' },
      em_execucao:  { label: 'Caçamba Colocada', icon: Truck, color: 'hsl(var(--info))' },
      concluido:    { label: 'Retirada Confirmada', icon: CheckCircle2, color: 'hsl(var(--success))' },
      faturado:     { label: 'Faturado', icon: Receipt, color: 'hsl(var(--status-faturado))' },
      cancelado:    { label: 'Cancelado', icon: X, color: 'hsl(var(--destructive))' },
    };
    const info = statusMap[h.status_novo] || { label: h.status_novo, icon: Clock, color: 'hsl(var(--muted-foreground))' };
    return {
      id: h.id,
      label: info.label,
      icon: info.icon,
      color: info.color,
      data: new Date(h.created_at).toLocaleDateString('pt-BR'),
      hora: new Date(h.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      usuario: h.profiles?.nome || 'Sistema',
      obs: h.observacao,
    };
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title={`Pedido ${p.numero}`}
        subtitle={`${clienteNome} — ${enderecoFormatado}`}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => navigate('/pedidos')}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
            {actions.map(a => {
              const Icon = a.icon;
              return (
                <Button key={a.label} size="sm" onClick={() => setModal(a.action)} disabled={isMutating}>
                  <Icon className="w-4 h-4 mr-1" /> {a.label}
                </Button>
              );
            })}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info cards */}
        <div className="lg:col-span-2 space-y-4">
          {/* Resumo */}
          <div className="bg-card rounded-lg border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Resumo do Pedido</h3>
              <StatusBadge status={p.status} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs mb-0.5">Cliente</span>
                <span className="font-medium">
                  <button className="hover:underline text-left" onClick={() => navigate(`/clientes/${p.clienteId}`)}>
                    {clienteNome}
                  </button>
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs mb-0.5">Caçamba</span>
                <span className="font-medium">{cacambaDesc}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs mb-0.5">Tipo Locação</span>
                <span className="font-medium">{tiposLocacaoLabel[p.tipoLocacao] || p.tipoLocacao}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs mb-0.5">Quantidade</span>
                <span className="font-medium">{p.quantidade}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs mb-0.5">Valor Total</span>
                <span className="font-bold text-primary">
                  R$ {Number(p.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs mb-0.5">Data Pedido</span>
                <span className="font-medium">{formatData(p.dataPedido)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs mb-0.5">Retirada Prevista</span>
                <span className="font-medium">{formatData(p.dataRetiradaPrevista)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs mb-0.5">Serviço</span>
                <span className="font-medium text-xs">{servicoDesc}</span>
              </div>
            </div>
            {p.observacao && (
              <div className="mt-3 pt-3 border-t text-sm">
                <span className="text-muted-foreground text-xs">Obs:</span> {p.observacao}
              </div>
            )}
          </div>

          {/* Endereço de Entrega */}
          <div className="bg-card rounded-lg border p-5">
            <h3 className="text-sm font-semibold mb-3">Endereço de Entrega</h3>
            <p className="text-sm">{enderecoFormatado}</p>
            {p.enderecoEntrega?.contato && (
              <p className="text-xs text-muted-foreground mt-1">Contato: {p.enderecoEntrega.contato}</p>
            )}
            {p.enderecoEntrega?.referencia && (
              <p className="text-xs text-muted-foreground">Referência: {p.enderecoEntrega.referencia}</p>
            )}
          </div>

          {/* Status flow visual */}
          <div className="bg-card rounded-lg border p-5">
            <h3 className="text-sm font-semibold mb-4">Fluxo do Pedido</h3>
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {['orcamento', 'programado', 'em_rota', 'em_execucao', 'concluido', 'faturado'].map((s, i, arr) => {
                const reached = arr.indexOf(p.status) >= i;
                const isCurrent = p.status === s;
                const labels: Record<string, string> = {
                  orcamento: 'Orçamento', programado: 'Programado', em_rota: 'Em Rota',
                  em_execucao: 'Execução', concluido: 'Concluído', faturado: 'Faturado',
                };
                return (
                  <div key={s} className="flex items-center gap-1">
                    <div className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      isCurrent ? 'bg-primary text-primary-foreground shadow-sm' :
                      reached ? 'bg-primary/10 text-primary' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {labels[s]}
                    </div>
                    {i < arr.length - 1 && <div className={`w-6 h-0.5 ${reached ? 'bg-primary' : 'bg-border'}`} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fiscal section */}
          <div className="bg-card rounded-lg border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Informações Fiscais
              </h3>
              <StatusFiscalBadge status={p.statusFiscal} />
            </div>

            {p.statusFiscal === 'emitida' && p.notaFiscalId ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  NF-e vinculada ao pedido. Acesse o módulo Fiscal para detalhes.
                </p>
                <div className="flex gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={() => navigate('/fiscal')}>
                    <FileText className="w-3.5 h-3.5 mr-1" /> Ver NF-e
                  </Button>
                </div>
              </div>
            ) : p.statusFiscal === 'erro' ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Erro na emissão da NF-e. Verifique os dados e tente novamente.</span>
                </div>
                <Button size="sm" onClick={() => setDrawerNFOpen(true)}>
                  <FileText className="w-4 h-4 mr-1" /> Tentar Novamente
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {p.status === 'faturado' || p.status === 'concluido'
                    ? 'Pedido pronto para emissão de nota fiscal.'
                    : 'A nota fiscal poderá ser emitida após o faturamento.'}
                </p>
                {(p.status === 'faturado' || p.status === 'concluido') && (
                  <Button size="sm" variant="outline" onClick={() => setDrawerNFOpen(true)}>
                    <FileText className="w-4 h-4 mr-1" /> Emitir Nota Fiscal
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Financeiro / Boletos */}
          <div className="bg-card rounded-lg border p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                Financeiro e Cobrança
              </h3>
              <span className="text-xs text-muted-foreground">aberto</span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fatura vinculada</span>
                <span className="font-mono text-xs">
                  {p.faturas_vinculadas?.[0]?.faturas?.numero || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Boletos vinculados</span>
                <span className="font-medium">{(p.boletos_vinculados || []).length}</span>
              </div>
              {(p.boletos_vinculados || []).length > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex flex-wrap gap-2">
                    {(p.boletos_vinculados || []).slice(0, 3).map((b: any) => (
                      <span key={b.id} className="text-xs font-mono bg-muted px-2 py-1 rounded">
                        {b.nosso_numero || `#${b.id}`} - {b.status}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {p.status !== 'cancelado' && (
              <div className="flex gap-2 pt-3 mt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDrawerBoletoOpen(true)}
                  disabled={!(p.status === 'faturado' || p.status === 'concluido')}
                >
                  <DollarSign className="w-4 h-4 mr-1" /> Emitir Boleto
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/financeiro/boletos')}>
                  Ver Boletos
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-card rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">Timeline</h3>
          {timelineEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem histórico disponível.</p>
          ) : (
            <div className="space-y-0">
              {timelineEvents.map((ev, i) => {
                const Icon = ev.icon;
                return (
                  <div key={ev.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: `${ev.color}15`, color: ev.color }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      {i < timelineEvents.length - 1 && <div className="w-0.5 flex-1 bg-border my-1" />}
                    </div>
                    <div className="pb-4">
                      <div className="text-sm font-medium">{ev.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {ev.data} às {ev.hora} — {ev.usuario}
                      </div>
                      {ev.obs && <div className="text-xs text-muted-foreground mt-0.5">{ev.obs}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 animate-fade-in"
          onClick={() => { setModal(null); resetForm(); }}
        >
          <div
            className="bg-card rounded-lg border shadow-xl w-full max-w-lg p-6 space-y-4 animate-fade-in-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">
                {modal === 'programar' && 'Programar Pedido'}
                {modal === 'colocacao' && 'Confirmar Colocação'}
                {modal === 'retirada' && 'Confirmar Retirada'}
                {modal === 'faturar' && 'Faturar Pedido'}
              </h3>
              <button
                onClick={() => { setModal(null); resetForm(); }}
                className="p-1 rounded hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modal === 'programar' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Motorista *</Label>
                  <select
                    value={formMotoristaId}
                    onChange={e => setFormMotoristaId(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                  >
                    <option value="">Selecione</option>
                    {(motoristas as any[]).map((m: any) => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Veículo *</Label>
                  <select
                    value={formVeiculoId}
                    onChange={e => setFormVeiculoId(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                  >
                    <option value="">Selecione</option>
                    {(veiculos as any[]).map((v: any) => (
                      <option key={v.id} value={v.id}>{v.placa} — {v.modelo}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Data *</Label>
                    <Input type="date" value={formData} onChange={e => setFormData(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Hora</Label>
                    <Input type="time" value={formHora} onChange={e => setFormHora(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Observação</Label>
                  <Textarea value={formObs} onChange={e => setFormObs(e.target.value)} rows={2} />
                </div>
                <Button className="w-full" onClick={handleProgramar} disabled={isMutating}>
                  {isMutating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Calendar className="w-4 h-4 mr-1" />}
                  Programar
                </Button>
              </>
            )}

            {modal === 'colocacao' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Data Colocação *</Label>
                    <Input type="date" value={formData} onChange={e => setFormData(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Hora *</Label>
                    <Input type="time" value={formHora} onChange={e => setFormHora(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Observação</Label>
                  <Textarea value={formObs} onChange={e => setFormObs(e.target.value)} rows={2} />
                </div>
                <Button className="w-full" onClick={handleConfirmarColocacao} disabled={isMutating}>
                  {isMutating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Truck className="w-4 h-4 mr-1" />}
                  Confirmar Colocação
                </Button>
              </>
            )}

            {modal === 'retirada' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Data Retirada *</Label>
                    <Input type="date" value={formData} onChange={e => setFormData(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Hora *</Label>
                    <Input type="time" value={formHora} onChange={e => setFormHora(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Aterro / Destino</Label>
                  <Input
                    value={formAterro}
                    onChange={e => setFormAterro(e.target.value)}
                    placeholder="Nome do aterro ou destino dos resíduos"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Observação</Label>
                  <Textarea value={formObs} onChange={e => setFormObs(e.target.value)} rows={2} />
                </div>
                <Button className="w-full" onClick={handleConfirmarRetirada} disabled={isMutating}>
                  {isMutating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                  Confirmar Retirada
                </Button>
              </>
            )}

            {modal === 'faturar' && (
              <>
                <div className="bg-muted/50 rounded-md p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pedido</span>
                    <span className="font-medium">{p.numero}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cliente</span>
                    <span className="font-medium">{clienteNome}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="font-semibold">Valor</span>
                    <span className="font-bold text-primary">
                      R$ {Number(p.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Forma de Pagamento *</Label>
                  <select
                    value={formTipoPgto}
                    onChange={e => setFormTipoPgto(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                  >
                    <option value="">Selecione</option>
                    <option value="boleto">Boleto</option>
                    <option value="transferencia">Transferência</option>
                    <option value="pix">PIX</option>
                    <option value="cartao">Cartão</option>
                    <option value="dinheiro">Dinheiro</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Data de Vencimento *</Label>
                  <Input type="date" value={formVencimento} onChange={e => setFormVencimento(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Observação</Label>
                  <Textarea value={formObs} onChange={e => setFormObs(e.target.value)} rows={2} />
                </div>
                <Button className="w-full" onClick={handleFaturar} disabled={isMutating}>
                  {isMutating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Receipt className="w-4 h-4 mr-1" />}
                  Faturar Pedido
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Drawer NF */}
      <EmitirNotaFiscalDrawer
        open={drawerNFOpen}
        onOpenChange={setDrawerNFOpen}
        pedidos={[{
          id: p.id,
          numero: p.numero,
          cliente: clienteNome,
          clienteId: p.clienteId,
          valor: Number(p.valorTotal),
          status: p.status,
          statusFiscal: p.statusFiscal,
        }]}
        onEmitido={() => {
          // Pedido é atualizado via react-query invalidation no hook
        }}
      />

      <EmitirBoletoDrawer
        open={drawerBoletoOpen}
        onOpenChange={setDrawerBoletoOpen}
        pedidoId={p.id}
        faturaId={p.faturas_vinculadas?.[0]?.faturas?.id}
        prefill={{
          clienteId: p.clienteId,
          clienteNome,
          valor: Number(p.valorTotal || 0),
          descricao: `Referente ao pedido ${p.numero}`,
        }}
      />
    </div>
  );
}
