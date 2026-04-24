import { supabaseAdmin } from '../../lib/supabase';
import type {
  MotoristaRow,
  MotoristaDto,
  CreateMotoristaDto,
  UpdateMotoristaDto,
  ListMotoristasQuery,
  CandidatoVinculoMotorista,
  UsuarioMotoristaSemFicha,
} from './motoristas.types';

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

async function assertUserIdLivre(userId: string | null | undefined, excetoMotoristaId?: number) {
  if (!userId) return;
  const { data: ex, error } = await supabaseAdmin.from('motoristas').select('id').eq('user_id', userId).maybeSingle();
  if (error) throw new Error('Falha ao validar vínculo de usuário.');
  const ocupante = ex as { id: number } | null;
  if (ocupante && (excetoMotoristaId === undefined || ocupante.id !== excetoMotoristaId)) {
    throw new Error('Este usuário já está vinculado a outro motorista.');
  }
}

/** Perfis do tenant + indicação de papel `motorista` (para o select de vínculo no admin). */
export async function listarCandidatosVinculo(tenantId: string): Promise<CandidatoVinculoMotorista[]> {
  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('id, nome, email')
    .eq('tenant_id', tenantId)
    .order('nome', { ascending: true });

  if (error) throw new Error('Falha ao listar usuários do tenant.');

  const list = (profiles ?? []) as { id: string; nome: string; email: string | null }[];
  if (list.length === 0) return [];

  const ids = list.map((p) => p.id);
  const { data: roleRows } = await supabaseAdmin
    .from('user_roles')
    .select('user_id')
    .in('user_id', ids)
    .eq('role', 'motorista');

  const comPapel = new Set((roleRows ?? []).map((r: { user_id: string }) => r.user_id));

  const out: CandidatoVinculoMotorista[] = list.map((p) => ({
    id: p.id,
    nome: p.nome,
    email: p.email,
    temPapelMotorista: comPapel.has(p.id),
  }));

  out.sort((a, b) => {
    if (a.temPapelMotorista !== b.temPapelMotorista) return a.temPapelMotorista ? -1 : 1;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });
  return out;
}

export async function listar(query: ListMotoristasQuery, tenantId: string): Promise<MotoristaDto[]> {
  let q = supabaseAdmin
    .from('motoristas')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('nome', { ascending: true });

  if (query.status) q = q.eq('status', query.status);
  if (query.busca)  q = q.or(`nome.ilike.%${query.busca}%,cpf.ilike.%${query.busca}%`);

  const { data, error } = await q;
  if (error) throw new Error('Falha ao buscar motoristas.');
  return (data as MotoristaRow[]).map(toDto);
}

export async function buscarPorId(id: number, tenantId: string): Promise<MotoristaDto> {
  const { data, error } = await supabaseAdmin
    .from('motoristas')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) throw new Error('Motorista não encontrado.');
  return toDto(data as MotoristaRow);
}

export async function criar(dto: CreateMotoristaDto, tenantId: string): Promise<MotoristaDto> {
  await assertUserIdLivre(dto.userId ?? null);

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
      tenant_id: tenantId,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error('Falha ao criar motorista.');
  return toDto(data as MotoristaRow);
}

/** Perfis do tenant com papel `motorista` que ainda não têm `motoristas.user_id` preenchido. */
export async function listarUsuariosMotoristaSemFicha(tenantId: string): Promise<UsuarioMotoristaSemFicha[]> {
  const { data: profiles, error: pErr } = await supabaseAdmin
    .from('profiles')
    .select('id, nome, email')
    .eq('tenant_id', tenantId);

  if (pErr) throw new Error('Falha ao listar perfis do tenant.');
  const list = (profiles ?? []) as { id: string; nome: string; email: string | null }[];
  if (list.length === 0) return [];

  const ids = list.map((p) => p.id);
  const { data: roleRows, error: rErr } = await supabaseAdmin
    .from('user_roles')
    .select('user_id')
    .in('user_id', ids)
    .eq('role', 'motorista');

  if (rErr) throw new Error('Falha ao verificar papéis de motorista.');
  const comPapel = new Set((roleRows ?? []).map((r: { user_id: string }) => r.user_id));
  if (comPapel.size === 0) return [];

  const { data: motoRows, error: mErr } = await supabaseAdmin
    .from('motoristas')
    .select('user_id')
    .eq('tenant_id', tenantId)
    .not('user_id', 'is', null);

  if (mErr) throw new Error('Falha ao listar vínculos de motoristas.');
  const jaVinculados = new Set(
    (motoRows ?? []).map((m: { user_id: string | null }) => m.user_id).filter(Boolean) as string[],
  );

  return list
    .filter((p) => comPapel.has(p.id) && !jaVinculados.has(p.id))
    .map((p) => ({ id: p.id, nome: p.nome, email: p.email }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** Cria linha em `motoristas` para um usuário do app que já tem papel motorista mas sem ficha na frota. */
export async function criarFichaMinimaPorUsuario(userId: string, tenantId: string): Promise<MotoristaDto> {
  const { data: profile, error: pErr } = await supabaseAdmin
    .from('profiles')
    .select('id, nome, email')
    .eq('id', userId)
    .eq('tenant_id', tenantId)
    .single();

  if (pErr || !profile) throw new Error('Usuário não encontrado neste tenant.');

  const { data: roleRow, error: rErr } = await supabaseAdmin
    .from('user_roles')
    .select('user_id')
    .eq('user_id', userId)
    .eq('role', 'motorista')
    .maybeSingle();

  if (rErr || !roleRow) throw new Error('Este usuário não tem o papel motorista.');

  const { data: jaTem, error: jErr } = await supabaseAdmin
    .from('motoristas')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (jErr) throw new Error('Falha ao validar cadastro existente.');
  if (jaTem) throw new Error('Este usuário já possui ficha de motorista.');

  const nome =
    (profile as { nome: string; email: string | null }).nome?.trim() ||
    (profile as { nome: string; email: string | null }).email?.split('@')[0] ||
    'Motorista';

  return criar(
    {
      nome,
      email: (profile as { email: string | null }).email ?? undefined,
      userId,
    },
    tenantId,
  );
}

export async function atualizar(id: number, dto: UpdateMotoristaDto, tenantId: string): Promise<MotoristaDto> {
  if (dto.userId !== undefined) {
    await assertUserIdLivre(dto.userId ?? null, id);
  }

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
    .eq('tenant_id', tenantId)
    .select('*')
    .single();

  if (error || !data) throw new Error('Falha ao atualizar motorista.');
  return toDto(data as MotoristaRow);
}
