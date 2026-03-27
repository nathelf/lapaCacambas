export interface CriarBoletoDTO {
  cliente_id: number;
  pedido_id?: number | null;
  fatura_id?: number | null;
  banco?: string | null;
  valor: number;
  data_vencimento: string;
  descricao?: string | null;
  valor_multa?: number;
  valor_juros?: number;
  observacao?: string | null;
}

export interface BoletoValidationResultDTO {
  apto_para_emissao: boolean;
  erros: Array<{ code: string; message: string; field?: string }>;
  alertas: string[];
}

export interface BancoProviderAuthDTO {
  accessToken: string;
  expiresAt: string | null;
}

export interface BancoProviderEmitDTO {
  externalId: string;
  nossoNumero: string;
  linhaDigitavel: string;
  codigoBarras: string;
  pdfUrl: string | null;
  status: 'emitido' | 'pendente' | 'erro';
  providerRequest: Record<string, unknown>;
  providerResponse: Record<string, unknown>;
  mensagem?: string;
}

