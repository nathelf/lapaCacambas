import { supabaseAdmin, supabaseAuth } from '../../lib/supabase';
import type { AuthResponse, LoginDto, RefreshDto } from './auth.types';

// Busca os roles do usuário na tabela user_roles
async function getUserRoles(userId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (error) throw new Error('Falha ao buscar roles do usuário.');
  return (data ?? []).map((r: any) => String(r.role));
}

// Recebe email e senha, autentica no Supabase, devolve tokens + dados do usuário
export async function login(dto: LoginDto): Promise<AuthResponse> {
  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email: dto.email,
    password: dto.password,
  });

  if (error || !data.session || !data.user) {
    throw new Error('Email ou senha inválidos.');
  }

  const roles = await getUserRoles(data.user.id);

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
      roles,
    },
  };
}

// Recebe um refresh_token válido e devolve um novo par de tokens
export async function refresh(dto: RefreshDto): Promise<AuthResponse> {
  const { data, error } = await supabaseAuth.auth.refreshSession({
    refresh_token: dto.refresh_token,
  });

  if (error || !data.session || !data.user) {
    throw new Error('Refresh token inválido ou expirado.');
  }

  const roles = await getUserRoles(data.user.id);

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
      roles,
    },
  };
}

// Encerra a sessão do usuário no Supabase
export async function logout(accessToken: string): Promise<void> {
  // Cria um client temporário com o token do usuário para encerrar a sessão correta
  const { error } = await supabaseAuth.auth.admin.signOut(accessToken);
  if (error) throw new Error('Falha ao encerrar sessão.');
}
