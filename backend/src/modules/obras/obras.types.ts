export type ObraRow = {
  id: number;
  cliente_id: number;
  nome: string;
  responsavel: string | null;
  telefone: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  cep: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  latitude: number | null;
  longitude: number | null;
  ativa: boolean;
  observacao: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ObraDto = {
  id: number;
  clienteId: number;
  nome: string;
  responsavel: string | null;
  telefone: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  cep: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  latitude: number | null;
  longitude: number | null;
  ativa: boolean;
  observacao: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateObraDto = {
  clienteId: number;
  nome: string;
  responsavel?: string;
  telefone?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  cep?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  latitude?: number;
  longitude?: number;
  observacao?: string;
};

export type UpdateObraDto = Partial<Omit<CreateObraDto, 'clienteId'>> & {
  ativa?: boolean;
};

export type ListObrasQuery = {
  clienteId?: number;
  ativa?: boolean;
};
