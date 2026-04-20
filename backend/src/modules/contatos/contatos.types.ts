export type ContatoClienteRow = {
  id: number;
  cliente_id: number;
  nome: string;
  telefone: string | null;
  celular: string | null;
  email: string | null;
  cargo: string | null;
  principal: boolean;
  created_at: string;
};

export type ContatoClienteDto = {
  id: number;
  clienteId: number;
  nome: string;
  telefone: string | null;
  celular: string | null;
  email: string | null;
  cargo: string | null;
  principal: boolean;
  createdAt: string;
};

export type CreateContatoDto = {
  clienteId: number;
  nome: string;
  telefone?: string;
  celular?: string;
  email?: string;
  cargo?: string;
  principal?: boolean;
};

export type UpdateContatoDto = Partial<Omit<CreateContatoDto, 'clienteId'>>;
