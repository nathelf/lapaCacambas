export interface FiscalValidationError {
  code: string;
  message: string;
  field?: string;
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
  observacoesFiscais?: string;
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
  numero_nota: string | null;
  serie: string | null;
  chave_acesso: string | null;
  protocolo: string | null;
  xml_url: string | null;
  pdf_url: string | null;
  external_id: string | null;
  mensagem_erro: string | null;
  created_at: string;
}

