import { supabaseAdmin } from '../../lib/supabase';
import type { MaquinaRow, MaquinaDto, CreateMaquinaDto, UpdateMaquinaDto, ListMaquinasQuery } from './maquinas.types';

function toDto(row: MaquinaRow): MaquinaDto {
  return {
    id: row.id,
    descricao: row.descricao,
    modelo: row.modelo,
    patrimonio: row.patrimonio,
    precoHora: row.preco_hora,
    precoDia: row.preco_dia,
    status: row.status,
    observacao: row.observacao,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listar(query: ListMaquinasQuery): Promise<MaquinaDto[]> {
  let q = supabaseAdmin
    .from('maquinas')
    .select('*')
    .order('descricao', { ascending: true });

  if (query.status) q = q.eq('status', query.status);

  const { data, error } = await q;
  if (error) throw new Error('Falha ao buscar máquinas.');
  return (data as MaquinaRow[]).map(toDto);
}

export async function buscarPorId(id: number): Promise<MaquinaDto> {
  const { data, error } = await supabaseAdmin
    .from('maquinas')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) throw new Error('Máquina não encontrada.');
  return toDto(data as MaquinaRow);
}

export async function criar(dto: CreateMaquinaDto): Promise<MaquinaDto> {
  const { data, error } = await supabaseAdmin
    .from('maquinas')
    .insert({
      descricao: dto.descricao,
      modelo: dto.modelo ?? null,
      patrimonio: dto.patrimonio ?? null,
      preco_hora: dto.precoHora ?? null,
      preco_dia: dto.precoDia ?? null,
      observacao: dto.observacao ?? null,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error('Falha ao criar máquina.');
  return toDto(data as MaquinaRow);
}

export async function atualizar(id: number, dto: UpdateMaquinaDto): Promise<MaquinaDto> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (dto.descricao !== undefined)  updates.descricao = dto.descricao;
  if (dto.modelo !== undefined)     updates.modelo = dto.modelo;
  if (dto.patrimonio !== undefined) updates.patrimonio = dto.patrimonio;
  if (dto.precoHora !== undefined)  updates.preco_hora = dto.precoHora;
  if (dto.precoDia !== undefined)   updates.preco_dia = dto.precoDia;
  if (dto.status !== undefined)     updates.status = dto.status;
  if (dto.observacao !== undefined) updates.observacao = dto.observacao;

  const { data, error } = await supabaseAdmin
    .from('maquinas')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) throw new Error('Falha ao atualizar máquina.');
  return toDto(data as MaquinaRow);
}
