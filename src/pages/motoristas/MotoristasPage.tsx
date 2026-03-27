import { ModulePage } from '@/components/shared/ModulePage';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Loader2, User } from 'lucide-react';
import { useMotoristasAll } from '@/hooks/useQuery';

function categoriaCNH(m: any): string {
  const cats = [];
  if (m.categoria_a) cats.push('A');
  if (m.categoria_b) cats.push('B');
  if (m.categoria_c) cats.push('C');
  if (m.categoria_d) cats.push('D');
  if (m.categoria_e) cats.push('E');
  return cats.length ? cats.join(', ') : '—';
}

function cnhVencida(dataVenc: string | null): boolean {
  if (!dataVenc) return false;
  return new Date(dataVenc) < new Date();
}

export default function MotoristasPage() {
  const { data: motoristas = [], isLoading } = useMotoristasAll();

  if (isLoading) {
    return (
      <ModulePage title="Motoristas" subtitle="Cadastro e controle de motoristas" createLabel="Novo Motorista">
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </ModulePage>
    );
  }

  return (
    <ModulePage title="Motoristas" subtitle="Cadastro e controle de motoristas" createLabel="Novo Motorista">
      {(motoristas as any[]).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum motorista cadastrado.</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>CNH</th>
                <th>Categorias</th>
                <th>Vencimento CNH</th>
                <th>Telefone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(motoristas as any[]).map((m: any) => {
                const vencida = cnhVencida(m.data_vencimento_cnh);
                return (
                  <tr key={m.id} className="cursor-pointer">
                    <td className="font-medium">{m.nome}</td>
                    <td className="font-mono text-xs">{m.cpf || '—'}</td>
                    <td className="font-mono text-xs">{m.cnh || '—'}</td>
                    <td>{categoriaCNH(m)}</td>
                    <td>
                      {m.data_vencimento_cnh ? (
                        <span className={vencida ? 'text-destructive font-medium' : ''}>
                          {new Date(m.data_vencimento_cnh).toLocaleDateString('pt-BR')}
                          {vencida && ' ⚠'}
                        </span>
                      ) : '—'}
                    </td>
                    <td>{m.celular || m.telefone || '—'}</td>
                    <td><StatusBadge status={m.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </ModulePage>
  );
}
