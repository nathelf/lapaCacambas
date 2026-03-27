import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { StatusFiscalBadge } from '@/components/shared/StatusFiscalBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FileText, AlertCircle, CheckCircle2, Loader2, Download } from 'lucide-react';
import { useCreateNotaFiscal } from '@/hooks/useQuery';
import { toast } from 'sonner';

interface PedidoParaNF {
  id: number;
  numero: string;
  cliente: string;
  clienteId: number;
  valor: number;
  status: string;
  statusFiscal: string;
}

interface EmitirNotaFiscalDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidos: PedidoParaNF[];
  onEmitido: () => void;
}

export function EmitirNotaFiscalDrawer({ open, onOpenChange, pedidos, onEmitido }: EmitirNotaFiscalDrawerProps) {
  const [resultado, setResultado] = useState<'success' | 'error' | null>(null);
  const [serie, setSerie] = useState('1');
  const [observacao, setObservacao] = useState('');
  const [notaGerada, setNotaGerada] = useState<string | null>(null);
  const createNF = useCreateNotaFiscal();

  const pedidosValidos = pedidos.filter(p => p.statusFiscal === 'nao_emitida' || p.statusFiscal === 'erro');
  const pedidosJaEmitidos = pedidos.filter(p => p.statusFiscal === 'emitida');
  const clientesUnicos = [...new Set(pedidos.map(p => p.clienteId))];
  const clienteUnico = clientesUnicos.length === 1;
  const valorTotal = pedidosValidos.reduce((acc, p) => acc + p.valor, 0);

  const podeEmitir = pedidosValidos.length > 0 && clienteUnico && pedidosJaEmitidos.length === 0;

  const handleEmitir = async () => {
    if (!podeEmitir) return;
    setResultado(null);

    try {
      const nfNumero = `NF-${String(Math.floor(Math.random() * 90000) + 10000)}`;
      const nota = {
        numero: nfNumero,
        serie,
        cliente_id: clientesUnicos[0],
        valor_total: valorTotal,
        status: 'emitida',
        data_emissao: new Date().toISOString(),
        observacao_fiscal: observacao || null,
        descricao_servico: 'Locação de caçambas e serviços operacionais',
      };

      await createNF.mutateAsync({ nota, pedidoIds: pedidosValidos.map(p => p.id) });
      setNotaGerada(nfNumero);
      setResultado('success');
      toast.success(`Nota Fiscal ${nfNumero} emitida com sucesso!`);
      onEmitido();
    } catch (err: any) {
      setResultado('error');
      toast.error('Erro ao emitir nota fiscal: ' + (err.message || 'Tente novamente'));
    }
  };

  const handleClose = () => {
    setResultado(null);
    setNotaGerada(null);
    setSerie('1');
    setObservacao('');
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Emitir Nota Fiscal
          </SheetTitle>
          <SheetDescription>
            {pedidos.length === 1
              ? `Emissão de NF-e para o pedido ${pedidos[0]?.numero}`
              : `Emissão de NF-e para ${pedidos.length} pedidos selecionados`}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {pedidosJaEmitidos.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium">Pedidos já faturados:</span>{' '}
                {pedidosJaEmitidos.map(p => p.numero).join(', ')}
              </div>
            </div>
          )}

          {!clienteUnico && pedidos.length > 1 && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium">Clientes diferentes:</span> Para emissão em lote, todos os pedidos devem pertencer ao mesmo cliente.
              </div>
            </div>
          )}

          <div className="bg-muted/50 rounded-lg border">
            <div className="px-4 py-3 border-b">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pedidos selecionados</div>
            </div>
            <div className="divide-y max-h-48 overflow-y-auto">
              {pedidos.map(p => (
                <div key={p.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-medium">{p.numero}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusFiscalBadge status={p.statusFiscal as any} />
                    <span className="tabular-nums font-medium">R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-lg border p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente</span>
              <span className="font-medium">{clienteUnico ? pedidos[0]?.cliente : 'Múltiplos (inválido)'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Qtd. pedidos válidos</span>
              <span className="font-medium">{pedidosValidos.length} de {pedidos.length}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-semibold">Valor total NF-e</span>
              <span className="font-bold text-primary text-base">R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {podeEmitir && !resultado && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Série</Label>
                <Input value={serie} onChange={e => setSerie(e.target.value)} placeholder="1" className="max-w-[100px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Observação</Label>
                <Textarea value={observacao} onChange={e => setObservacao(e.target.value)} rows={2} placeholder="Observações da nota fiscal (opcional)" />
              </div>
            </>
          )}

          {resultado === 'success' && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-[hsl(var(--success))]/10 border border-[hsl(var(--success))]/20">
              <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))] mt-0.5" />
              <div>
                <div className="font-semibold text-sm">Nota Fiscal emitida com sucesso!</div>
                <div className="text-sm text-muted-foreground mt-1">Número: <span className="font-mono font-medium">{notaGerada}</span></div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm"><Download className="w-3.5 h-3.5 mr-1" /> DANFE (PDF)</Button>
                  <Button variant="outline" size="sm"><Download className="w-3.5 h-3.5 mr-1" /> XML</Button>
                </div>
              </div>
            </div>
          )}

          {resultado === 'error' && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <div className="font-semibold text-sm text-destructive">Erro na emissão</div>
                <div className="text-sm text-muted-foreground mt-1">Não foi possível emitir a NF-e. Verifique os dados e tente novamente.</div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {resultado === 'success' ? (
              <Button className="flex-1" onClick={handleClose}>Fechar</Button>
            ) : (
              <>
                <Button variant="outline" className="flex-1" onClick={handleClose} disabled={createNF.isPending}>Cancelar</Button>
                <Button className="flex-1" onClick={handleEmitir} disabled={!podeEmitir || createNF.isPending}>
                  {createNF.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Emitindo...</>
                  ) : resultado === 'error' ? (
                    <><FileText className="w-4 h-4 mr-1" /> Tentar Novamente</>
                  ) : (
                    <><FileText className="w-4 h-4 mr-1" /> Confirmar Emissão</>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
