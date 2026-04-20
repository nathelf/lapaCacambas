/**
 * shared/enums.ts — Fonte única de verdade para todos os enums do sistema.
 *
 * Estes enums espelham exatamente os tipos definidos no banco de dados
 * (ver supabase/migrations/20260327122540_*.sql).
 *
 * Frontend  → importa daqui (não use src/types/enums.ts)
 * Backend   → importa daqui
 * DB        → fonte autoritativa, este arquivo deve sempre ser mantido em sincronia
 */

// ─── Clientes ────────────────────────────────────────────────────────────────

export enum StatusCliente {
  ATIVO    = 'ativo',
  INATIVO  = 'inativo',
  BLOQUEADO = 'bloqueado',
}

export enum TipoCliente {
  PF = 'pf',
  PJ = 'pj',
}

// ─── Pedidos ─────────────────────────────────────────────────────────────────

export enum StatusPedido {
  ORCAMENTO            = 'orcamento',
  AGUARDANDO_APROVACAO = 'aguardando_aprovacao',
  APROVADO             = 'aprovado',
  PENDENTE_PROGRAMACAO = 'pendente_programacao',
  PROGRAMADO           = 'programado',
  EM_ROTA              = 'em_rota',
  EM_EXECUCAO          = 'em_execucao',
  CONCLUIDO            = 'concluido',
  FATURADO             = 'faturado',
  CANCELADO            = 'cancelado',
}

export enum TipoPedido {
  ENTREGA_CACAMBA  = 'entrega_cacamba',
  RETIRADA         = 'retirada',
  TROCA            = 'troca',
  RECOLHIMENTO     = 'recolhimento',
  LOCACAO_MAQUINA  = 'locacao_maquina',
  TERRAPLANAGEM    = 'terraplanagem',
  DEMOLICAO        = 'demolicao',
  VENDA_MATERIAL   = 'venda_material',
  HORA_MAQUINA     = 'hora_maquina',
  DIARIA           = 'diaria',
  MENSAL           = 'mensal',
  RENOVACAO        = 'renovacao',
}

export enum TipoLocacao {
  DIA      = 'dia',
  SEMANA   = 'semana',
  QUINZENA = 'quinzena',
  MES      = 'mes',
}

// ─── Ativos ───────────────────────────────────────────────────────────────────

export enum StatusCacamba {
  DISPONIVEL   = 'disponivel',
  EM_USO       = 'em_uso',
  EM_ROTA      = 'em_rota',
  RESERVADA    = 'reservada',
  MANUTENCAO   = 'manutencao',
  INDISPONIVEL = 'indisponivel',
}

export enum StatusVeiculo {
  DISPONIVEL   = 'disponivel',
  EM_OPERACAO  = 'em_operacao',
  MANUTENCAO   = 'manutencao',
  INDISPONIVEL = 'indisponivel',
}

// ─── Motoristas ───────────────────────────────────────────────────────────────

export enum StatusMotorista {
  ATIVO    = 'ativo',
  INATIVO  = 'inativo',
  FERIAS   = 'ferias',
  AFASTADO = 'afastado',
  BLOQUEADO = 'bloqueado',
}

// ─── Financeiro ───────────────────────────────────────────────────────────────

export enum StatusFatura {
  ABERTA      = 'aberta',
  PAGA        = 'paga',
  PAGA_PARCIAL = 'paga_parcial',
  VENCIDA     = 'vencida',
  CANCELADA   = 'cancelada',
  PROTESTO    = 'protesto',
}

export enum StatusBoleto {
  PENDENTE    = 'pendente',
  EMITIDO     = 'emitido',
  ENVIADO     = 'enviado',
  VENCIDO     = 'vencido',
  PAGO        = 'pago',
  CANCELADO   = 'cancelado',
  RENEGOCIADO = 'renegociado',
}

export enum StatusConta {
  ABERTA    = 'aberta',
  PAGA      = 'paga',
  VENCIDA   = 'vencida',
  CANCELADA = 'cancelada',
}

export enum TipoFluxo {
  ENTRADA = 'entrada',
  SAIDA   = 'saida',
}

// ─── Fiscal ───────────────────────────────────────────────────────────────────

/** Espelha o tipo `status_nota_fiscal` do banco */
export enum StatusNotaFiscal {
  NAO_EMITIDA  = 'nao_emitida',
  PENDENTE     = 'pendente',
  PROCESSANDO  = 'processando',
  EMITIDA      = 'emitida',
  CANCELADA    = 'cancelada',
  ERRO         = 'erro',
  SUBSTITUIDA  = 'substituida',
}

// ─── Materiais ────────────────────────────────────────────────────────────────

export enum StatusMaterial {
  ATIVO   = 'ativo',
  INATIVO = 'inativo',
}

// ─── Execução de Pedido ───────────────────────────────────────────────────────

export enum StatusExecucao {
  PENDENTE   = 'pendente',
  EM_ROTA    = 'em_rota',
  NO_LOCAL   = 'no_local',
  EXECUTANDO = 'executando',
  CONCLUIDA  = 'concluida',
  CANCELADA  = 'cancelada',
}

// ─── Ocorrências ──────────────────────────────────────────────────────────────

export enum StatusOcorrencia {
  ABERTA       = 'aberta',
  EM_ANDAMENTO = 'em_andamento',
  RESOLVIDA    = 'resolvida',
  FECHADA      = 'fechada',
}

// ─── RBAC ─────────────────────────────────────────────────────────────────────

export enum AppRole {
  ADMINISTRADOR = 'administrador',
  ATENDIMENTO   = 'atendimento',
  FINANCEIRO    = 'financeiro',
  FISCAL        = 'fiscal',
  OPERADOR      = 'operador',
  MOTORISTA     = 'motorista',
  GESTOR        = 'gestor',
}

// ─── Labels (exibição em português) ──────────────────────────────────────────

export const STATUS_PEDIDO_LABELS: Record<StatusPedido, string> = {
  [StatusPedido.ORCAMENTO]:            'Orçamento',
  [StatusPedido.AGUARDANDO_APROVACAO]: 'Aguardando Aprovação',
  [StatusPedido.APROVADO]:             'Aprovado',
  [StatusPedido.PENDENTE_PROGRAMACAO]: 'Pendente Programação',
  [StatusPedido.PROGRAMADO]:           'Programado',
  [StatusPedido.EM_ROTA]:              'Em Rota',
  [StatusPedido.EM_EXECUCAO]:          'Em Execução',
  [StatusPedido.CONCLUIDO]:            'Concluído',
  [StatusPedido.FATURADO]:             'Faturado',
  [StatusPedido.CANCELADO]:            'Cancelado',
};

export const STATUS_NOTA_FISCAL_LABELS: Record<StatusNotaFiscal, string> = {
  [StatusNotaFiscal.NAO_EMITIDA]: 'Não Emitida',
  [StatusNotaFiscal.PENDENTE]:    'Pendente',
  [StatusNotaFiscal.PROCESSANDO]: 'Processando',
  [StatusNotaFiscal.EMITIDA]:     'Emitida',
  [StatusNotaFiscal.CANCELADA]:   'Cancelada',
  [StatusNotaFiscal.ERRO]:        'Erro na Emissão',
  [StatusNotaFiscal.SUBSTITUIDA]: 'Substituída',
};

export const STATUS_CACAMBA_LABELS: Record<StatusCacamba, string> = {
  [StatusCacamba.DISPONIVEL]:   'Disponível',
  [StatusCacamba.EM_USO]:       'Em Uso',
  [StatusCacamba.EM_ROTA]:      'Em Rota',
  [StatusCacamba.RESERVADA]:    'Reservada',
  [StatusCacamba.MANUTENCAO]:   'Manutenção',
  [StatusCacamba.INDISPONIVEL]: 'Indisponível',
};

export const STATUS_EXECUCAO_LABELS: Record<StatusExecucao, string> = {
  [StatusExecucao.PENDENTE]:   'Pendente',
  [StatusExecucao.EM_ROTA]:    'Em Rota',
  [StatusExecucao.NO_LOCAL]:   'No Local',
  [StatusExecucao.EXECUTANDO]: 'Executando',
  [StatusExecucao.CONCLUIDA]:  'Concluída',
  [StatusExecucao.CANCELADA]:  'Cancelada',
};

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  [AppRole.ADMINISTRADOR]: 'Administrador',
  [AppRole.ATENDIMENTO]:   'Atendimento',
  [AppRole.FINANCEIRO]:    'Financeiro',
  [AppRole.FISCAL]:        'Fiscal',
  [AppRole.OPERADOR]:      'Operador',
  [AppRole.MOTORISTA]:     'Motorista',
  [AppRole.GESTOR]:        'Gestor',
};
