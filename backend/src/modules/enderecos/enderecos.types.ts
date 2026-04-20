export type EnderecoEntregaRow = {
  id: number;
  cliente_id: number;
  obra_id: number | null;
  contato: string | null;
  referencia: string | null;
  telefone: string | null;
  celular: string | null;
  endereco: string;
  numero: string | null;
  complemento: string | null;
  cep: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

export type EnderecoEntregaDto = {
  id: number;
  clienteId: number;
  obraId: number | null;
  contato: string | null;
  referencia: string | null;
  telefone: string | null;
  celular: string | null;
  endereco: string;
  numero: string | null;
  complemento: string | null;
  cep: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
};

export type CreateEnderecoDto = {
  clienteId: number;
  obraId?: number;
  contato?: string;
  referencia?: string;
  telefone?: string;
  celular?: string;
  endereco: string;
  numero?: string;
  complemento?: string;
  cep?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  latitude?: number;
  longitude?: number;
};

export type UpdateEnderecoDto = Partial<Omit<CreateEnderecoDto, 'clienteId'>>;

export type ListEnderecosQuery = {
  clienteId?: number;
  obraId?: number;
};
