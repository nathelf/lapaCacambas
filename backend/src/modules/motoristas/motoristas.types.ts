import type { StatusMotorista } from '../../../../shared/enums';

export type MotoristaRow = {
  id: number;
  nome: string;
  cpf: string | null;
  cnh: string | null;
  data_nascimento: string | null;
  status: StatusMotorista;
  data_vencimento_cnh: string | null;
  categoria_a: boolean;
  categoria_b: boolean;
  categoria_c: boolean;
  categoria_d: boolean;
  categoria_e: boolean;
  telefone: string | null;
  celular: string | null;
  email: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type MotoristaDto = {
  id: number;
  nome: string;
  cpf: string | null;
  cnh: string | null;
  dataNascimento: string | null;
  status: StatusMotorista;
  dataVencimentoCnh: string | null;
  categorias: string[]; // ex: ['C', 'D']
  telefone: string | null;
  celular: string | null;
  email: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateMotoristaDto = {
  nome: string;
  cpf?: string;
  cnh?: string;
  dataNascimento?: string;
  dataVencimentoCnh?: string;
  categorias?: string[]; // ex: ['C', 'D']
  telefone?: string;
  celular?: string;
  email?: string;
  userId?: string;
};

export type UpdateMotoristaDto = Partial<CreateMotoristaDto> & {
  status?: StatusMotorista;
};

export type ListMotoristasQuery = {
  status?: StatusMotorista;
  busca?: string; // busca por nome ou CPF
};
