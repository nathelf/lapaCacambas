import { supabaseAdmin } from '../../lib/supabase';
import type { AppRole } from '../../../../shared/enums';
import type {
  UsuarioDto,
  CreateUsuarioDto,
  UpdateUsuarioDto,
  PatchUsuarioStatusDto,
  ListUsuariosQuery,
} from './usuarios.types';

async function getRoles(userId: string): Promise<AppRole[]> {
  const { data } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
  return (data ?? []).map((r: any) => r.role as AppRole);
}

function toDto(user: any, roles: AppRole[]): UsuarioDto {
  return {
    id: user.id,
    email: user.email ?? '',
    nome: user.user_metadata?.nome ?? user.user_metadata?.full_name ?? null,
    roles,
    ativo: !user.banned_until || new Date(user.banned_until) < new Date(),
    createdAt: user.created_at,
    lastSignIn: user.last_sign_in_at ?? null,
  };
}

export async function listar(query: ListUsuariosQuery): Promise<UsuarioDto[]> {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error('Falha ao listar usuários.');

  let users = data.users;

  if (query.busca) {
    const term = query.busca.toLowerCase();
    users = users.filter(
      (u) =>
        u.email?.toLowerCase().includes(term) ||
        (u.user_metadata?.nome as string | undefined)?.toLowerCase().includes(term),
    );
  }

  const dtos = await Promise.all(
    users.map(async (u) => {
      const roles = await getRoles(u.id);
      return toDto(u, roles);
    }),
  );

  return dtos.sort((a, b) => (a.email < b.email ? -1 : 1));
}

export async function buscarPorId(id: string): Promise<UsuarioDto> {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);
  if (error || !data.user) throw new Error('Usuário não encontrado.');

  const roles = await getRoles(id);
  return toDto(data.user, roles);
}

export async function criar(dto: CreateUsuarioDto): Promise<UsuarioDto> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: dto.email,
    password: dto.password,
    user_metadata: dto.nome ? { nome: dto.nome } : {},
    email_confirm: true,
  });

  if (error || !data.user) throw new Error(error?.message ?? 'Falha ao criar usuário.');

  const userId = data.user.id;

  const { error: roleError } = await supabaseAdmin
    .from('user_roles')
    .insert({ user_id: userId, role: dto.role });

  if (roleError) {
    // Rollback: remover o usuário recém-criado
    await supabaseAdmin.auth.admin.deleteUser(userId);
    throw new Error('Falha ao atribuir perfil ao usuário.');
  }

  return buscarPorId(userId);
}

export async function atualizar(id: string, dto: UpdateUsuarioDto): Promise<UsuarioDto> {
  const updates: Record<string, any> = {};

  if (dto.email) updates.email = dto.email;
  if (dto.password) updates.password = dto.password;
  if (dto.nome !== undefined) updates.user_metadata = { nome: dto.nome };

  if (Object.keys(updates).length > 0) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, updates);
    if (error) throw new Error(error.message ?? 'Falha ao atualizar usuário.');
  }

  if (dto.roles !== undefined) {
    const { error: delError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', id);
    if (delError) throw new Error('Falha ao atualizar perfis do usuário.');

    if (dto.roles.length > 0) {
      const rows = dto.roles.map((role) => ({ user_id: id, role }));
      const { error: insError } = await supabaseAdmin.from('user_roles').insert(rows);
      if (insError) throw new Error('Falha ao atribuir perfis ao usuário.');
    }
  }

  return buscarPorId(id);
}

export async function patchStatus(id: string, dto: PatchUsuarioStatusDto): Promise<UsuarioDto> {
  const banDuration = dto.ativo ? 'none' : '876600h';
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    ban_duration: banDuration,
  });
  if (error) throw new Error(error.message ?? 'Falha ao alterar status do usuário.');
  return buscarPorId(id);
}

export async function remover(id: string): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message ?? 'Falha ao remover usuário.');
}
