import { useTenant } from '@/contexts/TenantContext';

/**
 * Retorna true se o tenant atual tem a feature habilitada.
 * Enquanto o tenant está carregando, retorna false (safe default).
 *
 * Uso:
 *   const temFrotas = useFeature('frotas');
 *   if (!temFrotas) return <Navigate to="/404" />;
 */
export function useFeature(feature: string): boolean {
  const { tenant, loading } = useTenant();
  if (loading || !tenant) return false;
  return tenant.enabled_features.includes(feature);
}

/**
 * Retorna true se o tenant tem TODAS as features listadas.
 */
export function useFeatures(...features: string[]): boolean {
  const { tenant, loading } = useTenant();
  if (loading || !tenant) return false;
  return features.every((f) => tenant.enabled_features.includes(f));
}
