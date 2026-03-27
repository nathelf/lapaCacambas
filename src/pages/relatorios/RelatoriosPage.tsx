import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  BarChart2, FileText, Download, Loader2, FileSpreadsheet,
  Printer, Filter, RefreshCw, AlertTriangle
} from 'lucide-react';
import {
  useRelatorioOperacional, useRelatorioFinanceiro,
  useRelatorioBoletosEmitidos, useRelatorioInadimplencia,
  useClientes,
} from '@/hooks/useQuery';
import type { FiltrosRelatorio } from '@/lib/api';

// ===== UTILITÁRIOS DE EXPORTAÇÃO =====

function exportToCSV(data: any[], filename: string, cols: { key: string; header: string }[]) {
  const header = cols.map(c => `"${c.header}"`).join(',');
  const rows = data.map(row =>
    cols.map(c => {
      const val = c.key.split('.').reduce((o: any, k) => o?.[k], row);
      return `"${String(val ?? '').replace(/"/g, '""')}"`;
    }).join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function exportToPDF(title: string, subtitulo: string, tableId: string) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`
    <html><head><title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
      h1 { font-size: 16px; margin-bottom: 4px; }
      h2 { font-size: 12px; color: #666; margin-bottom: 16px; font-weight: normal; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #f0f0f0; border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 10px; }
      td { border: 1px solid #ddd; padding: 5px 8px; font-size: 10px; }
      tr:nth-child(even) td { background: #fafafa; }
      .total-row td { font-weight: bold; background: #e8f0fe; }
    </style></head>
    <body><h1>${title}</h1><h2>${subtitulo}</h2>
    ${table.outerHTML}
    </body></html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 500);
}

function fmtBrl(v: number | string | null | undefined): string {
  return `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function fmtData(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

// ===== COMPONENTE PRINCIPAL =====

type TabId = 'operacional' | 'financeiro' | 'boletos' | 'inadimplencia';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'operacional',   label: 'Operacional',   icon: BarChart2 },
  { id: 'financeiro',    label: 'Financeiro',    icon: FileText },
  { id: 'boletos',       label: 'Boletos',       icon: FileSpreadsheet },
  { id: 'inadimplencia', label: 'Inadimplência', icon: AlertTriangle },
];

export default function RelatoriosPage() {
  const [tab, setTab] = useState<TabId>('operacional');

  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [filtros, setFiltros] = useState<FiltrosRelatorio>({
    dataInicio: firstOfMonth,
    dataFim: today,
  });
  const [clienteId, setClienteId] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [aplicados, setAplicados] = useState<FiltrosRelatorio>({
    dataInicio: firstOfMonth,
    dataFim: today,
  });
  const [hasSearched, setHasSearched] = useState(false);

  const { data: clientes = [] } = useClientes();

  const { data: operacional = [], isLoading: loadOp, refetch: refetchOp } = useRelatorioOperacional(aplicados, hasSearched && tab === 'operacional');
  const { data: financeiro = [], isLoading: loadFin, refetch: refetchFin } = useRelatorioFinanceiro(aplicados, hasSearched && tab === 'financeiro');
  const { data: boletos = [], isLoading: loadBol, refetch: refetchBol } = useRelatorioBoletosEmitidos(aplicados, hasSearched && tab === 'boletos');
  const { data: inadimplencia = [], isLoading: loadInad, refetch: refetchInad } = useRelatorioInadimplencia(aplicados, hasSearched && tab === 'inadimplencia');

  const handleAplicar = () => {
    const f: FiltrosRelatorio = {
      dataInicio: filtros.dataInicio,
      dataFim: filtros.dataFim,
      clienteId: clienteId ? Number(clienteId) : undefined,
      status: statusFiltro || undefined,
    };
    setAplicados(f);
    setHasSearched(true);
    // Refetch conforme a tab ativa
    setTimeout(() => {
      if (tab === 'operacional') refetchOp();
      else if (tab === 'financeiro') refetchFin();
      else if (tab === 'boletos') refetchBol();
      else refetchInad();
    }, 50);
  };

  const isLoading = tab === 'operacional' ? loadOp
    : tab === 'financeiro' ? loadFin
    : tab === 'boletos' ? loadBol
    : loadInad;

  // ===== RENDERIZAÇÃO DAS TABELAS =====

  const renderOperacional = () => {
    const rows = operacional as any[];
    const total = rows.reduce((s: number, r: any) => s + Number(r.valor_total || 0), 0);

    const cols = [
      { key: 'numero', header: 'Número' },
      { key: 'clientes.nome', header: 'Cliente' },
      { key: 'enderecos_entrega.endereco', header: 'Endereço' },
      { key: 'enderecos_entrega.cidade', header: 'Cidade' },
      { key: 'cacambas.descricao', header: 'Caçamba' },
      { key: 'tipo_locacao', header: 'Locação' },
      { key: 'status', header: 'Status' },
      { key: 'data_pedido', header: 'Data' },
      { key: 'valor_total', header: 'Valor' },
    ];

    return (
      <>
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-muted-foreground">{rows.length} registro(s)</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => exportToCSV(rows, 'relatorio-operacional', cols)}>
              <Download className="w-3.5 h-3.5 mr-1" /> Excel/CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportToPDF('Relatório Operacional', `Período: ${fmtData(aplicados.dataInicio)} a ${fmtData(aplicados.dataFim)}`, 'table-operacional')}>
              <Printer className="w-3.5 h-3.5 mr-1" /> PDF
            </Button>
          </div>
        </div>
        {rows.length === 0 ? emptyState() : (
          <div className="bg-card rounded-lg border overflow-x-auto">
            <table id="table-operacional" className="data-table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Cliente</th>
                  <th>Endereço</th>
                  <th>Caçamba</th>
                  <th>Locação</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th className="text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id}>
                    <td className="font-mono text-xs font-medium">{r.numero}</td>
                    <td>{r.clientes?.nome || '—'}</td>
                    <td className="text-xs">
                      {[r.enderecos_entrega?.endereco, r.enderecos_entrega?.cidade].filter(Boolean).join(' — ') || '—'}
                    </td>
                    <td>{r.cacambas?.descricao || '—'}</td>
                    <td>{r.tipo_locacao}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>{fmtData(r.data_pedido)}</td>
                    <td className="text-right tabular-nums">{fmtBrl(r.valor_total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="total-row font-bold">
                  <td colSpan={7} className="text-right font-bold">TOTAL</td>
                  <td className="text-right tabular-nums font-bold">{fmtBrl(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </>
    );
  };

  const renderFinanceiro = () => {
    const rows = financeiro as any[];
    const totalBruto = rows.reduce((s: number, r: any) => s + Number(r.valor_bruto || 0), 0);
    const totalLiquido = rows.reduce((s: number, r: any) => s + Number(r.valor_liquido || 0), 0);
    const totalPago = rows.filter((r: any) => r.status === 'paga').reduce((s: number, r: any) => s + Number(r.valor_baixa || r.valor_liquido || 0), 0);

    const cols = [
      { key: 'numero', header: 'Número' },
      { key: 'clientes.nome', header: 'Cliente' },
      { key: 'data_emissao', header: 'Emissão' },
      { key: 'data_vencimento', header: 'Vencimento' },
      { key: 'forma_cobranca', header: 'Forma' },
      { key: 'status', header: 'Status' },
      { key: 'valor_bruto', header: 'Valor Bruto' },
      { key: 'valor_liquido', header: 'Valor Líquido' },
    ];

    return (
      <>
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Total Faturado', value: fmtBrl(totalBruto), color: 'text-primary' },
            { label: 'Total Líquido',  value: fmtBrl(totalLiquido), color: 'text-foreground' },
            { label: 'Total Recebido', value: fmtBrl(totalPago), color: 'text-success' },
          ].map(k => (
            <div key={k.label} className="bg-card border rounded-lg p-3">
              <span className="text-xs text-muted-foreground block">{k.label}</span>
              <span className={`text-base font-bold ${k.color}`}>{k.value}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-muted-foreground">{rows.length} fatura(s)</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => exportToCSV(rows, 'relatorio-financeiro', cols)}>
              <Download className="w-3.5 h-3.5 mr-1" /> Excel/CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportToPDF('Relatório Financeiro', `Período: ${fmtData(aplicados.dataInicio)} a ${fmtData(aplicados.dataFim)}`, 'table-financeiro')}>
              <Printer className="w-3.5 h-3.5 mr-1" /> PDF
            </Button>
          </div>
        </div>

        {rows.length === 0 ? emptyState() : (
          <div className="bg-card rounded-lg border overflow-x-auto">
            <table id="table-financeiro" className="data-table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Cliente</th>
                  <th>Emissão</th>
                  <th>Vencimento</th>
                  <th>Forma</th>
                  <th>Status</th>
                  <th className="text-right">Bruto</th>
                  <th className="text-right">Líquido</th>
                  <th className="text-right">Pago</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id}>
                    <td className="font-mono text-xs font-medium">{r.numero}</td>
                    <td>{r.clientes?.nome || '—'}</td>
                    <td>{fmtData(r.data_emissao)}</td>
                    <td className={
                      r.status !== 'paga' && r.data_vencimento && new Date(r.data_vencimento) < new Date()
                        ? 'text-destructive font-medium'
                        : ''
                    }>
                      {fmtData(r.data_vencimento)}
                    </td>
                    <td>{r.forma_cobranca || '—'}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="text-right tabular-nums">{fmtBrl(r.valor_bruto)}</td>
                    <td className="text-right tabular-nums">{fmtBrl(r.valor_liquido)}</td>
                    <td className="text-right tabular-nums">
                      {r.status === 'paga' ? fmtBrl(r.valor_baixa || r.valor_liquido) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td colSpan={6} className="text-right font-bold">TOTAL</td>
                  <td className="text-right tabular-nums font-bold">{fmtBrl(totalBruto)}</td>
                  <td className="text-right tabular-nums font-bold">{fmtBrl(totalLiquido)}</td>
                  <td className="text-right tabular-nums font-bold">{fmtBrl(totalPago)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </>
    );
  };

  const renderBoletos = () => {
    const rows = boletos as any[];
    const totalEmitido = rows.reduce((s: number, r: any) => s + Number(r.valor || 0), 0);
    const totalPago = rows.filter((r: any) => r.status === 'pago').reduce((s: number, r: any) => s + Number(r.valor_pago || r.valor || 0), 0);

    const cols = [
      { key: 'nosso_numero', header: 'Nosso Número' },
      { key: 'clientes.nome', header: 'Cliente' },
      { key: 'faturas.numero', header: 'Fatura' },
      { key: 'data_emissao', header: 'Emissão' },
      { key: 'data_vencimento', header: 'Vencimento' },
      { key: 'valor', header: 'Valor' },
      { key: 'status', header: 'Status' },
    ];

    return (
      <>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: 'Total Emitido', value: fmtBrl(totalEmitido) },
            { label: 'Total Recebido', value: fmtBrl(totalPago) },
          ].map(k => (
            <div key={k.label} className="bg-card border rounded-lg p-3">
              <span className="text-xs text-muted-foreground block">{k.label}</span>
              <span className="text-base font-bold">{k.value}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-muted-foreground">{rows.length} boleto(s)</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => exportToCSV(rows, 'relatorio-boletos', cols)}>
              <Download className="w-3.5 h-3.5 mr-1" /> Excel/CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportToPDF('Relatório de Boletos', `Período: ${fmtData(aplicados.dataInicio)} a ${fmtData(aplicados.dataFim)}`, 'table-boletos')}>
              <Printer className="w-3.5 h-3.5 mr-1" /> PDF
            </Button>
          </div>
        </div>

        {rows.length === 0 ? emptyState() : (
          <div className="bg-card rounded-lg border overflow-x-auto">
            <table id="table-boletos" className="data-table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Cliente</th>
                  <th>Fatura</th>
                  <th>Emissão</th>
                  <th>Vencimento</th>
                  <th className="text-right">Valor</th>
                  <th>Status</th>
                  <th>Pgto</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id}>
                    <td className="font-mono text-xs">{r.nosso_numero || `#${r.id}`}</td>
                    <td>{r.clientes?.nome || '—'}</td>
                    <td className="font-mono text-xs">{r.faturas?.numero || '—'}</td>
                    <td>{fmtData(r.data_emissao)}</td>
                    <td className={
                      r.status !== 'pago' && r.data_vencimento && new Date(r.data_vencimento) < new Date()
                        ? 'text-destructive font-medium'
                        : ''
                    }>
                      {fmtData(r.data_vencimento)}
                    </td>
                    <td className="text-right tabular-nums">{fmtBrl(r.valor)}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>{r.data_pagamento ? fmtData(r.data_pagamento) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td colSpan={5} className="text-right font-bold">TOTAL</td>
                  <td className="text-right tabular-nums font-bold">{fmtBrl(totalEmitido)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </>
    );
  };

  const renderInadimplencia = () => {
    const rows = inadimplencia as any[];
    const totalAberto = rows.reduce((s: number, r: any) => s + Number(r.valor_liquido || 0), 0);

    const today = new Date();
    const calcDiasVencido = (dataVenc: string) => {
      const d = new Date(dataVenc);
      return Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    };

    const cols = [
      { key: 'numero', header: 'Fatura' },
      { key: 'clientes.nome', header: 'Cliente' },
      { key: 'data_vencimento', header: 'Vencimento' },
      { key: 'valor_liquido', header: 'Valor' },
      { key: 'status', header: 'Status' },
    ];

    return (
      <>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <span className="text-xs text-muted-foreground block">Total em Aberto / Vencido</span>
            <span className="text-base font-bold text-destructive">{fmtBrl(totalAberto)}</span>
          </div>
          <div className="bg-card border rounded-lg p-3">
            <span className="text-xs text-muted-foreground block">Clientes Inadimplentes</span>
            <span className="text-base font-bold">
              {new Set(rows.map((r: any) => r.clientes?.id)).size}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-muted-foreground">{rows.length} fatura(s) em aberto</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => exportToCSV(rows, 'relatorio-inadimplencia', cols)}>
              <Download className="w-3.5 h-3.5 mr-1" /> Excel/CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportToPDF('Relatório de Inadimplência', `Gerado em ${fmtData(new Date().toISOString().split('T')[0])}`, 'table-inadimplencia')}>
              <Printer className="w-3.5 h-3.5 mr-1" /> PDF
            </Button>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium text-success">Nenhuma inadimplência encontrada! ✓</p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border overflow-x-auto">
            <table id="table-inadimplencia" className="data-table">
              <thead>
                <tr>
                  <th>Fatura</th>
                  <th>Cliente</th>
                  <th>Contato</th>
                  <th>Vencimento</th>
                  <th>Dias Vencido</th>
                  <th className="text-right">Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => {
                  const dias = calcDiasVencido(r.data_vencimento);
                  return (
                    <tr key={r.id}>
                      <td className="font-mono text-xs font-medium">{r.numero}</td>
                      <td>{r.clientes?.nome || '—'}</td>
                      <td className="text-xs">{r.clientes?.telefone || r.clientes?.celular || r.clientes?.email || '—'}</td>
                      <td className="text-destructive font-medium">{fmtData(r.data_vencimento)}</td>
                      <td className="text-destructive font-bold text-center">{dias}d</td>
                      <td className="text-right tabular-nums font-bold text-destructive">
                        {fmtBrl(r.valor_liquido)}
                      </td>
                      <td><StatusBadge status={r.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td colSpan={5} className="text-right font-bold">TOTAL</td>
                  <td className="text-right tabular-nums font-bold text-destructive">{fmtBrl(totalAberto)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </>
    );
  };

  const emptyState = () => (
    <div className="text-center py-12 text-muted-foreground">
      <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="text-sm">Nenhum dado para o período e filtros selecionados.</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Relatórios"
        subtitle="Relatórios operacionais e financeiros com exportação"
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="bg-card rounded-lg border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Filtros</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Data Início</Label>
            <Input
              type="date"
              value={filtros.dataInicio || ''}
              onChange={e => setFiltros(f => ({ ...f, dataInicio: e.target.value || undefined }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Data Fim</Label>
            <Input
              type="date"
              value={filtros.dataFim || ''}
              onChange={e => setFiltros(f => ({ ...f, dataFim: e.target.value || undefined }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cliente</Label>
            <select
              value={clienteId}
              onChange={e => setClienteId(e.target.value)}
              className="w-full h-9 px-3 rounded-md border bg-background text-sm"
            >
              <option value="">Todos</option>
              {(clientes as any[]).map((c: any) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          {(tab === 'operacional' || tab === 'financeiro') && (
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <select
                value={statusFiltro}
                onChange={e => setStatusFiltro(e.target.value)}
                className="w-full h-9 px-3 rounded-md border bg-background text-sm"
              >
                <option value="">Todos</option>
                {tab === 'operacional' ? (
                  <>
                    <option value="orcamento">Orçamento</option>
                    <option value="programado">Programado</option>
                    <option value="em_rota">Em Rota</option>
                    <option value="em_execucao">Em Execução</option>
                    <option value="concluido">Concluído</option>
                    <option value="faturado">Faturado</option>
                    <option value="cancelado">Cancelado</option>
                  </>
                ) : (
                  <>
                    <option value="aberta">Aberta</option>
                    <option value="paga">Paga</option>
                    <option value="vencida">Vencida</option>
                    <option value="cancelada">Cancelada</option>
                  </>
                )}
              </select>
            </div>
          )}
          <Button
            size="sm"
            onClick={handleAplicar}
            className="self-end"
            disabled={isLoading}
          >
            {isLoading
              ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              : <RefreshCw className="w-4 h-4 mr-1" />
            }
            Gerar Relatório
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setFiltros({ dataInicio: firstOfMonth, dataFim: today });
              setClienteId(''); setStatusFiltro('');
              setHasSearched(false);
            }}
            className="self-end"
          >
            Limpar
          </Button>
        </div>
      </div>

      {/* Conteúdo */}
      <div>
        {!hasSearched ? (
          <div className="text-center py-16 text-muted-foreground">
            <BarChart2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-sm">Configure os filtros e clique em <strong>Gerar Relatório</strong> para visualizar os dados.</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {tab === 'operacional'   && renderOperacional()}
            {tab === 'financeiro'    && renderFinanceiro()}
            {tab === 'boletos'       && renderBoletos()}
            {tab === 'inadimplencia' && renderInadimplencia()}
          </>
        )}
      </div>
    </div>
  );
}
