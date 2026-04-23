/**
 * Validação de schema do payload antes de enviar ao provider.
 *
 * Separado do FiscalValidationService (que valida regras de negócio sobre pedidos)
 * — este valida a integridade dos dados que serão transmitidos via API.
 *
 * Lança FiscalValidationError com lista completa de problemas (fail-all, não fail-fast).
 */
import type { EmitirProviderPayload } from './providers/fiscal-provider.interface';
import { FiscalValidationError } from './fiscal.errors';

interface Issue {
  field: string;
  message: string;
}

export type ValidateProviderPayloadOptions = {
  /** URL base do webservice fiscal (ex.: cascavel.atende.net) — regras opcionais por município. */
  fiscalApiBaseUrl?: string | null;
};

function onlyDigits(v: string): string {
  return v.replace(/\D/g, '');
}

export function validateProviderPayload(
  payload: EmitirProviderPayload,
  opts?: ValidateProviderPayloadOptions,
): void {
  const issues: Issue[] = [];

  // ── Itens ──────────────────────────────────────────────────────────────────
  if (!payload.itens?.length) {
    issues.push({ field: 'itens', message: 'Payload fiscal sem nenhum item de serviço.' });
  }

  for (const [i, item] of (payload.itens ?? []).entries()) {
    if (!item.descricao?.trim()) {
      issues.push({ field: `itens[${i}].descricao`, message: `Item ${i + 1}: descrição vazia.` });
    }
    if (!(item.valorUnitario > 0)) {
      issues.push({ field: `itens[${i}].valorUnitario`, message: `Item ${i + 1}: valorUnitario deve ser maior que zero.` });
    }
    if (!(item.quantidade > 0)) {
      issues.push({ field: `itens[${i}].quantidade`, message: `Item ${i + 1}: quantidade deve ser maior que zero.` });
    }
  }

  // ── Valor total ────────────────────────────────────────────────────────────
  if (!(payload.valorTotal > 0)) {
    issues.push({
      field: 'valorTotal',
      message: `valorTotal deve ser maior que zero. Recebido: ${payload.valorTotal}.`,
    });
  }

  // ── Documento do cliente ───────────────────────────────────────────────────
  if (payload.cliente.documento && !payload.cliente.idEstrangeiro) {
    const digits = onlyDigits(payload.cliente.documento);
    if (digits.length !== 11 && digits.length !== 14) {
      issues.push({
        field: 'cliente.documento',
        message: `Documento do cliente inválido: ${digits.length} dígito(s) — CPF deve ter 11, CNPJ deve ter 14.`,
      });
    }
  }

  // ── Prestador (obrigatório para NFS-e) ────────────────────────────────────
  if (!payload.prestador?.cnpj) {
    issues.push({
      field: 'prestador.cnpj',
      message: 'CNPJ do prestador (empresa emissora) é obrigatório para NFS-e.',
    });
  } else {
    const cnpj = onlyDigits(payload.prestador.cnpj);
    if (cnpj.length !== 14) {
      issues.push({
        field: 'prestador.cnpj',
        message: `CNPJ do prestador inválido: ${cnpj.length} dígito(s) (esperado 14).`,
      });
    }
  }

  if (!payload.prestador?.inscricaoMunicipal) {
    issues.push({
      field: 'prestador.inscricaoMunicipal',
      message: 'Inscrição Municipal do prestador é obrigatória para emissão de NFS-e.',
    });
  }

  const apiBase = String(opts?.fiscalApiBaseUrl || '').toLowerCase();

  // ── Alíquota ISS (valor já consolidado no mapper: config quando informada, senão serviço)
  const aliquotaRaw = payload.aliquotaIss ?? payload.config?.aliquotaIss;
  if (aliquotaRaw != null) {
    const aliquota =
      typeof aliquotaRaw === 'number'
        ? aliquotaRaw
        : Number(String(aliquotaRaw).trim().replace(',', '.'));
    if (!Number.isFinite(aliquota) || aliquota < 0 || aliquota > 100) {
      issues.push({
        field: 'aliquotaIss',
        message: `Alíquota ISS inválida: ${aliquotaRaw}% — deve estar entre 0 e 100.`,
      });
    } else if (apiBase.includes('cascavel') && aliquota > 5) {
      issues.push({
        field: 'aliquotaIss',
        message:
          'Cascavel/IPM costuma aceitar alíquota de ISS entre 2% e 5%; acima disso o webservice costuma devolver erro 00034. Se você digitou “7.09” como percentual, isso costuma ser confusão com o item da LC 116 (serviço 7.09 / código 070901) — use o percentual de ISS correto (ex.: 2, 3 ou 5) em Fiscal → Configurações ou no cadastro do serviço.',
      });
    }
  }

  // ── Código de serviço ──────────────────────────────────────────────────────
  const codigoServico = payload.config?.itemListaServico ?? payload.codigoServico;
  if (!codigoServico) {
    issues.push({
      field: 'codigoServico',
      message: 'Código de serviço municipal (item da lista) não definido — a NFS-e pode ser rejeitada pela prefeitura.',
    });
  }

  if (apiBase.includes('cascavel')) {
    const codAtiv = String(payload.config?.codigoAtividade ?? '').trim();
    if (!codAtiv) {
      issues.push({
        field: 'config.codigoAtividade',
        message:
          'Webservice Cascavel/IPM: informe o código de tributação municipal do serviço (cadastro da prefeitura / “código de tributação” do item — no manual IPM costuma ir na tag codigo_atividade). Não confunda com o CNAE da empresa; sem o código correto a prefeitura costuma devolver o erro 00034.',
      });
    }
  }

  if (issues.length > 0) {
    const summary = `${issues.length} problema${issues.length > 1 ? 's' : ''} no payload fiscal`;
    throw new FiscalValidationError(`${summary}: ${issues.map(i => i.message).join(' | ')}`, {
      issues,
    });
  }
}
