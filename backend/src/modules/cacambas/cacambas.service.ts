import { supabaseAdmin } from '../../lib/supabase';
import type {
  CacambaRow, CacambaDto, CreateCacambaDto, UpdateCacambaDto,
  UnidadeCacambaRow, UnidadeCacambaDto, CreateUnidadeDto, UpdateUnidadeDto,
  ListUnidadesQuery,
} from './cacambas.types';

function toCacambaDto(row: CacambaRow): CacambaDto {
  return {
    id: row.id,
    descricao: row.descricao,
    capacidade: row.capacidade,
    precoDia: row.preco_dia,
    precoSemana: row.preco_semana,
    precoQuinzena: row.preco_quinzena,
    precoMes: row.preco_mes,
    imagem: row.imagem,
    ativo: row.ativo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toUnidadeDto(row: UnidadeCacambaRow): UnidadeCacambaDto {
  return {
    id: row.id,
    cacambaId: row.cacamba_id,
    patrimonio: row.patrimonio,
    status: row.status,
    pedidoAtualId: row.pedido_atual_id,
    clienteAtual: row.cliente_atual,
    observacao: row.observacao,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Tipos/modelos ────────────────────────────────────────────────────────────

export async function listarCacambas(): Promise<CacambaDto[]> {
  const { data, error } = await supabaseAdmin
    .from('cacambas')
    .select('*')
    .order('descricao', { ascending: true });

  if (error) throw new Error('Falha ao buscar caçambas.');
  return (data as CacambaRow[]).map(toCacambaDto);
}

export async function buscarCacambaPorId(id: number): Promise<CacambaDto> {
  const { data, error } = await supabaseAdmin
    .from('cacambas')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) throw new Error('Caçamba não encontrada.');
  return toCacambaDto(data as CacambaRow);
}

export async function criarCacamba(dto: CreateCacambaDto): Promise<CacambaDto> {
  const { data, error } = await supabaseAdmin
    .from('cacambas')
    .insert({
      descricao: dto.descricao,
      capacidade: dto.capacidade ?? null,
      preco_dia: dto.precoDia,
      preco_semana: dto.precoSemana,
      preco_quinzena: dto.precoQuinzena,
      preco_mes: dto.precoMes,
      imagem: dto.imagem ?? null,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error('Falha ao criar caçamba.');
  return toCacambaDto(data as CacambaRow);
}

export async function atualizarCacamba(id: number, dto: UpdateCacambaDto): Promise<CacambaDto> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (dto.descricao !== undefined)     updates.descricao = dto.descricao;
  if (dto.capacidade !== undefined)    updates.capacidade = dto.capacidade;
  if (dto.precoDia !== undefined)      updates.preco_dia = dto.precoDia;
  if (dto.precoSemana !== undefined)   updates.preco_semana = dto.precoSemana;
  if (dto.precoQuinzena !== undefined) updates.preco_quinzena = dto.precoQuinzena;
  if (dto.precoMes !== undefined)      updates.preco_mes = dto.precoMes;
  if (dto.imagem !== undefined)        updates.imagem = dto.imagem;
  if (dto.ativo !== undefined)         updates.ativo = dto.ativo;

  const { data, error } = await supabaseAdmin
    .from('cacambas')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) throw new Error('Falha ao atualizar caçamba.');
  return toCacambaDto(data as CacambaRow);
}

// ─── Unidades físicas ─────────────────────────────────────────────────────────

export async function listarUnidades(query: ListUnidadesQuery): Promise<UnidadeCacambaDto[]> {
  let q = supabaseAdmin
    .from('unidades_cacamba')
    .select('*')
    .order('patrimonio', { ascending: true });

  if (query.status)    q = q.eq('status', query.status);
  if (query.cacambaId) q = q.eq('cacamba_id', query.cacambaId);

  const { data, error } = await q;
  if (error) throw new Error('Falha ao buscar unidades.');
  return (data as UnidadeCacambaRow[]).map(toUnidadeDto);
}

export async function criarUnidade(dto: CreateUnidadeDto): Promise<UnidadeCacambaDto> {
  const { data, error } = await supabaseAdmin
    .from('unidades_cacamba')
    .insert({
      cacamba_id: dto.cacambaId,
      patrimonio: dto.patrimonio,
      observacao: dto.observacao ?? null,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error('Falha ao criar unidade. Verifique se o patrimônio já existe.');
  return toUnidadeDto(data as UnidadeCacambaRow);
}

export async function atualizarUnidade(id: number, dto: UpdateUnidadeDto): Promise<UnidadeCacambaDto> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (dto.status !== undefined)        updates.status = dto.status;
  if (dto.pedidoAtualId !== undefined) updates.pedido_atual_id = dto.pedidoAtualId;
  if (dto.clienteAtual !== undefined)  updates.cliente_atual = dto.clienteAtual;
  if (dto.observacao !== undefined)    updates.observacao = dto.observacao;

  const { data, error } = await supabaseAdmin
    .from('unidades_cacamba')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) throw new Error('Falha ao atualizar unidade.');
  return toUnidadeDto(data as UnidadeCacambaRow);
}
