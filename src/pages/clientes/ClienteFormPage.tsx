import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clienteFormSchema, type ClienteFormData, type ContatoFormData, type ObraFormData } from '@/schemas/clienteSchema';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Plus, Trash2, User, CreditCard, Users, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateCliente, useUpdateCliente, useCliente } from '@/hooks/useQuery';
import { createContato, createObra, createEnderecoEntrega } from '@/lib/api';

const ESTADOS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

const tabs = [
  { id: 'dados',    label: 'Dados Gerais', icon: User },
  { id: 'cobranca', label: 'Cobrança',     icon: CreditCard },
  { id: 'contatos', label: 'Contatos',     icon: Users },
  { id: 'obras',    label: 'Obras / Entregas', icon: Building2 },
] as const;

type TabId = typeof tabs[number]['id'];

function FormField({ label, error, children, required }: { label: string; error?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

export default function ClienteFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const clienteId = id ? Number(id) : undefined;

  const [activeTab, setActiveTab] = useState<TabId>('dados');
  const [contatos, setContatos] = useState<(ContatoFormData & { _id: number })[]>([]);
  const [obras, setObras] = useState<(ObraFormData & { _id: number })[]>([]);
  const [nextId, setNextId] = useState(1);

  const { data: clienteExistente } = useCliente(clienteId);
  const createCliente = useCreateCliente();
  const updateCliente = useUpdateCliente();

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteFormSchema),
    defaultValues: { tipo: 'pj', status: 'ativo' },
    values: clienteExistente ? {
      tipo: (clienteExistente as any).tipo || 'pj',
      nomeCliente: (clienteExistente as any).nome || '',
      fantasia: (clienteExistente as any).fantasia || '',
      cpf: (clienteExistente as any).cpf || '',
      cnpj: (clienteExistente as any).cnpj || '',
      rg: (clienteExistente as any).rg || '',
      telefone: (clienteExistente as any).telefone || '',
      celular: (clienteExistente as any).celular || '',
      fax: (clienteExistente as any).fax || '',
      email: (clienteExistente as any).email || '',
      endereco: (clienteExistente as any).endereco || '',
      numero: (clienteExistente as any).numero || '',
      complemento: (clienteExistente as any).complemento || '',
      cep: (clienteExistente as any).cep || '',
      bairro: (clienteExistente as any).bairro || '',
      cidade: (clienteExistente as any).cidade || '',
      estado: (clienteExistente as any).estado || '',
      status: (clienteExistente as any).status || 'ativo',
      motivo: (clienteExistente as any).motivoBloqueio || '',
      referencia: (clienteExistente as any).referencia || '',
      observacao: (clienteExistente as any).observacao || '',
      enderecoCobranca: (clienteExistente as any).enderecoCobranca || '',
      numeroCobranca: (clienteExistente as any).numeroCobranca || '',
      complementoCobranca: (clienteExistente as any).complementoCobranca || '',
      cepCobranca: (clienteExistente as any).cepCobranca || '',
      bairroCobranca: (clienteExistente as any).bairroCobranca || '',
      cidadeCobranca: (clienteExistente as any).cidadeCobranca || '',
      estadoCobranca: (clienteExistente as any).estadoCobranca || '',
    } : undefined,
  });

  const tipo = watch('tipo');

  const buildPayload = (data: ClienteFormData) => ({
    nome: data.nomeCliente,
    fantasia: data.fantasia || null,
    tipo: data.tipo,
    cpf: data.tipo === 'pf' ? data.cpf || null : null,
    cnpj: data.tipo === 'pj' ? data.cnpj || null : null,
    rg: data.rg || null,
    telefone: data.telefone || null,
    celular: data.celular || null,
    fax: data.fax || null,
    email: data.email || null,
    endereco: data.endereco || null,
    numero: data.numero || null,
    complemento: data.complemento || null,
    cep: data.cep || null,
    bairro: data.bairro || null,
    cidade: data.cidade || null,
    estado: data.estado || null,
    status: data.status,
    motivoBloqueio: data.motivo || null,
    referencia: data.referencia || null,
    observacao: data.observacao || null,
    enderecoCobranca: data.enderecoCobranca || null,
    numeroCobranca: data.numeroCobranca || null,
    complementoCobranca: data.complementoCobranca || null,
    cepCobranca: data.cepCobranca || null,
    bairroCobranca: data.bairroCobranca || null,
    cidadeCobranca: data.cidadeCobranca || null,
    estadoCobranca: data.estadoCobranca || null,
  });

  const onSubmit = async (data: ClienteFormData) => {
    try {
      const payload = buildPayload(data);

      let savedId: number;
      if (isEdit && clienteId) {
        await updateCliente.mutateAsync({ id: clienteId, data: payload });
        savedId = clienteId;
        toast.success('Cliente atualizado com sucesso!');
      } else {
        const novo = await createCliente.mutateAsync(payload);
        savedId = (novo as any).id;

        // Salvar contatos
        for (const c of contatos) {
          if (c.nome.trim()) {
            await createContato({
              cliente_id: savedId,
              nome: c.nome,
              telefone: c.telefone || null,
              celular: c.celular || null,
              email: c.email || null,
              cargo: c.cargo || null,
            });
          }
        }

        // Salvar obras e endereços
        for (const o of obras) {
          if (o.endereco.trim()) {
            const obra = await createObra({
              cliente_id: savedId,
              nome: o.referencia || o.endereco,
              responsavel: o.contato || null,
              telefone: o.telefone || null,
              endereco: o.endereco,
              numero: o.numero || null,
              complemento: o.complemento || null,
              cep: o.cep || null,
              bairro: o.bairro || null,
              cidade: o.cidade || null,
              estado: o.estado || null,
            });
            await createEnderecoEntrega({
              cliente_id: savedId,
              obra_id: (obra as any).id,
              contato: o.contato || null,
              referencia: o.referenciaEntrega || o.referencia || null,
              telefone: o.telefone || null,
              celular: o.celular || null,
              endereco: o.endereco,
              numero: o.numero || null,
              complemento: o.complemento || null,
              cep: o.cep || null,
              bairro: o.bairro || null,
              cidade: o.cidade || null,
              estado: o.estado || null,
            });
          }
        }

        toast.success('Cliente cadastrado com sucesso!');
      }

      navigate('/clientes');
    } catch (err: any) {
      const msg = err?.message || 'Erro ao salvar cliente';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        toast.error('CPF/CNPJ já cadastrado no sistema.');
      } else {
        toast.error(msg);
      }
    }
  };

  const addContato = () => {
    setContatos(prev => [...prev, { _id: nextId, nome: '', telefone: '', celular: '', email: '', cargo: '' }]);
    setNextId(n => n + 1);
  };
  const removeContato = (id: number) => setContatos(prev => prev.filter(c => c._id !== id));
  const updateContato = (id: number, field: keyof ContatoFormData, value: string) =>
    setContatos(prev => prev.map(c => c._id === id ? { ...c, [field]: value } : c));

  const addObra = () => {
    setObras(prev => [...prev, { _id: nextId, contato: '', referencia: '', referenciaEntrega: '', telefone: '', celular: '', endereco: '', numero: '', complemento: '', cep: '', bairro: '', cidade: '', estado: '' }]);
    setNextId(n => n + 1);
  };
  const removeObra = (id: number) => setObras(prev => prev.filter(o => o._id !== id));
  const updateObra = (id: number, field: keyof ObraFormData, value: string) =>
    setObras(prev => prev.map(o => o._id === id ? { ...o, [field]: value } : o));

  const isSaving = isSubmitting || createCliente.isPending || updateCliente.isPending;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title={isEdit ? 'Editar Cliente' : 'Novo Cliente'}
        subtitle={isEdit ? 'Atualize os dados do cliente' : 'Preencha os dados do cliente'}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/clientes')} disabled={isSaving}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
            <Button size="sm" onClick={handleSubmit(onSubmit)} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              {isEdit ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* DADOS GERAIS */}
        {activeTab === 'dados' && (
          <div className="bg-card rounded-lg border p-6 space-y-6">
            <h3 className="text-sm font-semibold border-b pb-2">Identificação</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Tipo" required error={errors.tipo?.message}>
                <select {...register('tipo')} className="w-full h-9 px-3 rounded-md border bg-background text-sm">
                  <option value="pj">Pessoa Jurídica</option>
                  <option value="pf">Pessoa Física</option>
                </select>
              </FormField>
              <FormField label="Nome / Razão Social" required error={errors.nomeCliente?.message}>
                <Input {...register('nomeCliente')} placeholder="Nome completo ou razão social" />
              </FormField>
              <FormField label="Fantasia" error={errors.fantasia?.message}>
                <Input {...register('fantasia')} placeholder="Nome fantasia" />
              </FormField>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {tipo === 'pj' ? (
                <FormField label="CNPJ" error={errors.cnpj?.message}>
                  <Input {...register('cnpj')} placeholder="00.000.000/0000-00" />
                </FormField>
              ) : (
                <FormField label="CPF" error={errors.cpf?.message}>
                  <Input {...register('cpf')} placeholder="000.000.000-00" />
                </FormField>
              )}
              <FormField label="RG" error={errors.rg?.message}>
                <Input {...register('rg')} placeholder="RG" />
              </FormField>
              <FormField label="Referência" error={errors.referencia?.message}>
                <Input {...register('referencia')} placeholder="Referência do cliente" />
              </FormField>
              <FormField label="Status" error={errors.status?.message}>
                <select {...register('status')} className="w-full h-9 px-3 rounded-md border bg-background text-sm">
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="bloqueado">Bloqueado</option>
                </select>
              </FormField>
            </div>

            <h3 className="text-sm font-semibold border-b pb-2 pt-2">Contato</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField label="Telefone" error={errors.telefone?.message}>
                <Input {...register('telefone')} placeholder="(00) 0000-0000" />
              </FormField>
              <FormField label="Celular" error={errors.celular?.message}>
                <Input {...register('celular')} placeholder="(00) 00000-0000" />
              </FormField>
              <FormField label="Fax" error={errors.fax?.message}>
                <Input {...register('fax')} placeholder="(00) 0000-0000" />
              </FormField>
              <FormField label="E-mail" error={errors.email?.message}>
                <Input {...register('email')} type="email" placeholder="email@exemplo.com" />
              </FormField>
            </div>

            <h3 className="text-sm font-semibold border-b pb-2 pt-2">Endereço Principal</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField label="CEP" error={errors.cep?.message}>
                <Input {...register('cep')} placeholder="00000-000" />
              </FormField>
              <div className="md:col-span-2">
                <FormField label="Endereço" error={errors.endereco?.message}>
                  <Input {...register('endereco')} placeholder="Rua, Avenida..." />
                </FormField>
              </div>
              <FormField label="Número" error={errors.numero?.message}>
                <Input {...register('numero')} placeholder="Nº" />
              </FormField>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField label="Complemento" error={errors.complemento?.message}>
                <Input {...register('complemento')} placeholder="Apto, Sala..." />
              </FormField>
              <FormField label="Bairro" error={errors.bairro?.message}>
                <Input {...register('bairro')} placeholder="Bairro" />
              </FormField>
              <FormField label="Cidade" error={errors.cidade?.message}>
                <Input {...register('cidade')} placeholder="Cidade" />
              </FormField>
              <FormField label="Estado" error={errors.estado?.message}>
                <select {...register('estado')} className="w-full h-9 px-3 rounded-md border bg-background text-sm">
                  <option value="">Selecione</option>
                  {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </FormField>
            </div>

            <h3 className="text-sm font-semibold border-b pb-2 pt-2">Observações</h3>
            <FormField label="Motivo (bloqueio/inativação)" error={errors.motivo?.message}>
              <Input {...register('motivo')} placeholder="Motivo, se aplicável" />
            </FormField>
            <FormField label="Observações" error={errors.observacao?.message}>
              <Textarea {...register('observacao')} placeholder="Observações gerais" rows={3} />
            </FormField>
          </div>
        )}

        {/* COBRANÇA */}
        {activeTab === 'cobranca' && (
          <div className="bg-card rounded-lg border p-6 space-y-6">
            <h3 className="text-sm font-semibold border-b pb-2">Endereço de Cobrança</h3>
            <p className="text-xs text-muted-foreground">Preencha apenas se o endereço de cobrança for diferente do endereço principal.</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField label="CEP" error={errors.cepCobranca?.message}>
                <Input {...register('cepCobranca')} placeholder="00000-000" />
              </FormField>
              <div className="md:col-span-2">
                <FormField label="Endereço" error={errors.enderecoCobranca?.message}>
                  <Input {...register('enderecoCobranca')} placeholder="Rua, Avenida..." />
                </FormField>
              </div>
              <FormField label="Número" error={errors.numeroCobranca?.message}>
                <Input {...register('numeroCobranca')} placeholder="Nº" />
              </FormField>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField label="Complemento" error={errors.complementoCobranca?.message}>
                <Input {...register('complementoCobranca')} placeholder="Apto, Sala..." />
              </FormField>
              <FormField label="Bairro" error={errors.bairroCobranca?.message}>
                <Input {...register('bairroCobranca')} placeholder="Bairro" />
              </FormField>
              <FormField label="Cidade" error={errors.cidadeCobranca?.message}>
                <Input {...register('cidadeCobranca')} placeholder="Cidade" />
              </FormField>
              <FormField label="Estado" error={errors.estadoCobranca?.message}>
                <select {...register('estadoCobranca')} className="w-full h-9 px-3 rounded-md border bg-background text-sm">
                  <option value="">Selecione</option>
                  {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </FormField>
            </div>
          </div>
        )}

        {/* CONTATOS */}
        {activeTab === 'contatos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Contatos do Cliente</h3>
              <Button type="button" size="sm" variant="outline" onClick={addContato}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar Contato
              </Button>
            </div>
            {isEdit && (
              <p className="text-xs text-muted-foreground">
                Para editar contatos existentes, acesse os contatos individualmente.
              </p>
            )}
            {contatos.length === 0 && (
              <div className="bg-card rounded-lg border p-8 text-center">
                <Users className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum contato adicionado.</p>
                <Button type="button" size="sm" variant="outline" className="mt-3" onClick={addContato}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar
                </Button>
              </div>
            )}
            {contatos.map((c) => (
              <div key={c._id} className="bg-card rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground">Contato</span>
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeContato(c._id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="md:col-span-2">
                    <Label className="text-xs">Nome *</Label>
                    <Input value={c.nome} onChange={e => updateContato(c._id, 'nome', e.target.value)} placeholder="Nome do contato" />
                  </div>
                  <div>
                    <Label className="text-xs">Telefone</Label>
                    <Input value={c.telefone || ''} onChange={e => updateContato(c._id, 'telefone', e.target.value)} placeholder="(00) 0000-0000" />
                  </div>
                  <div>
                    <Label className="text-xs">Celular</Label>
                    <Input value={c.celular || ''} onChange={e => updateContato(c._id, 'celular', e.target.value)} placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <Label className="text-xs">Cargo</Label>
                    <Input value={c.cargo || ''} onChange={e => updateContato(c._id, 'cargo', e.target.value)} placeholder="Cargo/Função" />
                  </div>
                </div>
                <div className="mt-3">
                  <Label className="text-xs">E-mail</Label>
                  <Input value={c.email || ''} onChange={e => updateContato(c._id, 'email', e.target.value)} placeholder="email@exemplo.com" className="max-w-sm" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* OBRAS */}
        {activeTab === 'obras' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Endereços de Entrega / Obras</h3>
              <Button type="button" size="sm" variant="outline" onClick={addObra}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar Obra
              </Button>
            </div>
            {obras.length === 0 && (
              <div className="bg-card rounded-lg border p-8 text-center">
                <Building2 className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum endereço de entrega cadastrado.</p>
                <Button type="button" size="sm" variant="outline" className="mt-3" onClick={addObra}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar
                </Button>
              </div>
            )}
            {obras.map((o) => (
              <div key={o._id} className="bg-card rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground">Endereço de Entrega</span>
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeObra(o._id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Referência</Label>
                    <Input value={o.referencia || ''} onChange={e => updateObra(o._id, 'referencia', e.target.value)} placeholder="Nome da obra" />
                  </div>
                  <div>
                    <Label className="text-xs">Contato Local</Label>
                    <Input value={o.contato || ''} onChange={e => updateObra(o._id, 'contato', e.target.value)} placeholder="Contato no local" />
                  </div>
                  <div>
                    <Label className="text-xs">Telefone</Label>
                    <Input value={o.telefone || ''} onChange={e => updateObra(o._id, 'telefone', e.target.value)} placeholder="(00) 0000-0000" />
                  </div>
                  <div>
                    <Label className="text-xs">Celular</Label>
                    <Input value={o.celular || ''} onChange={e => updateObra(o._id, 'celular', e.target.value)} placeholder="(00) 00000-0000" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
                  <div>
                    <Label className="text-xs">CEP</Label>
                    <Input value={o.cep || ''} onChange={e => updateObra(o._id, 'cep', e.target.value)} placeholder="00000-000" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Endereço *</Label>
                    <Input value={o.endereco} onChange={e => updateObra(o._id, 'endereco', e.target.value)} placeholder="Rua, Avenida..." />
                  </div>
                  <div>
                    <Label className="text-xs">Número</Label>
                    <Input value={o.numero || ''} onChange={e => updateObra(o._id, 'numero', e.target.value)} placeholder="Nº" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
                  <div>
                    <Label className="text-xs">Complemento</Label>
                    <Input value={o.complemento || ''} onChange={e => updateObra(o._id, 'complemento', e.target.value)} placeholder="Bloco, Galpão..." />
                  </div>
                  <div>
                    <Label className="text-xs">Bairro</Label>
                    <Input value={o.bairro || ''} onChange={e => updateObra(o._id, 'bairro', e.target.value)} placeholder="Bairro" />
                  </div>
                  <div>
                    <Label className="text-xs">Cidade</Label>
                    <Input value={o.cidade || ''} onChange={e => updateObra(o._id, 'cidade', e.target.value)} placeholder="Cidade" />
                  </div>
                  <div>
                    <Label className="text-xs">Estado</Label>
                    <select
                      value={o.estado || ''}
                      onChange={e => updateObra(o._id, 'estado', e.target.value)}
                      className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                    >
                      <option value="">UF</option>
                      {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}
