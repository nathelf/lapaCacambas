import { supabaseAdmin } from '../../lib/supabase';
import type { MotoristaRow, MotoristaDto, CreateMotoristaDto, UpdateMotoristaDto, ListMotoristasQuery } from './motoristas.types';

// Converte as colunas booleanas de categoria em array legível
function categoriasFromRow(row: MotoristaRow): string[] {
  const cats: string[] = [];
  if (row.categoria_a) cats.push('A');
  if (row.categoria_b) cats.push('B');
  if (row.categoria_c) cats.push('C');
  if (row.categoria_d) cats.push('D');
  if (row.categoria_e) cats.push('E');
  return cats;
}

function toDto(row: MotoristaRow): MotoristaDto {
  return {
    id: row.id,
    nome: row.nome,
    cpf: row.cpf,
    cnh: row.cnh,
    dataNascimento: row.data_nascimento,
    status: row.status,
    dataVencimentoCnh: row.data_vencimento_cnh,
    categorias: categoriasFromRow(row),
    telefone: row.telefone,
    celular: row.celular,
    email: row.email,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Converte array de categorias ['C','D'] para colunas booleanas do banco
function categoriasToInsert(categorias?: string[]): Record<string, boolean> {
  const cats = categorias?.map(c => c.toUpperCase()) ?? [];
  return {
    categoria_a: cats.includes('A'),
    categoria_b: cats.includes('B'),
    categoria_c: cats.includes('C'),
    categoria_d: cats.includes('D'),
    categoria_e: cats.includes('E'),
  };
}

export async function listar(query: ListMotoristasQuery): Promise<MotoristaDto[]> {
  let q = supabaseAdmin
    .from('motoristas')
    .select('*')
    .order('nome', { ascending: true });

  if (query.status) q = q.eq('status', query.status);
  if (query.busca)  q = q.or(`nome.ilike.%${query.busca}%,cpf.ilike.%${query.busca}%`);

  const { data, error } = await q;
  if (error) throw new Error('Falha ao buscar motoristas.');
  return (data as MotoristaRow[]).map(toDto);
}

export async function buscarPorId(id: number): Promise<MotoristaDto> {
  const { data, error } = await supabaseAdmin
    .from('motoristas')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) throw new Error('Motorista não encontrado.');
  return toDto(data as MotoristaRow);
}

export async function criar(dto: CreateMotoristaDto): Promise<MotoristaDto> {
  const { data, error } = await supabaseAdmin
    .from('motoristas')
    .insert({
      nome: dto.nome,
      cpf: dto.cpf ?? null,
      cnh: dto.cnh ?? null,
      data_nascimento: dto.dataNascimento ?? null,
      data_vencimento_cnh: dto.dataVencimentoCnh ?? null,
      ...categoriasToInsert(dto.categorias),
      telefone: dto.telefone ?? null,
      celular: dto.celular ?? null,
      email: dto.email ?? null,
      user_id: dto.userId ?? null,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error('Falha ao criar motorista.');
  return toDto(data as MotoristaRow);
}

export async function atualizar(id: number, dto: UpdateMotoristaDto): Promise<MotoristaDto> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (dto.nome !== undefined)              updates.nome = dto.nome;
  if (dto.cpf !== undefined)               updates.cpf = dto.cpf;
  if (dto.cnh !== undefined)               updates.cnh = dto.cnh;
  if (dto.dataNascimento !== undefined)    updates.data_nascimento = dto.dataNascimento;
  if (dto.dataVencimentoCnh !== undefined) updates.data_vencimento_cnh = dto.dataVencimentoCnh;
  if (dto.status !== undefined)            updates.status = dto.status;
  if (dto.telefone !== undefined)          updates.telefone = dto.telefone;
  if (dto.celular !== undefined)           updates.celular = dto.celular;
  if (dto.email !== undefined)             updates.email = dto.email;
  if (dto.userId !== undefined)            updates.user_id = dto.userId;
  if (dto.categorias !== undefined)        Object.assign(updates, categoriasToInsert(dto.categorias));

  const { data, error } = await supabaseAdmin
    .from('motoristas')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) throw new Error('Falha ao atualizar motorista.');
  return toDto(data as MotoristaRow);
}
