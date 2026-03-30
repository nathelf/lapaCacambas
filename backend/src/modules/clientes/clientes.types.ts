import type { StatusCliente, TipoCliente } from '../../../../shared/enums';

// Como o dado vem do banco (snake_case, espelha a tabela)
export type ClienteRow = {
  id: number;
  nome: string;
  fantasia: string | null;
  referencia: string | null;
  status: StatusCliente;
  motivo_bloqueio: string | null;
  tipo: TipoCliente;
  cpf: string | null;
  cnpj: string | null;
  rg: string | null;
  inscricao_municipal: string | null;
  inscricao_estadual: string | null;
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
  endereco_cobranca: string | null;
  numero_cobranca: string | null;
  complemento_cobranca: string | null;
  cep_cobranca: string | null;
  bairro_cobranca: string | null;
  cidade_cobranca: string | null;
  estado_cobranca: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

// O que o frontend recebe (camelCase, sem campos internos)
export type ClienteDto = {
  id: number;
  nome: string;
  fantasia: string | null;
  referencia: string | null;
  status: StatusCliente;
  motivoBloqueio: string | null;
  tipo: TipoCliente;
  cpf: string | null;
  cnpj: string | null;
  rg: string | null;
  inscricaoMunicipal: string | null;
  inscricaoEstadual: string | null;
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
  createdAt: string;
  updatedAt: string;
};

// O que o frontend manda pra criar um cliente
export type CreateClienteDto = {
  nome: string;
  fantasia?: string;
  referencia?: string;
  tipo: TipoCliente;
  cpf?: string;
  cnpj?: string;
  rg?: string;
  inscricaoMunicipal?: string;
  inscricaoEstadual?: string;
  telefone?: string;
  fax?: string;
  celular?: string;
  email?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  cep?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  observacao?: string;
  enderecoCobranca?: string;
  numeroCobranca?: string;
  complementoCobranca?: string;
  cepCobranca?: string;
  bairroCobranca?: string;
  cidadeCobranca?: string;
  estadoCobranca?: string;
};

// O que o frontend manda pra editar (tudo opcional exceto campos de controle)
export type UpdateClienteDto = Partial<CreateClienteDto> & {
  status?: StatusCliente;
  motivoBloqueio?: string;
};

// Filtros aceitos na listagem
export type ListClientesQuery = {
  busca?: string;         // busca por nome, fantasia ou CPF/CNPJ
  status?: StatusCliente;
  tipo?: TipoCliente;
  page?: number;
  limit?: number;
};
