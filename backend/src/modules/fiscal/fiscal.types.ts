export interface FiscalValidationError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

export interface FiscalValidationResultDTO {
  apto_para_emissao: boolean;
  erros: FiscalValidationError[];
  alertas: string[];
  preview: FiscalPreviewDTO | null;
}

export interface FiscalPreviewDTO {
  empresaId: string | null;
  pedidos: Array<{
    id: number;
    numero: string;
    valor: number;
    cliente_id: number;
    obra_id: number | null;
    servico_id: number | null;
  }>;
  faturaId: number | null;
  cliente: {
    id: number;
    nome: string;
    documento: string | null;
    tipo: 'PF' | 'PJ';
    email: string | null;
    telefone: string | null;
    /** Logradouro e demais campos — obrigatórios no XML para vários municípios IPM (ex.: Cascavel). */
    endereco?: string | null;
    numero?: string | null;
    bairro?: string | null;
    /** Código IBGE ou TOM do município do tomador, quando cadastrado; senão usa o da config fiscal. */
    municipio?: string | null;
    uf?: string | null;
    cep?: string | null;
    idEstrangeiro?: string | null;
    pais?: string | null;
  };
  servico: {
    id: number;
    descricao: string;
    codigo_fiscal: string | null;
    aliquota: number;
  } | null;
  valorTotal: number;
  ambiente: string;
}

export interface EmitirNotaDTO {
  pedidoIds: Array<number | string>;
  faturaId?: number | string | null;
  forcarEmissao?: boolean;
  observacoesFiscais?: string | null;
  /** Sobrescreve codigo_atividade da config: código de tributação municipal do serviço (IPM), não CNAE. */
  codigoAtividadeMunicipal?: string | null;
}

export interface FiscalProviderAuthDTO {
  accessToken: string;
  expiresAt: string | null;
}

export interface FiscalProviderEmitDTO {
  externalId: string;
  numeroNota: string;
  serie?: string;
  status: 'emitida' | 'pendente' | 'erro';
  ambiente: string;
  chaveAcesso?: string;
  protocolo?: string;
  xmlUrl?: string;
  pdfUrl?: string;
  providerRequest: Record<string, unknown>;
  providerResponse: Record<string, unknown>;
  mensagem?: string;
}

export interface NotaFiscalResponseDTO {
  id: number;
  status: string;
  numero: string | null;
  numero_nota: string | null;
  serie: string | null;
  data_emissao: string | null;
  valor_total: number;
  base_calculo: number;
  valor_iss: number;
  codigo_servico: string | null;
  descricao_servico: string | null;
  observacoes_fiscais: string | null;
  chave_acesso: string | null;
  protocolo: string | null;
  xml_url: string | null;
  pdf_url: string | null;
  external_id: string | null;
  mensagem_erro: string | null;
  ambiente: string | null;
  tipo_documento: string;
  cliente_id: number | null;
  clientes: { id: number; nome: string; cnpj?: string | null; email?: string | null } | null;
  nota_fiscal_pedidos: Array<{ pedido_id: number; pedidos: { numero: string } | null }>;
  created_at: string;
}

