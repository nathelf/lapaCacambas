import { supabaseAdmin } from '../../lib/supabase';
import type { VeiculoRow, VeiculoDto, CreateVeiculoDto, UpdateVeiculoDto, ListVeiculosQuery } from './veiculos.types';

function toDto(row: VeiculoRow): VeiculoDto {
  return {
    id: row.id,
    placa: row.placa,
    modelo: row.modelo,
    marca: row.marca,
    cor: row.cor,
    tipo: row.tipo,
    combustivel: row.combustivel,
    anoFabricacao: row.ano_fabricacao,
    dataAquisicao: row.data_aquisicao,
    dataLicenciamento: row.data_licenciamento,
    kmInicial: row.km_inicial,
    kmAtual: row.km_atual,
    kmAvisoManutencao: row.km_aviso_manutencao,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listar(query: ListVeiculosQuery): Promise<VeiculoDto[]> {
  let q = supabaseAdmin
    .from('veiculos')
    .select('*')
    .order('modelo', { ascending: true });

  if (query.status) q = q.eq('status', query.status);

  const { data, error } = await q;
  if (error) throw new Error('Falha ao buscar veículos.');
  return (data as VeiculoRow[]).map(toDto);
}

export async function buscarPorId(id: number): Promise<VeiculoDto> {
  const { data, error } = await supabaseAdmin
    .from('veiculos')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) throw new Error('Veículo não encontrado.');
  return toDto(data as VeiculoRow);
}

export async function criar(dto: CreateVeiculoDto): Promise<VeiculoDto> {
  const { data, error } = await supabaseAdmin
    .from('veiculos')
    .insert({
      placa: dto.placa,
      modelo: dto.modelo,
      marca: dto.marca ?? null,
      cor: dto.cor ?? null,
      tipo: dto.tipo ?? null,
      combustivel: dto.combustivel ?? null,
      ano_fabricacao: dto.anoFabricacao ?? null,
      data_aquisicao: dto.dataAquisicao ?? null,
      data_licenciamento: dto.dataLicenciamento ?? null,
      km_inicial: dto.kmInicial ?? 0,
      km_atual: dto.kmInicial ?? 0,
      km_aviso_manutencao: dto.kmAvisoManutencao ?? null,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error('Falha ao criar veículo. Verifique se a placa já existe.');
  return toDto(data as VeiculoRow);
}

export async function atualizar(id: number, dto: UpdateVeiculoDto): Promise<VeiculoDto> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (dto.placa !== undefined)             updates.placa = dto.placa;
  if (dto.modelo !== undefined)            updates.modelo = dto.modelo;
  if (dto.marca !== undefined)             updates.marca = dto.marca;
  if (dto.cor !== undefined)               updates.cor = dto.cor;
  if (dto.tipo !== undefined)              updates.tipo = dto.tipo;
  if (dto.combustivel !== undefined)       updates.combustivel = dto.combustivel;
  if (dto.anoFabricacao !== undefined)     updates.ano_fabricacao = dto.anoFabricacao;
  if (dto.dataAquisicao !== undefined)     updates.data_aquisicao = dto.dataAquisicao;
  if (dto.dataLicenciamento !== undefined) updates.data_licenciamento = dto.dataLicenciamento;
  if (dto.status !== undefined)            updates.status = dto.status;
  if (dto.kmAtual !== undefined)           updates.km_atual = dto.kmAtual;
  if (dto.kmAvisoManutencao !== undefined) updates.km_aviso_manutencao = dto.kmAvisoManutencao;

  const { data, error } = await supabaseAdmin
    .from('veiculos')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) throw new Error('Falha ao atualizar veículo.');
  return toDto(data as VeiculoRow);
}
