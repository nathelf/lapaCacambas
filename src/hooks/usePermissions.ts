import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  type AppRole,
  checkPermission,
  canAccessBackOffice,
  isDriverOnlyUser,
} from '@/lib/permissions';

export function usePermissions() {
  const { roles } = useAuth();
  return useMemo(
    () => ({
      roles,
      checkPermission: (required: AppRole | AppRole[]) => checkPermission(roles, required),
      canAccessBackOffice: canAccessBackOffice(roles),
      isDriverOnlyUser: isDriverOnlyUser(roles),
    }),
    [roles],
  );
}
