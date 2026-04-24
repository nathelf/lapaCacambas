/**
 * Papéis alinhados ao enum `app_role` no Postgres (migrations).
 */
export const APP_ROLES = [
  'administrador',
  'atendimento',
  'financeiro',
  'fiscal',
  'operador',
  'motorista',
  'gestor',
] as const;

export type AppRole = (typeof APP_ROLES)[number];

/** Papéis com acesso ao painel administrativo (fora do app motorista isolado). */
export const BACKOFFICE_ROLES: readonly AppRole[] = [
  'administrador',
  'atendimento',
  'financeiro',
  'fiscal',
  'operador',
  'gestor',
];

export function checkPermission(userRoles: string[], required: AppRole | AppRole[]): boolean {
  const need = Array.isArray(required) ? required : [required];
  return need.some((r) => userRoles.includes(r));
}

export function canAccessBackOffice(userRoles: string[]): boolean {
  return BACKOFFICE_ROLES.some((r) => userRoles.includes(r));
}

/** Tem papel motorista e nenhum papel de escritório — só deve usar /motorista. */
export function isDriverOnlyUser(userRoles: string[]): boolean {
  if (!userRoles.includes('motorista')) return false;
  return !canAccessBackOffice(userRoles);
}
