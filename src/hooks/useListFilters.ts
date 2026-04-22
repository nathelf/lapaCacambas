import { useState, useEffect, useMemo, useCallback } from 'react';

export interface ListFiltersState<F extends Record<string, any>> {
  rawSearch: string;
  setSearch: (v: string) => void;
  filters: F & { search?: string };
  setFilter: <K extends keyof F>(key: K, value: F[K] | undefined) => void;
  resetFilters: () => void;
  page: number;
  setPage: (p: number) => void;
  hasActiveFilters: boolean;
}

/**
 * Hook genérico para gerenciar busca com debounce, filtros acumulados e paginação.
 *
 * - Debounce 300ms na busca (tecla a tecla → sem excesso de requisições)
 * - Limpar o campo dispara reset imediato (sem aguardar debounce)
 * - Qualquer mudança de busca ou filtro reseta a paginação para a página 1
 * - Filtros se acumulam (busca + status + tipo ao mesmo tempo)
 */
export function useListFilters<F extends Record<string, any>>(
  defaults?: Partial<F>,
  debounceMs = 300,
): ListFiltersState<F> {
  const [rawSearch, setRawSearchState] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFiltersState] = useState<Partial<F>>(defaults ?? {});
  const [page, setPageState] = useState(1);

  // Debounce: só propaga após o usuário parar de digitar
  useEffect(() => {
    if (!rawSearch.trim()) {
      // Limpou o campo → efeito imediato, sem esperar debounce
      setDebouncedSearch('');
      return;
    }
    const t = setTimeout(() => setDebouncedSearch(rawSearch.trim()), debounceMs);
    return () => clearTimeout(t);
  }, [rawSearch, debounceMs]);

  const setSearch = useCallback((v: string) => {
    setRawSearchState(v);
    setPageState(1); // sempre volta para a página 1 ao buscar
  }, []);

  const setFilter = useCallback(<K extends keyof F>(key: K, value: F[K] | undefined) => {
    setFiltersState(prev => {
      if (value === undefined || value === '') {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
    setPageState(1); // volta para a página 1 ao mudar filtro
  }, []);

  const resetFilters = useCallback(() => {
    setRawSearchState('');
    setDebouncedSearch('');
    setFiltersState(defaults ?? {});
    setPageState(1);
  }, [defaults]);

  const setPage = useCallback((p: number) => setPageState(p), []);

  const activeFilters = useMemo(
    () => ({
      ...filters,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    }) as F & { search?: string },
    [filters, debouncedSearch],
  );

  const hasActiveFilters =
    Boolean(debouncedSearch) ||
    Object.values(filters).some(v => v !== undefined && v !== '');

  return {
    rawSearch,
    setSearch,
    filters: activeFilters,
    setFilter,
    resetFilters,
    page,
    setPage,
    hasActiveFilters,
  };
}
