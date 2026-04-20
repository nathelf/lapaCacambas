import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Plus, Search, Eye, Loader2, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { useClientes } from '@/hooks/useQuery';
import { formatDocumento, formatTelefone } from '@/lib/formatters';

export default function ClientesPage() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [buscaAtiva, setBuscaAtiva] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const { data, isLoading } = useClientes(buscaAtiva || undefined, page);
  const clientes = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  const handleBusca = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setBuscaAtiva(busca.trim());
  };

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

      <form onSubmit={handleBusca} className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome, fantasia, CPF ou CNPJ..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-md border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button type="submit" variant="outline" size="sm">
          <Search className="w-4 h-4 mr-1" /> Buscar
        </Button>
        {buscaAtiva && (
          <Button type="button" variant="ghost" size="sm" onClick={() => { setBusca(''); setBuscaAtiva(''); setPage(1); }}>
            Limpar
          </Button>
        )}
      </form>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (clientes as any[]).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {buscaAtiva ? 'Nenhum cliente encontrado para a busca.' : 'Nenhum cliente cadastrado.'}
          </p>
          {!buscaAtiva && (
            <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate('/clientes/novo')}>
              <Plus className="w-4 h-4 mr-1" /> Cadastrar primeiro cliente
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-lg border overflow-x-auto">
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
              {(clientes as any[]).map((c: any) => (
                <tr
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/clientes/${c.id}`)}
                >
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} clientes · página {page} de {totalPages}</span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
