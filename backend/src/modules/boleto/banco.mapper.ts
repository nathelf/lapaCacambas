import type { CriarBoletoDTO } from './boleto.types';

export class BancoMapper {
  toProviderPayload(input: {
    boleto: any;
    cliente: any;
    pedido?: any;
    fatura?: any;
  }) {
    const { boleto, cliente, pedido, fatura } = input;
    return {
      cliente: {
        nome: cliente.nome,
        documento: cliente.cnpj || cliente.cpf,
        email: cliente.email || null,
      },
      boleto: {
        valor: Number(boleto.valor),
        vencimento: boleto.data_vencimento,
        descricao: boleto.observacao || '',
        nossoNumero: boleto.nosso_numero || null,
      },
      pedido: pedido ? { id: String(pedido.id) } : null,
      fatura: fatura ? { id: String(fatura.id) } : null,
    };
  }

  toBoletoInsert(dto: CriarBoletoDTO, userId: string) {
    return {
      cliente_id: dto.cliente_id,
      pedido_id: dto.pedido_id ?? null,
      fatura_id: dto.fatura_id ?? null,
      banco: dto.banco || null,
      valor: Number(dto.valor),
      data_vencimento: dto.data_vencimento,
      data_emissao: new Date().toISOString().split('T')[0],
      valor_multa: Number(dto.valor_multa || 0),
      valor_juros: Number(dto.valor_juros || 0),
      observacao: dto.observacao || dto.descricao || null,
      status: 'rascunho',
      integracao_status: 'pendente',
      created_by: userId,
    };
  }
}

