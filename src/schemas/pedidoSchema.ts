import { z } from 'zod';

export const pedidoSchema = z.object({
  clienteId: z.number({ required_error: 'Selecione o cliente' }).min(1),
  entregaId: z.number({ required_error: 'Selecione o endereço de entrega' }).min(1),
  cacambaId: z.number({ required_error: 'Selecione o tipo de caçamba' }).min(1),
  patrimonio: z.string().trim().max(50).optional().or(z.literal('')),
  tipoLocacao: z.enum(['dia', 'semana', 'quinzena', 'mes'], { required_error: 'Selecione o tipo de locação' }),
  quantidade: z.number().min(1, 'Quantidade mínima é 1').default(1),
  valor: z.number().min(0, 'Valor inválido'),
  dataRetiradaPrevista: z.string().optional().or(z.literal('')),
  motoristaColocacaoId: z.number().optional(),
  motoristaRetiradaId: z.number().optional(),
  aterroId: z.number().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  obsPedidoColocacao: z.string().trim().max(1000).optional().or(z.literal('')),
  obsPedidoRetirada: z.string().trim().max(1000).optional().or(z.literal('')),
});

export type PedidoFormData = z.infer<typeof pedidoSchema>;

export const programarPedidoSchema = z.object({
  motoristaId: z.number({ required_error: 'Selecione o motorista' }).min(1),
  veiculoId: z.number({ required_error: 'Selecione o veículo' }).min(1),
  dataProgramada: z.string().min(1, 'Data obrigatória'),
  observacao: z.string().trim().max(500).optional().or(z.literal('')),
});

export const confirmarColocacaoSchema = z.object({
  dataColocacao: z.string().min(1, 'Data obrigatória'),
  horaColocacao: z.string().min(1, 'Hora obrigatória'),
  motoristaId: z.number().min(1),
  observacao: z.string().trim().max(500).optional().or(z.literal('')),
});

export const confirmarRetiradaSchema = z.object({
  dataRetirada: z.string().min(1, 'Data obrigatória'),
  horaRetirada: z.string().min(1, 'Hora obrigatória'),
  motoristaId: z.number().min(1),
  aterroId: z.number().optional(),
  observacao: z.string().trim().max(500).optional().or(z.literal('')),
});

export const faturarPedidoSchema = z.object({
  tipoPagamentoId: z.number({ required_error: 'Selecione a forma de pagamento' }).min(1),
  dataVencimento: z.string().min(1, 'Data de vencimento obrigatória'),
  observacao: z.string().trim().max(500).optional().or(z.literal('')),
  gerarBoleto: z.boolean().default(false),
  gerarNotaFiscal: z.boolean().default(false),
});
