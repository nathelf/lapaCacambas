// Nota: a tabela maquinas usa status TEXT (não enum), por isso string aqui
export type MaquinaRow = {
  id: number;
  descricao: string;
  modelo: string | null;
  patrimonio: string | null;
  preco_hora: number | null;
  preco_dia: number | null;
  status: string;
  observacao: string | null;
  created_at: string;
  updated_at: string;
};

export type MaquinaDto = {
  id: number;
  descricao: string;
  modelo: string | null;
  patrimonio: string | null;
  precoHora: number | null;
  precoDia: number | null;
  status: string;
  observacao: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateMaquinaDto = {
  descricao: string;
  modelo?: string;
  patrimonio?: string;
  precoHora?: number;
  precoDia?: number;
  observacao?: string;
};

export type UpdateMaquinaDto = Partial<CreateMaquinaDto> & {
  status?: string;
};

export type ListMaquinasQuery = {
  status?: string;
};
