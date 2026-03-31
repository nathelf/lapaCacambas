import { supabaseAdmin } from '../../lib/supabase';
import type { ServicoRow, ServicoDto, CreateServicoDto, UpdateServicoDto } from './servicos.types';

function toDto(row: ServicoRow): ServicoDto {
  return {
    id: row.id,
    descricao: row.descricao,
    codigoFiscal: row.codigo_fiscal,
    aliquota: Number(row.aliquota),
    ativo: row.ativo,
    createdAt: row.created_at,
  };
}

// Lista todos os serviços — por padrão só os ativos, mas aceita trazer todos
export async function listar(apenasAtivos = false): Promise<ServicoDto[]> {
  let query = supabaseAdmin
    .from('servicos')
    .select('*')
    .order('descricao', { ascending: true });

  if (apenasAtivos) query = query.eq('ativo', true);

  const { data, error } = await query;
  if (error) throw new Error('Falha ao buscar serviços.');
  return (data as ServicoRow[]).map(toDto);
}

export async function buscarPorId(id: number): Promise<ServicoDto> {
  const { data, error } = await supabaseAdmin
    .from('servicos')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) throw new Error('Serviço não encontrado.');
  return toDto(data as ServicoRow);
}

export async function criar(dto: CreateServicoDto): Promise<ServicoDto> {
  const { data, error } = await supabaseAdmin
    .from('servicos')
    .insert({
      descricao: dto.descricao,
      codigo_fiscal: dto.codigoFiscal ?? null,
      aliquota: dto.aliquota ?? 0,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error('Falha ao criar serviço.');
  return toDto(data as ServicoRow);
}

export async function atualizar(id: number, dto: UpdateServicoDto): Promise<ServicoDto> {
  const updates: Record<string, unknown> = {};

  if (dto.descricao !== undefined)    updates.descricao = dto.descricao;
  if (dto.codigoFiscal !== undefined) updates.codigo_fiscal = dto.codigoFiscal;
  if (dto.aliquota !== undefined)     updates.aliquota = dto.aliquota;
  if (dto.ativo !== undefined)        updates.ativo = dto.ativo;

  const { data, error } = await supabaseAdmin
    .from('servicos')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) throw new Error('Falha ao atualizar serviço.');
  return toDto(data as ServicoRow);
}
