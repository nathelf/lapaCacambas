import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, CreditCard, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateBoleto, useClientes, useFaturas } from '@/hooks/useQuery';
import { checkBoletoDuplicado } from '@/lib/api';

interface EmitirBoletoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pré-preencher a partir de uma fatura */
  faturaId?: number;
  /** Pré-preencher a partir de um pedido */
  pedidoId?: number;
  /** Pré-preencher a partir de dados da fatura/pedido */
  prefill?: {
    clienteId?: number;
    clienteNome?: string;
    valor?: number;
    descricao?: string;
  };
  onEmitido?: (boletoId: number) => void;
}

export function EmitirBoletoDrawer({
  open,
  onOpenChange,
  faturaId,
  pedidoId,
  prefill,
  onEmitido,
}: EmitirBoletoDrawerProps) {
  const createBoleto = useCreateBoleto();
  const { data: clientes = [] } = useClientes();
  const { data: faturas = [] } = useFaturas();

  // Form state
  const [clienteId, setClienteId] = useState('');
  const [faturaIdSel, setFaturaIdSel] = useState('');
  const [banco, setBanco] = useState('');
  const [valor, setValor] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valorMulta, setValorMulta] = useState('0');
  const [valorJuros, setValorJuros] = useState('0');
  const [instrucoes, setInstrucoes] = useState('');
  const [obs, setObs] = useState('');

  const [emitido, setEmitido] = useState(false);
  const [boletoGerado, setBoletoGerado] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [dupError, setDupError] = useState('');

  // Pré-preencher ao abrir
  useEffect(() => {
    if (!open) { resetForm(); return; }
    if (prefill?.clienteId) setClienteId(String(prefill.clienteId));
    if (prefill?.valor) setValor(String(prefill.valor));
    if (prefill?.descricao) setDescricao(prefill.descricao);
    if (faturaId) setFaturaIdSel(String(faturaId));
  }, [open]);

  const resetForm = () => {
    setClienteId(''); setFaturaIdSel(''); setBanco(''); setValor('');
    setVencimento(''); setDescricao(''); setValorMulta('0'); setValorJuros('0');
    setInstrucoes(''); setObs(''); setEmitido(false); setBoletoGerado(null); setDupError('');
  };

  // Preencher valor automaticamente a partir da fatura selecionada
  useEffect(() => {
    if (!faturaIdSel) return;
    const fat = (faturas as any[]).find((f: any) => f.id === Number(faturaIdSel));
    if (fat) {
      setClienteId(String(fat.cliente_id));
      setValor(String(fat.valor_liquido || fat.valor_bruto || ''));
      setDescricao(`Referente à fatura ${fat.numero}`);
    }
  }, [faturaIdSel]);

  const handleEmitir = async () => {
    if (!clienteId) { toast.error('Selecione o cliente'); return; }
    if (!valor || Number(valor) <= 0) { toast.error('Informe o valor'); return; }
    if (!vencimento) { toast.error('Informe o vencimento'); return; }

    // Checar duplicidade
    setChecking(true);
    setDupError('');
    try {
      const dup = await checkBoletoDuplicado(
        faturaIdSel ? Number(faturaIdSel) : undefined,
        pedidoId,
      );
      if (dup) {
        setDupError(
          'Já existe um boleto ativo para este registro. ' +
          'Cancele o anterior antes de gerar um novo.'
        );
        setChecking(false);
        return;
      }
    } catch {
      // Ignorar erro de verificação, prosseguir com emissão
    }
    setChecking(false);

    try {
      const data = await createBoleto.mutateAsync({
        cliente_id: Number(clienteId),
        fatura_id: faturaIdSel ? Number(faturaIdSel) : null,
        pedido_id: pedidoId || null,
        banco: banco || null,
        data_vencimento: vencimento,
        valor: Number(valor),
        valor_multa: Number(valorMulta) || 0,
        valor_juros: Number(valorJuros) || 0,
        descricao: descricao || null,
        observacao: [instrucoes, obs].filter(Boolean).join(' | ') || null,
      });

      setBoletoGerado(data);
      setEmitido(true);
      toast.success('Boleto emitido com sucesso!');
      onEmitido?.((data as any).id);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao emitir boleto');
    }
  };

  if (!open) return null;

  const clienteNome = (clientes as any[]).find((c: any) => c.id === Number(clienteId))?.nome || '';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-foreground/30" onClick={() => onOpenChange(false)} />
      <div className="relative bg-card w-full max-w-md h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">Emitir Boleto</h2>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-1 rounded hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {emitido && boletoGerado ? (
            // Estado de sucesso
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
                <h3 className="font-semibold">Boleto emitido!</h3>
                <p className="text-sm text-muted-foreground">
                  O boleto foi emitido no banco com sucesso.
                </p>
              </div>

              <div className="bg-muted/40 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="font-medium">{clienteNome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-bold text-primary">
                    R$ {Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vencimento</span>
                  <span className="font-medium">
                    {new Date(vencimento).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium text-success">Emitido</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Linha digitável e PDF já retornam via integração bancária no backend.
                Acesse o módulo Financeiro &rarr; Boletos para acompanhar.
              </p>
            </div>
          ) : (
            // Formulário
            <>
              {/* Fatura vinculada (opcional) */}
              {!faturaId && !pedidoId && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Vincular à Fatura (opcional)</Label>
                  <select
                    value={faturaIdSel}
                    onChange={e => setFaturaIdSel(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                  >
                    <option value="">Sem vínculo com fatura</option>
                    {(faturas as any[]).filter((f: any) => f.status === 'aberta').map((f: any) => (
                      <option key={f.id} value={f.id}>
                        {f.numero} — {(f as any).clientes?.nome} — R$ {Number(f.valor_liquido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {faturaId && (
                <div className="bg-muted/40 rounded-md p-3 text-xs">
                  <span className="text-muted-foreground">Boleto vinculado à fatura: </span>
                  <span className="font-medium">
                    {(faturas as any[]).find((f: any) => f.id === faturaId)?.numero || `ID ${faturaId}`}
                  </span>
                </div>
              )}

              {pedidoId && (
                <div className="bg-muted/40 rounded-md p-3 text-xs">
                  <span className="text-muted-foreground">Boleto vinculado ao pedido ID: </span>
                  <span className="font-medium">{pedidoId}</span>
                </div>
              )}

              {/* Cliente */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Cliente <span className="text-destructive">*</span></Label>
                <select
                  value={clienteId}
                  onChange={e => setClienteId(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                  disabled={!!faturaIdSel || !!prefill?.clienteId}
                >
                  <option value="">Selecione o cliente</option>
                  {(clientes as any[]).filter((c: any) => c.status !== 'bloqueado').map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              {/* Banco */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Banco Emissor</Label>
                <select
                  value={banco}
                  onChange={e => setBanco(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                >
                  <option value="">Selecione o banco</option>
                  <option value="Itaú">Itaú (341)</option>
                  <option value="Bradesco">Bradesco (237)</option>
                  <option value="Santander">Santander (033)</option>
                  <option value="Banco do Brasil">Banco do Brasil (001)</option>
                  <option value="Caixa Econômica">Caixa Econômica (104)</option>
                  <option value="Sicoob">Sicoob (756)</option>
                  <option value="Sicredi">Sicredi (748)</option>
                </select>
              </div>

              {/* Valor e Vencimento */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Valor (R$) <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0.01}
                    value={valor}
                    onChange={e => setValor(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Vencimento <span className="text-destructive">*</span></Label>
                  <Input
                    type="date"
                    value={vencimento}
                    onChange={e => setVencimento(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              {/* Juros e Multa */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Multa (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={valorMulta}
                    onChange={e => setValorMulta(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Juros/dia (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={valorJuros}
                    onChange={e => setValorJuros(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Descrição / Histórico</Label>
                <Input
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Ex: Locação de caçamba ref. PED-2026-0001"
                />
              </div>

              {/* Instruções */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Instruções ao Banco</Label>
                <Textarea
                  value={instrucoes}
                  onChange={e => setInstrucoes(e.target.value)}
                  placeholder="Instruções de protesto, prazo de pagamento após vencimento..."
                  rows={2}
                />
              </div>

              {/* Observações */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Observações Internas</Label>
                <Textarea
                  value={obs}
                  onChange={e => setObs(e.target.value)}
                  placeholder="Observações que não aparecerão no boleto"
                  rows={2}
                />
              </div>

              {/* Erro de duplicidade */}
              {dupError && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-xs">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{dupError}</span>
                </div>
              )}

              {/* Resumo */}
              {clienteId && valor && vencimento && (
                <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-1">
                  <div className="font-semibold text-sm mb-2">Resumo do Boleto</div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sacado</span>
                    <span className="font-medium">{clienteNome}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor principal</span>
                    <span>R$ {Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {Number(valorMulta) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Multa</span>
                      <span>R$ {Number(valorMulta).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1 mt-1">
                    <span className="font-semibold">Vencimento</span>
                    <span className="font-bold text-primary">
                      {new Date(vencimento).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex-shrink-0 flex gap-3">
          {emitido ? (
            <Button className="flex-1" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          ) : (
            <>
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleEmitir}
                disabled={createBoleto.isPending || checking}
              >
                {(createBoleto.isPending || checking)
                  ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  : <CreditCard className="w-4 h-4 mr-2" />
                }
                {checking ? 'Verificando...' : 'Emitir Boleto'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
