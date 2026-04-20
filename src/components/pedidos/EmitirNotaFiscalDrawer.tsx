import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StatusFiscalBadge } from '@/components/shared/StatusFiscalBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FileText, AlertCircle, CheckCircle2, Loader2, Download, Info } from 'lucide-react';
import { useEmitirNotaFiscal } from '@/hooks/useQuery';
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
  const [observacao, setObservacao] = useState('');
  const [notaGerada, setNotaGerada] = useState<{ numero: string | null; pdfUrl: string | null; xmlUrl: string | null } | null>(null);
  const [validationErros, setValidationErros] = useState<Array<{ code: string; message: string }>>([]);
  const [validationAlertas, setValidationAlertas] = useState<string[]>([]);

  const emitir = useEmitirNotaFiscal();

  const pedidosValidos = pedidos.filter(
    (p) => ['concluido', 'faturado'].includes(p.status) && p.statusFiscal !== 'emitida',
  );
  const pedidosJaEmitidos = pedidos.filter((p) => p.statusFiscal === 'emitida');
  const clientesUnicos = [...new Set(pedidos.map((p) => p.clienteId))];
  const clienteUnico = clientesUnicos.length === 1;
  const valorTotal = pedidosValidos.reduce((acc, p) => acc + p.valor, 0);

  const podeEmitir =
    pedidosValidos.length > 0 && clienteUnico && pedidosJaEmitidos.length === 0 && resultado !== 'success';

  const handleEmitir = async () => {
    if (!podeEmitir || emitir.isPending) return;
    setResultado(null);
    setValidationErros([]);
    setValidationAlertas([]);

    try {
      const result = await emitir.mutateAsync({
        pedidoIds: pedidosValidos.map((p) => p.id),
        observacoesFiscais: observacao.trim() || null,
      });

      // Capturar alertas mesmo em sucesso
      if (result.validation?.alertas?.length) {
        setValidationAlertas(result.validation.alertas);
      }

      setNotaGerada({
        numero: result.nota?.numero || result.nota?.numero_nota || null,
        pdfUrl: result.nota?.pdf_url || null,
        xmlUrl: result.nota?.xml_url || null,
      });
      setResultado('success');
      toast.success(
        result.idempotent
          ? 'Nota fiscal recuperada (já emitida anteriormente)'
          : `NF-e emitida com sucesso${result.nota?.numero ? ` — ${result.nota.numero}` : ''}`,
      );
      onEmitido();
    } catch (err: any) {
      setResultado('error');
      // Validation errors from backend
      if (err?.validation?.erros?.length) {
        setValidationErros(err.validation.erros);
      }
      const msg = err?.message || 'Não foi possível emitir a NF-e.';
      toast.error(msg);
    }
  };

  const handleClose = () => {
    if (emitir.isPending) return;
    setResultado(null);
    setNotaGerada(null);
    setObservacao('');
    setValidationErros([]);
    setValidationAlertas([]);
    emitir.reset();
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
              : `Emissão de NF-e para ${pedidos.length} pedido${pedidos.length > 1 ? 's' : ''} selecionado${pedidos.length > 1 ? 's' : ''}`}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Alertas bloqueantes */}
          {pedidosJaEmitidos.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium">Pedidos já faturados:</span>{' '}
                {pedidosJaEmitidos.map((p) => p.numero).join(', ')}
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

          {/* Erros de validação retornados pelo backend */}
          {validationErros.length > 0 && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 space-y-1.5">
              <div className="flex items-center gap-1.5 text-destructive font-semibold text-sm">
                <AlertCircle className="w-4 h-4" /> Erros de validação
              </div>
              <ul className="text-sm text-destructive/80 space-y-1 list-none pl-1">
                {validationErros.map((e, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-destructive/50 mt-0.5">·</span>
                    <span>{e.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Alertas não-bloqueantes */}
          {validationAlertas.length > 0 && resultado !== 'error' && (
            <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-600 font-semibold text-sm">
                <Info className="w-4 h-4" /> Atenção
              </div>
              {validationAlertas.map((a, i) => (
                <p key={i} className="text-sm text-amber-600/80">{a}</p>
              ))}
            </div>
          )}

          {/* Lista de pedidos */}
          <div className="bg-muted/50 rounded-lg border">
            <div className="px-4 py-3 border-b">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pedidos selecionados</div>
            </div>
            <div className="divide-y max-h-48 overflow-y-auto">
              {pedidos.map((p) => (
                <div key={p.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-medium">{p.numero}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusFiscalBadge status={p.statusFiscal as any} />
                    <span className="tabular-nums font-medium">
                      R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumo */}
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
              <span className="font-bold text-primary text-base">
                R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Observações (só quando apto e não emitida) */}
          {podeEmitir && (
            <div className="space-y-1.5">
              <Label className="text-xs">Observação fiscal (opcional)</Label>
              <Textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                rows={2}
                maxLength={2000}
                placeholder="Observações da nota fiscal (máx. 2000 caracteres)"
                disabled={emitir.isPending}
              />
            </div>
          )}

          {/* Sucesso */}
          {resultado === 'success' && notaGerada && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-[hsl(var(--success))]/10 border border-[hsl(var(--success))]/20">
              <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-sm">Nota Fiscal emitida com sucesso!</div>
                {notaGerada.numero && (
                  <div className="text-sm text-muted-foreground mt-1">
                    Número: <span className="font-mono font-medium">{notaGerada.numero}</span>
                  </div>
                )}
                {(notaGerada.pdfUrl || notaGerada.xmlUrl) && (
                  <div className="flex gap-2 mt-3">
                    {notaGerada.pdfUrl && (
                      <a href={notaGerada.pdfUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Download className="w-3.5 h-3.5 mr-1" /> DANFE (PDF)
                        </Button>
                      </a>
                    )}
                    {notaGerada.xmlUrl && (
                      <a href={notaGerada.xmlUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Download className="w-3.5 h-3.5 mr-1" /> XML
                        </Button>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex gap-2 pt-2">
            {resultado === 'success' ? (
              <Button className="flex-1" onClick={handleClose}>Fechar</Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                  disabled={emitir.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleEmitir}
                  disabled={!podeEmitir || emitir.isPending}
                >
                  {emitir.isPending ? (
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
