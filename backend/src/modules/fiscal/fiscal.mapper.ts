import type { EmitirProviderPayload } from './providers/fiscal-provider.interface';
import type { FiscalPreviewDTO, NotaFiscalResponseDTO } from './fiscal.types';

export class FiscalMapper {
  mapPedidoPreviewToProviderPayload(
    preview: FiscalPreviewDTO,
    observacoesFiscais?: string | null,
    idempotencyKey?: string,
  ): EmitirProviderPayload {
    return {
      idempotencyKey: idempotencyKey ?? '',
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
        valorUnitario: p.valor,
        codigoServicoMunicipal: preview.servico?.codigo_fiscal || null,
      })),
      valorTotal: preview.valorTotal,
      codigoServico: preview.servico?.codigo_fiscal || null,
      aliquotaIss: preview.servico?.aliquota,
      observacoesFiscais: observacoesFiscais ?? null,
      referenciaPedidos: preview.pedidos.map((p) => p.numero),
      referenciaFaturaId: preview.faturaId,
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
    observacoesFiscais?: string | null;
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
      numero: row.numero ?? row.numero_nota ?? null,
      numero_nota: row.numero_nota ?? row.numero ?? null,
      serie: row.serie ?? null,
      data_emissao: row.data_emissao ?? null,
      valor_total: Number(row.valor_total ?? 0),
      base_calculo: Number(row.base_calculo ?? row.valor_total ?? 0),
      valor_iss: Number(row.valor_iss ?? 0),
      codigo_servico: row.codigo_servico ?? null,
      descricao_servico: row.descricao_servico ?? null,
      observacoes_fiscais: row.observacoes_fiscais ?? null,
      chave_acesso: row.chave_acesso ?? null,
      protocolo: row.protocolo ?? null,
      xml_url: row.xml_url ?? null,
      pdf_url: row.pdf_url ?? null,
      external_id: row.external_id ?? null,
      mensagem_erro: row.mensagem_erro ?? null,
      ambiente: row.ambiente ?? null,
      tipo_documento: row.tipo_documento ?? 'NFS-e',
      cliente_id: row.cliente_id ?? null,
      clientes: row.clientes ? { id: row.clientes.id, nome: row.clientes.nome } : null,
      nota_fiscal_pedidos: Array.isArray(row.nota_fiscal_pedidos)
        ? row.nota_fiscal_pedidos.map((nfp: any) => ({
            pedido_id: nfp.pedido_id,
            pedidos: nfp.pedidos ? { numero: nfp.pedidos.numero } : null,
          }))
        : [],
      created_at: row.created_at,
    };
  }
}

