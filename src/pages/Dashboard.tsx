import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { AlertTriangle, Calendar, CheckCircle2, Container, CreditCard, Truck, Clock, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useDashboardStats, usePedidos, useUnidadesCacamba } from '@/hooks/useQuery';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessBackOffice } from '@/lib/permissions';
import { STATUS_CACAMBA_LABELS, STATUS_PEDIDO_LABELS } from '../../shared/enums';
import { formatMoeda, formatData } from '@/lib/formatters';

const CACAMBA_COLORS: Record<string, string> = {
  disponivel:   'hsl(142, 72%, 29%)',
  em_uso:       'hsl(199, 89%, 48%)',
  em_rota:      'hsl(217, 72%, 45%)',
  reservada:    'hsl(38, 92%, 50%)',
  manutencao:   'hsl(262, 52%, 47%)',
  indisponivel: 'hsl(0, 72%, 51%)',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { roles } = useAuth();
  const podePainel = canAccessBackOffice(roles);
  const today = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  const { data: stats, isLoading: loadingStats } = useDashboardStats(podePainel);
  const { data: pedidosRaw, isLoading: loadingPedidos } = usePedidos(undefined, podePainel);
  const pedidosRecentes = (pedidosRaw as any)?.data ?? [];
  const { data: unidades = [], isLoading: loadingUnidades } = useUnidadesCacamba(podePainel);

  // Calcular pedidos por status para o gráfico de barras
  const pedidosAll = pedidosRecentes;
  const statusCounts: Record<string, number> = {};
  pedidosAll.forEach((p: any) => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  });

  const pedidosBarData = [
    { name: STATUS_PEDIDO_LABELS['orcamento'],    value: statusCounts['orcamento']   || 0 },
    { name: STATUS_PEDIDO_LABELS['programado'],   value: statusCounts['programado']  || 0 },
    { name: STATUS_PEDIDO_LABELS['em_rota'],      value: statusCounts['em_rota']     || 0 },
    { name: STATUS_PEDIDO_LABELS['em_execucao'],  value: statusCounts['em_execucao'] || 0 },
    { name: STATUS_PEDIDO_LABELS['concluido'],    value: statusCounts['concluido']   || 0 },
    { name: STATUS_PEDIDO_LABELS['faturado'],     value: statusCounts['faturado']    || 0 },
  ];

  // Calcular caçambas por status para o gráfico de pizza
  const unidadesAll = unidades as any[];
  const cacambaStatusCounts: Record<string, number> = {};
  unidadesAll.forEach((u: any) => {
    cacambaStatusCounts[u.status] = (cacambaStatusCounts[u.status] || 0) + 1;
  });

  const cacambasPieData = Object.entries(cacambaStatusCounts).map(([status, value]) => ({
    name: STATUS_CACAMBA_LABELS[status as keyof typeof STATUS_CACAMBA_LABELS] || status,
    value,
    color: CACAMBA_COLORS[status] || 'hsl(var(--muted))',
  }));

  const kpis = [
    {
      label: 'PEDIDOS HOJE',
      value: loadingStats ? '...' : String(stats?.pedidosHoje ?? 0),
      sub: `${stats?.programados ?? 0} programados`,
      icon: Calendar,
      color: 'hsl(var(--primary))',
    },
    {
      label: 'EM ROTA',
      value: loadingStats ? '...' : String(stats?.emRota ?? 0),
      sub: 'em andamento',
      icon: Truck,
      color: 'hsl(var(--info))',
    },
    {
      label: 'CONCLUÍDOS',
      value: loadingStats ? '...' : String(stats?.concluidos ?? 0),
      sub: 'mês atual',
      icon: CheckCircle2,
      color: 'hsl(var(--success))',
    },
    {
      label: 'CAÇAMBAS CAMPO',
      value: loadingStats ? '...' : String(stats?.cacambasCampo ?? 0),
      sub: `de ${stats?.cacambasTotal ?? 0} total`,
      icon: Container,
      color: 'hsl(var(--primary))',
    },
    {
      label: 'PENDENTES',
      value: loadingStats ? '...' : String(stats?.programados ?? 0),
      sub: 'aguardando',
      icon: CreditCard,
      color: 'hsl(var(--warning))',
    },
    {
      label: 'FAT. VENCIDAS',
      value: loadingStats ? '...' : String(stats?.faturasVencidas ?? 0),
      sub: 'cobranças',
      icon: AlertTriangle,
      color: 'hsl(var(--destructive))',
    },
  ];

  const ultimosPedidos = pedidosAll.slice(0, 8);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader title="Dashboard Operacional" subtitle={`Visão geral da operação — ${today}`} />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="kpi-card">
              <div className="flex items-center justify-between">
                <span className="kpi-card-label">{kpi.label}</span>
                <Icon className="w-4 h-4" style={{ color: kpi.color }} />
              </div>
              <span className="kpi-card-value">
                {loadingStats ? <Loader2 className="w-4 h-4 animate-spin" /> : kpi.value}
              </span>
              {kpi.sub && <span className="kpi-card-sub">{kpi.sub}</span>}
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar chart */}
        <div className="lg:col-span-2 bg-card rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-4">Pedidos por Status</h3>
          {loadingPedidos ? (
            <div className="flex justify-center h-[220px] items-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={pedidosBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-4">Caçambas por Status</h3>
          {loadingUnidades ? (
            <div className="flex justify-center h-[180px] items-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : cacambasPieData.length === 0 ? (
            <div className="flex justify-center h-[180px] items-center text-muted-foreground text-sm">
              Sem dados
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={cacambasPieData}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {cacambasPieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {cacambasPieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-[11px]">
                    <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
                    {entry.name} ({entry.value})
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pedidos recentes */}
        <div className="lg:col-span-2 bg-card rounded-lg border">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h3 className="text-sm font-semibold">Pedidos Recentes</h3>
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => navigate('/pedidos')}
            >
              Ver todos
            </button>
          </div>
          {loadingPedidos ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : ultimosPedidos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum pedido encontrado.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Cliente</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th className="text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {ultimosPedidos.map((p: any) => (
                  <tr
                    key={p.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/pedidos/${p.id}`)}
                  >
                    <td className="font-mono text-xs font-medium">{p.numero}</td>
                    <td>{p.clienteNome || '—'}</td>
                    <td>{formatData(p.dataPedido)}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td className="text-right tabular-nums">
                      {formatMoeda(p.valorTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Alertas operacionais */}
        <div className="bg-card rounded-lg border">
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-semibold">Alertas Operacionais</h3>
          </div>
          <div className="px-4 py-2 space-y-0">
            {stats?.faturasVencidas ? (
              <div className="alert-item">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-destructive flex-shrink-0" />
                <div>
                  <div className="alert-item-title">{stats.faturasVencidas} fatura(s) vencida(s)</div>
                  <div className="alert-item-category">Financeiro</div>
                </div>
              </div>
            ) : null}
            {stats?.programados ? (
              <div className="alert-item">
                <Clock className="w-4 h-4 mt-0.5 text-info flex-shrink-0" />
                <div>
                  <div className="alert-item-title">{stats.programados} pedido(s) programado(s)</div>
                  <div className="alert-item-category">Operacional</div>
                </div>
              </div>
            ) : null}
            {stats?.emRota ? (
              <div className="alert-item">
                <Truck className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                <div>
                  <div className="alert-item-title">{stats.emRota} pedido(s) em rota</div>
                  <div className="alert-item-category">Operacional</div>
                </div>
              </div>
            ) : null}
            {!stats?.faturasVencidas && !stats?.programados && !stats?.emRota && !loadingStats && (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Nenhum alerta no momento.
              </div>
            )}
            {loadingStats && (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
