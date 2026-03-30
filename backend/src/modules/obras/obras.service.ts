import { supabaseAdmin } from '../../lib/supabase';
import type { ObraRow, ObraDto, CreateObraDto, UpdateObraDto, ListObrasQuery } from './obras.types';

function toDto(row: ObraRow): ObraDto {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    nome: row.nome,
    responsavel: row.responsavel,
    telefone: row.telefone,
    endereco: row.endereco,
    numero: row.numero,
    complemento: row.complemento,
    cep: row.cep,
    bairro: row.bairro,
    cidade: row.cidade,
    estado: row.estado,
    latitude: row.latitude,
    longitude: row.longitude,
    ativa: row.ativa,
    observacao: row.observacao,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listar(query: ListObrasQuery): Promise<ObraDto[]> {
  let q = supabaseAdmin
    .from('obras')
    .select('*')
    .is('deleted_at', null)
    .order('nome', { ascending: true });

  if (query.clienteId !== undefined) q = q.eq('cliente_id', query.clienteId);
  if (query.ativa !== undefined)     q = q.eq('ativa', query.ativa);

  const { data, error } = await q;
  if (error) throw new Error('Falha ao buscar obras.');
  return (data as ObraRow[]).map(toDto);
}

export async function buscarPorId(id: number): Promise<ObraDto> {
  const { data, error } = await supabaseAdmin
    .from('obras')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !data) throw new Error('Obra não encontrada.');
  return toDto(data as ObraRow);
}

export async function criar(dto: CreateObraDto): Promise<ObraDto> {
  const { data, error } = await supabaseAdmin
    .from('obras')
    .insert({
      cliente_id: dto.clienteId,
      nome: dto.nome,
      responsavel: dto.responsavel ?? null,
      telefone: dto.telefone ?? null,
      endereco: dto.endereco ?? null,
      numero: dto.numero ?? null,
      complemento: dto.complemento ?? null,
      cep: dto.cep ?? null,
      bairro: dto.bairro ?? null,
      cidade: dto.cidade ?? null,
      estado: dto.estado ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      observacao: dto.observacao ?? null,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error('Falha ao criar obra.');
  return toDto(data as ObraRow);
}

export async function atualizar(id: number, dto: UpdateObraDto): Promise<ObraDto> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (dto.nome !== undefined)        updates.nome = dto.nome;
  if (dto.responsavel !== undefined) updates.responsavel = dto.responsavel;
  if (dto.telefone !== undefined)    updates.telefone = dto.telefone;
  if (dto.endereco !== undefined)    updates.endereco = dto.endereco;
  if (dto.numero !== undefined)      updates.numero = dto.numero;
  if (dto.complemento !== undefined) updates.complemento = dto.complemento;
  if (dto.cep !== undefined)         updates.cep = dto.cep;
  if (dto.bairro !== undefined)      updates.bairro = dto.bairro;
  if (dto.cidade !== undefined)      updates.cidade = dto.cidade;
  if (dto.estado !== undefined)      updates.estado = dto.estado;
  if (dto.latitude !== undefined)    updates.latitude = dto.latitude;
  if (dto.longitude !== undefined)   updates.longitude = dto.longitude;
  if (dto.observacao !== undefined)  updates.observacao = dto.observacao;
  if (dto.ativa !== undefined)       updates.ativa = dto.ativa;

  const { data, error } = await supabaseAdmin
    .from('obras')
    .update(updates)
    .eq('id', id)
    .is('deleted_at', null)
    .select('*')
    .single();

  if (error || !data) throw new Error('Falha ao atualizar obra.');
  return toDto(data as ObraRow);
}

export async function deletar(id: number): Promise<void> {
  const { error } = await supabaseAdmin
    .from('obras')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) throw new Error('Falha ao remover obra.');
}
