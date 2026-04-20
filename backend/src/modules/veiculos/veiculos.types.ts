import type { StatusVeiculo } from '../../../../shared/enums';

export type VeiculoRow = {
  id: number;
  placa: string;
  modelo: string;
  marca: string | null;
  cor: string | null;
  tipo: string | null;
  combustivel: string | null;
  ano_fabricacao: number | null;
  data_aquisicao: string | null;
  data_licenciamento: string | null;
  km_inicial: number;
  km_atual: number;
  km_aviso_manutencao: number | null;
  status: StatusVeiculo;
  created_at: string;
  updated_at: string;
};

export type VeiculoDto = {
  id: number;
  placa: string;
  modelo: string;
  marca: string | null;
  cor: string | null;
  tipo: string | null;
  combustivel: string | null;
  anoFabricacao: number | null;
  dataAquisicao: string | null;
  dataLicenciamento: string | null;
  kmInicial: number;
  kmAtual: number;
  kmAvisoManutencao: number | null;
  status: StatusVeiculo;
  createdAt: string;
  updatedAt: string;
};

export type CreateVeiculoDto = {
  placa: string;
  modelo: string;
  marca?: string;
  cor?: string;
  tipo?: string;
  combustivel?: string;
  anoFabricacao?: number;
  dataAquisicao?: string;
  dataLicenciamento?: string;
  kmInicial?: number;
  kmAvisoManutencao?: number;
};

export type UpdateVeiculoDto = Partial<CreateVeiculoDto> & {
  status?: StatusVeiculo;
  kmAtual?: number;
};

export type ListVeiculosQuery = {
  status?: StatusVeiculo | StatusVeiculo[]; // aceita um ou múltiplos status
};
