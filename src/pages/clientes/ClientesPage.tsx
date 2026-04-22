import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchBar } from '@/components/shared/SearchBar';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Plus, Eye, Loader2, Users, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useClientes } from '@/hooks/useQuery';
import { useListFilters } from '@/hooks/useListFilters';
import { formatDocumento, formatTelefone } from '@/lib/formatters';

const LIMIT = 20;

const STATUS_OPTIONS = [
  { value: '',         label: 'Todos os status' },
  { value: 'ativo',    label: 'Ativo' },
  { value: 'inativo',  label: 'Inativo' },
  { value: 'bloqueado', label: 'Bloqueado' },
];

const TIPO_OPTIONS = [
  { value: '',   label: 'PF e PJ' },
  { value: 'pf', label: 'Pessoa Física' },
  { value: 'pj', label: 'Pessoa Jurídica' },
];

export default function ClientesPage() {
  const navigate = useNavigate();

  const { rawSearch, setSearch, filters, setFilter, resetFilters, page, setPage, hasActiveFilters } =
    useListFilters<{ status?: string; tipo?: string }>();

  const { data, isLoading, isFetching } = useClientes({
    search:  filters.search,
    status:  filters.status,
    tipo:    filters.tipo,
    page,
    limit:   LIMIT,
  });

  const clientes: any[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Clientes"
        subtitle="Gestão de clientes e cadastros"
        actions={
          <Button size="sm" onClick={() => navigate('/clientes/novo')}>
            <Plus className="w-4 h-4 mr-1" /> Novo Cliente
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchBar
          value={rawSearch}
          onChange={setSearch}
          placeholder="Buscar por nome, fantasia, CPF ou CNPJ..."
          isLoading={isFetching && !!rawSearch}
          className="max-w-sm"
        />

        <select
          value={filters.status ?? ''}
          onChange={e => setFilter('status', e.target.value || undefined)}
          className="h-9 px-3 rounded-md border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          value={filters.tipo ?? ''}
          onChange={e => setFilter('tipo', e.target.value || undefined)}
          className="h-9 px-3 rounded-md border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {TIPO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground">
            <X className="w-3.5 h-3.5 mr-1" /> Limpar filtros
          </Button>
        )}
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : clientes.length === 0 ? (
        <EmptyState
          icon={<Users className="w-10 h-10" />}
          message="Nenhum cliente cadastrado"
          description="Cadastre um cliente para começar"
          searchTerm={filters.search}
          hasFilters={hasActiveFilters}
          onClearFilters={hasActiveFilters ? resetFilters : undefined}
          action={
            <Button size="sm" onClick={() => navigate('/clientes/novo')}>
              <Plus className="w-4 h-4 mr-1" /> Cadastrar primeiro cliente
            </Button>
          }
        />
      ) : (
        <div className={`bg-card rounded-lg border overflow-x-auto transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome / Razão Social</th>
                <th>Fantasia</th>
                <th>Tipo</th>
                <th>CPF / CNPJ</th>
                <th>Telefone</th>
                <th>Cidade / UF</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c: any) => (
                <tr key={c.id} className="cursor-pointer" onClick={() => navigate(`/clientes/${c.id}`)}>
                  <td className="font-medium">{c.nome}</td>
                  <td>{c.fantasia || '—'}</td>
                  <td>{c.tipo === 'pj' ? 'PJ' : 'PF'}</td>
                  <td className="font-mono text-xs">{formatDocumento(c.cnpj || c.cpf)}</td>
                  <td>{formatTelefone(c.telefone || c.celular)}</td>
                  <td>{c.cidade ? `${c.cidade}/${c.estado}` : '—'}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={e => { e.stopPropagation(); navigate(`/clientes/${c.id}`); }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} clientes · página {page} de {totalPages}</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
