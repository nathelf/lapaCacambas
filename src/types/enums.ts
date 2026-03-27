// ===== STATUS ENUMS =====

export enum StatusPedido {
  ORCAMENTO = 'orcamento',
  PROGRAMADO = 'programado',
  EM_ROTA = 'em_rota',
  EM_EXECUCAO = 'em_execucao',
  CONCLUIDO = 'concluido',
  FATURADO = 'faturado',
  CANCELADO = 'cancelado',
}

export enum StatusCliente {
  ATIVO = 'ativo',
  INATIVO = 'inativo',
  BLOQUEADO = 'bloqueado',
}

export enum TipoCliente {
  PF = 'pf',
  PJ = 'pj',
}

export enum StatusCacamba {
  DISPONIVEL = 'disponivel',
  EM_USO = 'em_uso',
  EM_ROTA = 'em_rota',
  RESERVADA = 'reservada',
  MANUTENCAO = 'manutencao',
  INDISPONIVEL = 'indisponivel',
}

export enum StatusVeiculo {
  DISPONIVEL = 'disponivel',
  EM_OPERACAO = 'em_operacao',
  MANUTENCAO = 'manutencao',
  INDISPONIVEL = 'indisponivel',
}

export enum StatusMotorista {
  ATIVO = 'ativo',
  INATIVO = 'inativo',
  FERIAS = 'ferias',
  AFASTADO = 'afastado',
}

export enum StatusFatura {
  ABERTA = 'aberta',
  PAGA = 'paga',
  PAGA_PARCIAL = 'paga_parcial',
  VENCIDA = 'vencida',
  CANCELADA = 'cancelada',
  PROTESTO = 'protesto',
}

export enum StatusBoleto {
  EMITIDO = 'emitido',
  PAGO = 'pago',
  VENCIDO = 'vencido',
  CANCELADO = 'cancelado',
  BAIXADO = 'baixado',
}

export enum StatusConta {
  ABERTA = 'aberta',
  PAGA = 'paga',
  VENCIDA = 'vencida',
  CANCELADA = 'cancelada',
}

export enum TipoLocacao {
  DIA = 'dia',
  SEMANA = 'semana',
  QUINZENA = 'quinzena',
  MES = 'mes',
}

export enum StatusMaterial {
  ATIVO = 'ativo',
  INATIVO = 'inativo',
}

export enum TipoFluxo {
  ENTRADA = 'entrada',
  SAIDA = 'saida',
}

export enum StatusFiscal {
  NAO_EMITIDA = 'nao_emitida',
  PENDENTE = 'pendente',
  EMITIDA = 'emitida',
  CANCELADA = 'cancelada',
  ERRO = 'erro',
}

export const STATUS_PEDIDO_LABELS: Record<StatusPedido, string> = {
  [StatusPedido.ORCAMENTO]: 'Orçamento',
  [StatusPedido.PROGRAMADO]: 'Programado',
  [StatusPedido.EM_ROTA]: 'Em Rota',
  [StatusPedido.EM_EXECUCAO]: 'Em Execução',
  [StatusPedido.CONCLUIDO]: 'Concluído',
  [StatusPedido.FATURADO]: 'Faturado',
  [StatusPedido.CANCELADO]: 'Cancelado',
};

export const STATUS_FISCAL_LABELS: Record<StatusFiscal, string> = {
  [StatusFiscal.NAO_EMITIDA]: 'Não emitida',
  [StatusFiscal.PENDENTE]: 'Pendente',
  [StatusFiscal.EMITIDA]: 'Emitida',
  [StatusFiscal.CANCELADA]: 'Cancelada',
  [StatusFiscal.ERRO]: 'Erro na emissão',
};

export const STATUS_CACAMBA_LABELS: Record<StatusCacamba, string> = {
  [StatusCacamba.DISPONIVEL]: 'Disponível',
  [StatusCacamba.EM_USO]: 'Em Uso',
  [StatusCacamba.EM_ROTA]: 'Em Rota',
  [StatusCacamba.RESERVADA]: 'Reservada',
  [StatusCacamba.MANUTENCAO]: 'Manutenção',
  [StatusCacamba.INDISPONIVEL]: 'Indisponível',
};
