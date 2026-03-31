import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ArrowLeft, Save, Loader2, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useClientesLookup, useEnderecosEntrega, useCacambas, useCreatePedido } from '@/hooks/useQuery';

const tiposLocacao = [
  { value: 'dia',      label: 'Diária',    priceKey: 'preco_dia' },
  { value: 'semana',   label: 'Semanal',   priceKey: 'preco_semana' },
  { value: 'quinzena', label: 'Quinzenal', priceKey: 'preco_quinzena' },
  { value: 'mes',      label: 'Mensal',    priceKey: 'preco_mes' },
] as const;

export default function PedidoFormPage() {
  const navigate = useNavigate();

  const [clienteId, setClienteId] = useState<number | ''>('');
  const [clienteOpen, setClienteOpen] = useState(false);
  const [clienteBusca, setClienteBusca] = useState('');
  const [clienteBuscaDebounced, setClienteBuscaDebounced] = useState('');
  const [enderecoId, setEnderecoId] = useState<number | ''>('');
  const [cacambaId, setCacambaId] = useState<number | ''>('');
  const [tipoLocacao, setTipoLocacao] = useState<string>('dia');
  const [quantidade, setQuantidade] = useState(1);
  const [valor, setValor] = useState(0);
  const [dataDesejada, setDataDesejada] = useState('');
  const [dataRetPrev, setDataRetPrev] = useState('');
  const [obs, setObs] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setClienteBuscaDebounced(clienteBusca), 300);
    return () => clearTimeout(t);
  }, [clienteBusca]);

  const buscaAtiva = clienteBuscaDebounced.length >= 3 ? clienteBuscaDebounced : undefined;
  const { data: clientes = [], isLoading: loadingClientes } = useClientesLookup(buscaAtiva);
  const { data: enderecos = [], isLoading: loadingEnderecos } = useEnderecosEntrega(
    clienteId ? Number(clienteId) : undefined
  );
  const { data: cacambas = [], isLoading: loadingCacambas } = useCacambas();
  const createPedido = useCreatePedido();

  const cacambaSel = (cacambas as any[]).find((c: any) => c.id === cacambaId);

  // Recalcular valor quando muda caçamba ou tipo de locação
  useEffect(() => {
    if (cacambaSel) {
      const tipo = tiposLocacao.find(t => t.value === tipoLocacao);
      const preco = cacambaSel[tipo?.priceKey || 'preco_dia'] || 0;
      setValor(preco * quantidade);
    }
  }, [cacambaId, tipoLocacao, quantidade]);

  // Limpar endereço quando trocar cliente
  useEffect(() => {
    setEnderecoId('');
  }, [clienteId]);

  const handleSave = async () => {
    if (!clienteId) { toast.error('Selecione o cliente'); return; }
    if (!enderecoId) { toast.error('Selecione o endereço de entrega'); return; }
    if (!cacambaId) { toast.error('Selecione o tipo de caçamba'); return; }

    try {
      await createPedido.mutateAsync({
        clienteId: Number(clienteId),
        enderecoEntregaId: Number(enderecoId),
        cacambaId: Number(cacambaId),
        tipo: 'entrega_cacamba',
        tipoLocacao: tipoLocacao,
        quantidade,
        valorUnitario: valor / (quantidade || 1),
        valorDesconto: 0,
        dataDesejada: dataDesejada || undefined,
        dataRetiradaPrevista: dataRetPrev || undefined,
        observacao: obs || undefined,
      });
      toast.success('Pedido criado com sucesso!');
      navigate('/pedidos');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar pedido');
    }
  };

  const clienteSelecionado = (clientes as any[]).find((c: any) => c.id === clienteId);
  const isSaving = createPedido.isPending;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Novo Pedido"
        subtitle="Abertura de pedido de locação"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/pedidos')} disabled={isSaving}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Salvar
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <h3 className="text-sm font-semibold border-b pb-2">Dados do Pedido</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Cliente <span className="text-destructive">*</span></Label>
                <Popover open={clienteOpen} onOpenChange={setClienteOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full h-9 justify-between font-normal"
                      disabled={loadingClientes}
                    >
                      <span className="truncate">
                        {clienteId
                          ? (clientes as any[]).find((c: any) => c.id === clienteId)
                              ? (() => { const c = (clientes as any[]).find((c: any) => c.id === clienteId); return c.fantasia ? `${c.fantasia} — ${c.nome}` : c.nome; })()
                              : 'Carregando...'
                          : loadingClientes ? 'Carregando...' : 'Selecione o cliente'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Digite 3 letras para buscar..."
                        value={clienteBusca}
                        onValueChange={setClienteBusca}
                      />
                      <CommandList>
                        <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                        <CommandGroup>
                          {(clientes as any[]).map((c: any) => (
                              <CommandItem
                                key={c.id}
                                value={String(c.id)}
                                onSelect={() => {
                                  setClienteId(c.id);
                                  setClienteBusca('');
                                  setClienteOpen(false);
                                }}
                              >
                                <Check className={cn('mr-2 h-4 w-4', clienteId === c.id ? 'opacity-100' : 'opacity-0')} />
                                <span>{c.fantasia ? `${c.fantasia} — ` : ''}{c.nome}</span>
                                <span className="ml-2 text-xs text-muted-foreground">{c.cpf ?? c.cnpj ?? ''}</span>
                              </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Endereço de Entrega <span className="text-destructive">*</span></Label>
                <select
                  value={enderecoId}
                  onChange={e => setEnderecoId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                  disabled={!clienteId || loadingEnderecos}
                >
                  <option value="">
                    {!clienteId ? 'Selecione o cliente primeiro' :
                     loadingEnderecos ? 'Carregando...' :
                     (enderecos as any[]).length === 0 ? 'Nenhum endereço cadastrado' :
                     'Selecione o endereço'}
                  </option>
                  {(enderecos as any[]).map((e: any) => (
                    <option key={e.id} value={e.id}>
                      {e.referencia ? `${e.referencia} — ` : ''}{e.endereco}{e.numero ? `, ${e.numero}` : ''}{e.bairro ? ` - ${e.bairro}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tipo de Caçamba <span className="text-destructive">*</span></Label>
                <select
                  value={cacambaId}
                  onChange={e => setCacambaId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                  disabled={loadingCacambas}
                >
                  <option value="">
                    {loadingCacambas ? 'Carregando...' : 'Selecione'}
                  </option>
                  {(cacambas as any[]).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.descricao}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tipo de Locação</Label>
                <select
                  value={tipoLocacao}
                  onChange={e => setTipoLocacao(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                >
                  {tiposLocacao.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Quantidade</Label>
                <Input
                  type="number"
                  min={1}
                  value={quantidade}
                  onChange={e => setQuantidade(Math.max(1, Number(e.target.value)))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Valor Total (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={valor}
                  onChange={e => setValor(Number(e.target.value))}
                />
                {cacambaSel && (
                  <p className="text-[11px] text-muted-foreground">
                    Tabela: R$ {Number(cacambaSel[tiposLocacao.find(t => t.value === tipoLocacao)?.priceKey || 'preco_dia'] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / unidade
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Data Desejada</Label>
                <Input type="date" value={dataDesejada} onChange={e => setDataDesejada(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Previsão de Retirada</Label>
                <Input type="date" value={dataRetPrev} onChange={e => setDataRetPrev(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Observações</Label>
              <Textarea
                value={obs}
                onChange={e => setObs(e.target.value)}
                placeholder="Observações do pedido (janela de atendimento, instruções especiais...)"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Sidebar summary */}
        <div className="space-y-4">
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-sm font-semibold mb-3">Resumo</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente</span>
                <span className="font-medium text-right max-w-[180px] truncate">
                  {clienteSelecionado?.fantasia || clienteSelecionado?.nome || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Caçamba</span>
                <span className="font-medium">{cacambaSel?.descricao || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Locação</span>
                <span className="font-medium">
                  {tiposLocacao.find(t => t.value === tipoLocacao)?.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Qtde</span>
                <span className="font-medium">{quantidade}</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-primary">
                  R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {cacambaSel && (
            <div className="bg-muted/30 rounded-lg border p-4">
              <h3 className="text-xs font-semibold mb-2 text-muted-foreground">Tabela de Preços</h3>
              <div className="space-y-1.5 text-xs">
                {tiposLocacao.map(t => (
                  <div key={t.value} className="flex justify-between">
                    <span className="text-muted-foreground">{t.label}</span>
                    <span className={tipoLocacao === t.value ? 'font-bold text-primary' : ''}>
                      R$ {Number(cacambaSel[t.priceKey] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
