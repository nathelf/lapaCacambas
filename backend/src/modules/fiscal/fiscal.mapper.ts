import type { FiscalPreviewDTO, NotaFiscalResponseDTO } from './fiscal.types';

export class FiscalMapper {
  mapPedidoPreviewToProviderPayload(preview: FiscalPreviewDTO, observacoesFiscais?: string) {
    return {
      ambiente: preview.ambiente,
      cliente: {
        nome: preview.cliente.nome,
        documento: preview.cliente.documento,
        tipo: preview.cliente.tipo,
        email: preview.cliente.email,
        telefone: preview.cliente.telefone,
      },
      itens: preview.pedidos.map((p) => ({
        descricao: preview.servico?.descricao || `Pedido ${p.numero}`,
        quantidade: 1,
        valor_unitario: p.valor,
        codigo_servico_municipal: preview.servico?.codigo_fiscal || null,
      })),
      valor_total: preview.valorTotal,
      codigo_servico: preview.servico?.codigo_fiscal || null,
      observacoes_fiscais: observacoesFiscais || null,
      referencia_pedidos: preview.pedidos.map((p) => p.numero),
      referencia_fatura_id: preview.faturaId,
    };
  }

  mapProviderResponseToNotaInsert(params: {
    providerResponse: {
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
    };
    preview: FiscalPreviewDTO;
    userId: string;
    observacoesFiscais?: string;
    idempotencyKey: string;
  }) {
    const { providerResponse, preview, userId, observacoesFiscais, idempotencyKey } = params;
    return {
      empresa_id: preview.empresaId,
      cliente_id: preview.cliente.id,
      obra_id: preview.pedidos[0]?.obra_id || null,
      pedido_id: preview.pedidos.length === 1 ? preview.pedidos[0].id : null,
      fatura_id: preview.faturaId,
      numero: providerResponse.numeroNota,
      numero_nota: providerResponse.numeroNota,
      serie: providerResponse.serie || '1',
      tipo_documento: 'NFS-e',
      status: providerResponse.status === 'erro' ? 'erro' : providerResponse.status,
      ambiente: providerResponse.ambiente,
      data_emissao: new Date().toISOString(),
      valor_total: preview.valorTotal,
      base_calculo: preview.valorTotal,
      valor_iss: Number(((preview.valorTotal * (preview.servico?.aliquota || 0)) / 100).toFixed(2)),
      valor_impostos: Number(((preview.valorTotal * (preview.servico?.aliquota || 0)) / 100).toFixed(2)),
      codigo_servico: preview.servico?.codigo_fiscal || null,
      descricao_servico: preview.servico?.descricao || null,
      observacoes_fiscais: observacoesFiscais || null,
      chave_acesso: providerResponse.chaveAcesso || null,
      protocolo: providerResponse.protocolo || null,
      xml_url: providerResponse.xmlUrl || null,
      pdf_url: providerResponse.pdfUrl || null,
      payload_envio: providerResponse.providerRequest,
      payload_retorno: providerResponse.providerResponse,
      mensagem_erro: providerResponse.status === 'erro' ? providerResponse.mensagem || 'Falha no provider' : null,
      external_id: idempotencyKey,
      lote_id: preview.pedidos.length > 1 ? idempotencyKey : null,
      created_by: userId,
      updated_by: userId,
    };
  }

  mapNotaRowToResponse(row: any): NotaFiscalResponseDTO {
    return {
      id: row.id,
      status: row.status,
      numero_nota: row.numero_nota,
      serie: row.serie,
      chave_acesso: row.chave_acesso,
      protocolo: row.protocolo,
      xml_url: row.xml_url,
      pdf_url: row.pdf_url,
      external_id: row.external_id,
      mensagem_erro: row.mensagem_erro,
      created_at: row.created_at,
    };
  }
}

