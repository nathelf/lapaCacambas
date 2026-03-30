import type { StatusPedido, StatusCliente, TipoCliente, StatusCacamba, StatusVeiculo, StatusMotorista, StatusFatura, StatusBoleto, StatusConta, TipoLocacao, StatusMaterial, StatusNotaFiscal } from './enums';

// ===== DOMAIN ENTITIES =====
// Mapped from legacy DB fields to modern naming

export interface Cliente {
  id: number;
  nomeCliente: string;
  fantasia: string | null;
  referencia: string | null;
  status: StatusCliente;
  motivo: string | null;
  tipo: TipoCliente;
  cpf: string | null;
  cnpj: string | null;
  rg: string | null;
  telefone: string | null;
  fax: string | null;
  celular: string | null;
  email: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  cep: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  observacao: string | null;
  enderecoCobranca: string | null;
  numeroCobranca: string | null;
  complementoCobranca: string | null;
  cepCobranca: string | null;
  bairroCobranca: string | null;
  cidadeCobranca: string | null;
  estadoCobranca: string | null;
  codigoFuncionario: number | null;
  dataCadastro: string | null;
  dataAtualizacao: string | null;
}

export interface Contato {
  id: number;
  clienteId: number;
  nome: string;
  telefone: string | null;
  celular: string | null;
  email: string | null;
  cargo: string | null;
}

export interface Entrega {
  id: number;
  clienteId: number;
  contato: string | null;
  referencia: string | null;
  referenciaEntrega: string | null;
  telefone: string | null;
  fax: string | null;
  celular: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  cep: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
}

export interface NotaFiscal {
  id: number;
  numero: string;
  serie: string;
  chaveAcesso: string | null;
  dataEmissao: string;
  valorTotal: number;
  status: StatusNotaFiscal;
  clienteId: number;
  nomeCliente?: string;
  pedidoIds: number[];
  xml: string | null;
  danfeUrl: string | null;
  erroMensagem: string | null;
  observacao: string | null;
  criadoPor: string | null;
}

export interface PedidoFiscal {
  statusFiscal: StatusNotaFiscal;
  notaFiscalId: number | null;
  notaFiscalNumero: string | null;
  notaFiscalData: string | null;
}

export interface Pedido {
  id: number;
  clienteId: number;
  entregaId: number;
  cacambaId: number;
  patrimonio: string | null;
  tipoLocacao: TipoLocacao;
  quantidade: number;
  valor: number;
  status: StatusPedido;
  dataPedidoColocacao: string | null;
  horaPedidoColocacao: string | null;
  funcionarioColocacao: number | null;
  dataPedidoRetirada: string | null;
  horaPedidoRetirada: string | null;
  funcionarioRetirada: number | null;
  dataRetiradaPrevista: string | null;
  faturado: boolean;
  dataColocacao: string | null;
  dataRetirada: string | null;
  motoristaColocacao: number | null;
  motoristaRetirada: number | null;
  aterroId: number | null;
  latitude: number | null;
  longitude: number | null;
  obsPedidoColocacao: string | null;
  obsPedidoRetirada: string | null;
  obsColocacao: string | null;
  obsRetirada: string | null;
  // Fiscal
  fiscal?: PedidoFiscal;
  // Joined
  nomeCliente?: string;
  servico?: string;
}

export interface Cacamba {
  id: number;
  descricao: string;
  quantidade: number;
  precoDia: number;
  precoSemana: number;
  precoQuinzena: number;
  precoMes: number;
  imagem: string | null;
  status: string;
}

export interface UnidadeCacamba {
  id: number;
  cacambaId: number;
  patrimonio: string;
  status: StatusCacamba;
  pedidoAtualId: number | null;
  clienteAtual: string | null;
  observacao: string | null;
}

export interface Veiculo {
  id: number;
  placa: string;
  modelo: string;
  cor: string | null;
  anoFabricacao: number | null;
  dataAquisicao: string | null;
  dataLicenciamento: string | null;
  kmInicial: number;
  kmAtual: number;
  kmAvisoManutencao: number | null;
  status: StatusVeiculo;
  marcaId: number | null;
  tipoId: number | null;
  combustivelId: number | null;
}

export interface Motorista {
  id: number;
  nome: string;
  dataNascimento: string | null;
  status: StatusMotorista;
  dataVencimentoCNH: string | null;
  categoriaA: boolean;
  categoriaB: boolean;
  categoriaC: boolean;
  categoriaD: boolean;
  categoriaE: boolean;
}

export interface Abastecimento {
  id: number;
  combustivelId: number;
  veiculoId: number;
  motoristaId: number;
  data: string;
  hora: string;
  kmAtual: number;
  kmAnterior: number;
  valor: number;
  litros: number;
  observacao: string | null;
}

export interface Fatura {
  id: number;
  pedidoId: number;
  clienteId: number;
  tipoPagamentoId: number;
  numero: string;
  dataEmissao: string;
  dataVencimento: string;
  dataBaixa: string | null;
  valor: number;
  valorBaixa: number | null;
  funcionarioId: number | null;
  funcionarioBaixaId: number | null;
  observacao: string | null;
  protesto: boolean;
  status: StatusFatura;
  nomeCliente?: string;
}

export interface Boleto {
  id: number;
  clienteId: number;
  bancoId: number;
  vencimento: string;
  nossoNumero: string;
  numeroDocumento: string;
  dataDocumento: string;
  dataProcessamento: string;
  valor: number;
  multa: number;
  juros: number;
  dataBaixa: string | null;
  valorBaixa: number | null;
  status: StatusBoleto;
  filialId: number | null;
}

export interface Conta {
  id: number;
  descricao: string;
  notaFiscal: string | null;
  valor: number;
  dataVencimento: string;
  dataPagamento: string | null;
  valorPagamento: number | null;
  fornecedorId: number | null;
  nivel1Id: number | null;
  nivel2Id: number | null;
  nivel3Id: number | null;
  nivel4Id: number | null;
  nivel5Id: number | null;
  contaBancariaId: number | null;
  status: StatusConta;
  cartorio: boolean;
  observacao: string | null;
  faturaId: number | null;
}

export interface Fornecedor {
  id: number;
  nome: string;
  fantasia: string | null;
  status: string;
  tipo: string;
  cpf: string | null;
  cnpj: string | null;
  contato: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  cep: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  dataCadastro: string | null;
  dataAtualizacao: string | null;
}

export interface Material {
  id: number;
  descricao: string;
  status: StatusMaterial;
  valor: number;
  quantidade: number;
  estoque: number;
}

export interface Fluxo {
  id: number;
  tipo: string;
  status: string;
  descricao: string;
  data: string;
  valor: number;
  faturaId: number | null;
}

// ===== DASHBOARD =====
export interface DashboardKPI {
  pedidosHoje: number;
  pedidosProgramados: number;
  emRota: number;
  caminhoes: number;
  concluidos: number;
  mesConcluidos: number;
  cacambasCampo: number;
  cacambasTotal: number;
  aReceber: number;
  cobrancasVencidas: number;
}

export interface AlertaOperacional {
  id: string;
  tipo: 'warning' | 'error' | 'info';
  titulo: string;
  categoria: string;
}
