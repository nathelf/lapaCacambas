import { supabaseAdmin } from '../../lib/supabase';
import type { ContatoClienteRow, ContatoClienteDto, CreateContatoDto, UpdateContatoDto } from './contatos.types';

function toDto(row: ContatoClienteRow): ContatoClienteDto {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    nome: row.nome,
    telefone: row.telefone,
    celular: row.celular,
    email: row.email,
    cargo: row.cargo,
    principal: row.principal,
    createdAt: row.created_at,
  };
}

export async function listarPorCliente(clienteId: number): Promise<ContatoClienteDto[]> {
  const { data, error } = await supabaseAdmin
    .from('contatos_cliente')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('principal', { ascending: false })
    .order('nome', { ascending: true });

  if (error) throw new Error('Falha ao buscar contatos.');
  return (data as ContatoClienteRow[]).map(toDto);
}

export async function buscarPorId(id: number): Promise<ContatoClienteDto> {
  const { data, error } = await supabaseAdmin
    .from('contatos_cliente')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) throw new Error('Contato não encontrado.');
  return toDto(data as ContatoClienteRow);
}

export async function criar(dto: CreateContatoDto): Promise<ContatoClienteDto> {
  const { data, error } = await supabaseAdmin
    .from('contatos_cliente')
    .insert({
      cliente_id: dto.clienteId,
      nome: dto.nome,
      telefone: dto.telefone ?? null,
      celular: dto.celular ?? null,
      email: dto.email ?? null,
      cargo: dto.cargo ?? null,
      principal: dto.principal ?? false,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error('Falha ao criar contato.');
  return toDto(data as ContatoClienteRow);
}

export async function atualizar(id: number, dto: UpdateContatoDto): Promise<ContatoClienteDto> {
  const updates: Record<string, unknown> = {};

  if (dto.nome !== undefined)      updates.nome = dto.nome;
  if (dto.telefone !== undefined)  updates.telefone = dto.telefone;
  if (dto.celular !== undefined)   updates.celular = dto.celular;
  if (dto.email !== undefined)     updates.email = dto.email;
  if (dto.cargo !== undefined)     updates.cargo = dto.cargo;
  if (dto.principal !== undefined) updates.principal = dto.principal;

  const { data, error } = await supabaseAdmin
    .from('contatos_cliente')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) throw new Error('Falha ao atualizar contato.');
  return toDto(data as ContatoClienteRow);
}

export async function deletar(id: number): Promise<void> {
  const { error } = await supabaseAdmin
    .from('contatos_cliente')
    .delete()
    .eq('id', id);

  if (error) throw new Error('Falha ao remover contato.');
}
