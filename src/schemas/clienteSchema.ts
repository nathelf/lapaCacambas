import { z } from 'zod';

export const clienteDadosSchema = z.object({
  nomeCliente: z.string().trim().min(3, 'Nome deve ter pelo menos 3 caracteres').max(200),
  fantasia: z.string().trim().max(200).optional().or(z.literal('')),
  tipo: z.enum(['pf', 'pj'], { required_error: 'Selecione o tipo' }),
  cpf: z.string().trim().max(14).optional().or(z.literal('')),
  cnpj: z.string().trim().max(18).optional().or(z.literal('')),
  rg: z.string().trim().max(20).optional().or(z.literal('')),
  telefone: z.string().trim().max(15).optional().or(z.literal('')),
  fax: z.string().trim().max(15).optional().or(z.literal('')),
  celular: z.string().trim().max(15).optional().or(z.literal('')),
  email: z.string().trim().email('E-mail inválido').max(255).optional().or(z.literal('')),
  endereco: z.string().trim().max(300).optional().or(z.literal('')),
  numero: z.string().trim().max(10).optional().or(z.literal('')),
  complemento: z.string().trim().max(100).optional().or(z.literal('')),
  cep: z.string().trim().max(9).optional().or(z.literal('')),
  bairro: z.string().trim().max(100).optional().or(z.literal('')),
  cidade: z.string().trim().max(100).optional().or(z.literal('')),
  estado: z.string().trim().max(2).optional().or(z.literal('')),
  status: z.enum(['ativo', 'inativo', 'bloqueado']).default('ativo'),
  motivo: z.string().trim().max(500).optional().or(z.literal('')),
  referencia: z.string().trim().max(200).optional().or(z.literal('')),
  observacao: z.string().trim().max(1000).optional().or(z.literal('')),
});

export const clienteCobrancaSchema = z.object({
  enderecoCobranca: z.string().trim().max(300).optional().or(z.literal('')),
  numeroCobranca: z.string().trim().max(10).optional().or(z.literal('')),
  complementoCobranca: z.string().trim().max(100).optional().or(z.literal('')),
  cepCobranca: z.string().trim().max(9).optional().or(z.literal('')),
  bairroCobranca: z.string().trim().max(100).optional().or(z.literal('')),
  cidadeCobranca: z.string().trim().max(100).optional().or(z.literal('')),
  estadoCobranca: z.string().trim().max(2).optional().or(z.literal('')),
});

export const contatoSchema = z.object({
  nome: z.string().trim().min(2, 'Nome obrigatório').max(200),
  telefone: z.string().trim().max(15).optional().or(z.literal('')),
  celular: z.string().trim().max(15).optional().or(z.literal('')),
  email: z.string().trim().email('E-mail inválido').max(255).optional().or(z.literal('')),
  cargo: z.string().trim().max(100).optional().or(z.literal('')),
});

export const obraSchema = z.object({
  contato: z.string().trim().max(200).optional().or(z.literal('')),
  referencia: z.string().trim().max(200).optional().or(z.literal('')),
  referenciaEntrega: z.string().trim().max(200).optional().or(z.literal('')),
  telefone: z.string().trim().max(15).optional().or(z.literal('')),
  celular: z.string().trim().max(15).optional().or(z.literal('')),
  endereco: z.string().trim().min(3, 'Endereço obrigatório').max(300),
  numero: z.string().trim().max(10).optional().or(z.literal('')),
  complemento: z.string().trim().max(100).optional().or(z.literal('')),
  cep: z.string().trim().max(9).optional().or(z.literal('')),
  bairro: z.string().trim().max(100).optional().or(z.literal('')),
  cidade: z.string().trim().max(100).optional().or(z.literal('')),
  estado: z.string().trim().max(2).optional().or(z.literal('')),
});

export const clienteFormSchema = clienteDadosSchema.merge(clienteCobrancaSchema);

export type ClienteFormData = z.infer<typeof clienteFormSchema>;
export type ContatoFormData = z.infer<typeof contatoSchema>;
export type ObraFormData = z.infer<typeof obraSchema>;
