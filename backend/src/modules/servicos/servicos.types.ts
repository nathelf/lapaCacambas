// Como o dado vem do banco (espelha a tabela servicos)
export type ServicoRow = {
  id: number;
  descricao: string;
  codigo_fiscal: string | null;
  aliquota: number;
  ativo: boolean;
  created_at: string;
};

// O que o frontend recebe (camelCase)
export type ServicoDto = {
  id: number;
  descricao: string;
  codigoFiscal: string | null;
  aliquota: number;
  ativo: boolean;
  createdAt: string;
};

// O que o frontend manda pra criar um serviço
export type CreateServicoDto = {
  descricao: string;
  codigoFiscal?: string;
  aliquota?: number;
};

// O que o frontend manda pra editar (tudo opcional)
export type UpdateServicoDto = Partial<CreateServicoDto> & {
  ativo?: boolean;
};
