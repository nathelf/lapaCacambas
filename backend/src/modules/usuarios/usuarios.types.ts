import type { AppRole } from '../../../../shared/enums';

export type UsuarioDto = {
  id: string;
  email: string;
  nome: string | null;
  roles: AppRole[];
  ativo: boolean;
  createdAt: string;
  lastSignIn: string | null;
};

export type CreateUsuarioDto = {
  email: string;
  password: string;
  nome?: string;
  role: AppRole;
};

export type UpdateUsuarioDto = {
  email?: string;
  nome?: string;
  password?: string;
  roles?: AppRole[];
};

export type PatchUsuarioStatusDto = {
  ativo: boolean;
};

export type ListUsuariosQuery = {
  busca?: string;
};
