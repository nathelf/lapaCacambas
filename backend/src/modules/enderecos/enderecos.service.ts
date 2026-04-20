import { supabaseAdmin } from '../../lib/supabase';
import type { EnderecoEntregaRow, EnderecoEntregaDto, CreateEnderecoDto, UpdateEnderecoDto, ListEnderecosQuery } from './enderecos.types';

function toDto(row: EnderecoEntregaRow): EnderecoEntregaDto {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    obraId: row.obra_id,
    contato: row.contato,
    referencia: row.referencia,
    telefone: row.telefone,
    celular: row.celular,
    endereco: row.endereco,
    numero: row.numero,
    complemento: row.complemento,
    cep: row.cep,
    bairro: row.bairro,
    cidade: row.cidade,
    estado: row.estado,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at,
  };
}

export async function listar(query: ListEnderecosQuery): Promise<EnderecoEntregaDto[]> {
  let q = supabaseAdmin
    .from('enderecos_entrega')
    .select('*')
    .order('endereco', { ascending: true });

  if (query.clienteId !== undefined) q = q.eq('cliente_id', query.clienteId);
  if (query.obraId !== undefined)    q = q.eq('obra_id', query.obraId);

  const { data, error } = await q;
  if (error) throw new Error('Falha ao buscar endereços.');
  return (data as EnderecoEntregaRow[]).map(toDto);
}

export async function buscarPorId(id: number): Promise<EnderecoEntregaDto> {
  const { data, error } = await supabaseAdmin
    .from('enderecos_entrega')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) throw new Error('Endereço não encontrado.');
  return toDto(data as EnderecoEntregaRow);
}

export async function criar(dto: CreateEnderecoDto): Promise<EnderecoEntregaDto> {
  const { data, error } = await supabaseAdmin
    .from('enderecos_entrega')
    .insert({
      cliente_id: dto.clienteId,
      obra_id: dto.obraId ?? null,
      contato: dto.contato ?? null,
      referencia: dto.referencia ?? null,
      telefone: dto.telefone ?? null,
      celular: dto.celular ?? null,
      endereco: dto.endereco,
      numero: dto.numero ?? null,
      complemento: dto.complemento ?? null,
      cep: dto.cep ?? null,
      bairro: dto.bairro ?? null,
      cidade: dto.cidade ?? null,
      estado: dto.estado ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error('Falha ao criar endereço.');
  return toDto(data as EnderecoEntregaRow);
}

export async function atualizar(id: number, dto: UpdateEnderecoDto): Promise<EnderecoEntregaDto> {
  const updates: Record<string, unknown> = {};

  if (dto.obraId !== undefined)      updates.obra_id = dto.obraId;
  if (dto.contato !== undefined)     updates.contato = dto.contato;
  if (dto.referencia !== undefined)  updates.referencia = dto.referencia;
  if (dto.telefone !== undefined)    updates.telefone = dto.telefone;
  if (dto.celular !== undefined)     updates.celular = dto.celular;
  if (dto.endereco !== undefined)    updates.endereco = dto.endereco;
  if (dto.numero !== undefined)      updates.numero = dto.numero;
  if (dto.complemento !== undefined) updates.complemento = dto.complemento;
  if (dto.cep !== undefined)         updates.cep = dto.cep;
  if (dto.bairro !== undefined)      updates.bairro = dto.bairro;
  if (dto.cidade !== undefined)      updates.cidade = dto.cidade;
  if (dto.estado !== undefined)      updates.estado = dto.estado;
  if (dto.latitude !== undefined)    updates.latitude = dto.latitude;
  if (dto.longitude !== undefined)   updates.longitude = dto.longitude;

  const { data, error } = await supabaseAdmin
    .from('enderecos_entrega')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) throw new Error('Falha ao atualizar endereço.');
  return toDto(data as EnderecoEntregaRow);
}

export async function deletar(id: number): Promise<void> {
  // enderecos_entrega não tem deleted_at — delete físico é aceitável aqui
  const { error } = await supabaseAdmin
    .from('enderecos_entrega')
    .delete()
    .eq('id', id);

  if (error) throw new Error('Falha ao remover endereço.');
}
