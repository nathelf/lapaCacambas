-- ============================================================
-- SCHEMA HARDENING: pedidos + financeiro + boletos + fiscal
-- Compatível com estrutura existente (sem quebra)
-- ============================================================

-- ------------------------------------------------------------
-- 1) Tabela de configuracoes fiscais por empresa
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.configuracoes_fiscais_empresa (
  id BIGSERIAL PRIMARY KEY,
  empresa_id UUID,
  provedor_fiscal TEXT NOT NULL DEFAULT 'mock',
  ambiente TEXT NOT NULL DEFAULT 'homologacao',
  api_base_url TEXT,
  client_id TEXT,
  client_secret TEXT,
  api_key TEXT,
  certificate_ref TEXT,
  certificate_password_ref TEXT,
  municipio_codigo TEXT,
  inscricao_municipal TEXT,
  regime_tributario TEXT,
  token_atual TEXT,
  token_expira_em TIMESTAMPTZ,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cfg_fiscal_empresa_ativo
  ON public.configuracoes_fiscais_empresa (empresa_id)
  WHERE ativo = true;

-- ------------------------------------------------------------
-- 2) Ajustes em notas_fiscais para modelo fiscal completo
-- ------------------------------------------------------------
ALTER TABLE public.notas_fiscais
  ADD COLUMN IF NOT EXISTS empresa_id UUID,
  ADD COLUMN IF NOT EXISTS obra_id BIGINT REFERENCES public.obras(id),
  ADD COLUMN IF NOT EXISTS pedido_id BIGINT REFERENCES public.pedidos(id),
  ADD COLUMN IF NOT EXISTS numero_nota TEXT,
  ADD COLUMN IF NOT EXISTS tipo_documento TEXT NOT NULL DEFAULT 'NFS-e',
  ADD COLUMN IF NOT EXISTS ambiente TEXT,
  ADD COLUMN IF NOT EXISTS valor_impostos NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS observacoes_fiscais TEXT,
  ADD COLUMN IF NOT EXISTS payload_envio JSONB,
  ADD COLUMN IF NOT EXISTS payload_retorno JSONB,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS lote_id TEXT,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Backfill para manter compatibilidade com dados legados
UPDATE public.notas_fiscais
SET
  numero_nota = COALESCE(numero_nota, numero),
  observacoes_fiscais = COALESCE(observacoes_fiscais, observacao_fiscal),
  payload_envio = COALESCE(payload_envio, integracao_request),
  payload_retorno = COALESCE(payload_retorno, integracao_response),
  ambiente = COALESCE(ambiente, 'homologacao')
WHERE
  numero_nota IS NULL
  OR observacoes_fiscais IS NULL
  OR payload_envio IS NULL
  OR payload_retorno IS NULL
  OR ambiente IS NULL;

CREATE INDEX IF NOT EXISTS idx_notas_empresa ON public.notas_fiscais(empresa_id);
CREATE INDEX IF NOT EXISTS idx_notas_pedido ON public.notas_fiscais(pedido_id);
CREATE INDEX IF NOT EXISTS idx_notas_external ON public.notas_fiscais(external_id);
CREATE INDEX IF NOT EXISTS idx_notas_deleted_at ON public.notas_fiscais(deleted_at);
CREATE INDEX IF NOT EXISTS idx_notas_lote ON public.notas_fiscais(lote_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_notas_empresa_numero_serie_ativo
  ON public.notas_fiscais(empresa_id, numero_nota, serie)
  WHERE deleted_at IS NULL AND numero_nota IS NOT NULL;

-- ------------------------------------------------------------
-- 3) Ajuste em nota_fiscal_pedidos
-- ------------------------------------------------------------
ALTER TABLE public.nota_fiscal_pedidos
  ADD COLUMN IF NOT EXISTS valor_vinculado NUMERIC(12,2) NOT NULL DEFAULT 0;

UPDATE public.nota_fiscal_pedidos
SET valor_vinculado = COALESCE(NULLIF(valor_vinculado, 0), valor, 0)
WHERE valor_vinculado = 0;

CREATE INDEX IF NOT EXISTS idx_nf_pedidos_nf ON public.nota_fiscal_pedidos(nota_fiscal_id);
CREATE INDEX IF NOT EXISTS idx_nf_pedidos_pedido ON public.nota_fiscal_pedidos(pedido_id);

-- ------------------------------------------------------------
-- 4) Logs de integração fiscal
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fiscal_integracao_logs (
  id BIGSERIAL PRIMARY KEY,
  nota_fiscal_id BIGINT REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  empresa_id UUID,
  tipo_operacao TEXT NOT NULL,
  request_payload JSONB,
  response_payload JSONB,
  http_status INT,
  status_integracao TEXT,
  mensagem TEXT,
  tentativa INT NOT NULL DEFAULT 1,
  executado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fiscal_logs_nota ON public.fiscal_integracao_logs(nota_fiscal_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_logs_empresa ON public.fiscal_integracao_logs(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_logs_tipo ON public.fiscal_integracao_logs(tipo_operacao);
CREATE INDEX IF NOT EXISTS idx_fiscal_logs_status ON public.fiscal_integracao_logs(status_integracao);
CREATE INDEX IF NOT EXISTS idx_fiscal_logs_exec_em ON public.fiscal_integracao_logs(executado_em DESC);

-- ------------------------------------------------------------
-- 5) Ajustes em pedidos
-- ------------------------------------------------------------
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS fatura_id BIGINT REFERENCES public.faturas(id),
  ADD COLUMN IF NOT EXISTS tem_boleto BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tem_nota_fiscal BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nota_fiscal_status TEXT,
  ADD COLUMN IF NOT EXISTS financeiro_status TEXT,
  ADD COLUMN IF NOT EXISTS faturavel BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS concluido_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelado_em TIMESTAMPTZ;

UPDATE public.pedidos p
SET fatura_id = fp.fatura_id
FROM public.fatura_pedidos fp
WHERE fp.pedido_id = p.id
  AND p.fatura_id IS NULL;

UPDATE public.pedidos p
SET tem_boleto = EXISTS (
  SELECT 1
  FROM public.boletos b
  WHERE b.pedido_id = p.id
    AND b.status NOT IN ('cancelado', 'renegociado')
)
WHERE p.tem_boleto = false;

UPDATE public.pedidos
SET
  tem_nota_fiscal = (nota_fiscal_id IS NOT NULL OR status_fiscal = 'emitida'),
  nota_fiscal_status = COALESCE(nota_fiscal_status, status_fiscal::text),
  financeiro_status = COALESCE(
    financeiro_status,
    CASE
      WHEN status = 'faturado' THEN 'faturado'
      WHEN fatura_id IS NOT NULL THEN 'faturado'
      WHEN faturado = true THEN 'faturado'
      WHEN status IN ('concluido', 'em_execucao') THEN 'pendente_faturamento'
      WHEN status = 'cancelado' THEN 'cancelado'
      ELSE 'aberto'
    END
  ),
  concluido_em = CASE
    WHEN status = 'concluido' AND concluido_em IS NULL THEN now()
    ELSE concluido_em
  END,
  cancelado_em = CASE
    WHEN status = 'cancelado' AND cancelado_em IS NULL THEN now()
    ELSE cancelado_em
  END;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_pedidos_nota_fiscal_status'
  ) THEN
    ALTER TABLE public.pedidos
      ADD CONSTRAINT ck_pedidos_nota_fiscal_status
      CHECK (
        nota_fiscal_status IS NULL
        OR nota_fiscal_status IN ('nao_emitida','pendente','processando','emitida','cancelada','erro','substituida')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_pedidos_financeiro_status'
  ) THEN
    ALTER TABLE public.pedidos
      ADD CONSTRAINT ck_pedidos_financeiro_status
      CHECK (
        financeiro_status IS NULL
        OR financeiro_status IN ('aberto','pendente_faturamento','faturado','boleto_emitido','pago','inadimplente','cancelado')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pedidos_fatura_id ON public.pedidos(fatura_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_tem_boleto ON public.pedidos(tem_boleto);
CREATE INDEX IF NOT EXISTS idx_pedidos_tem_nf ON public.pedidos(tem_nota_fiscal);
CREATE INDEX IF NOT EXISTS idx_pedidos_nf_status_txt ON public.pedidos(nota_fiscal_status);
CREATE INDEX IF NOT EXISTS idx_pedidos_fin_status_txt ON public.pedidos(financeiro_status);
CREATE INDEX IF NOT EXISTS idx_pedidos_faturavel ON public.pedidos(faturavel);
CREATE INDEX IF NOT EXISTS idx_pedidos_concluido_em ON public.pedidos(concluido_em);

-- ------------------------------------------------------------
-- 6) Ajustes em faturas
-- ------------------------------------------------------------
ALTER TABLE public.faturas
  ADD COLUMN IF NOT EXISTS valor_total NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS nota_fiscal_id BIGINT REFERENCES public.notas_fiscais(id),
  ADD COLUMN IF NOT EXISTS boleto_id BIGINT REFERENCES public.boletos(id);

UPDATE public.faturas
SET valor_total = COALESCE(valor_total, valor_liquido, valor_bruto, 0)
WHERE valor_total IS NULL;

UPDATE public.faturas f
SET nota_fiscal_id = nf.id
FROM public.notas_fiscais nf
WHERE nf.fatura_id = f.id
  AND f.nota_fiscal_id IS NULL;

UPDATE public.faturas f
SET boleto_id = b.id
FROM public.boletos b
WHERE b.fatura_id = f.id
  AND f.boleto_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_faturas_valor_total_nonneg'
  ) THEN
    ALTER TABLE public.faturas
      ADD CONSTRAINT ck_faturas_valor_total_nonneg CHECK (valor_total IS NULL OR valor_total >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_faturas_valor_total ON public.faturas(valor_total);
CREATE INDEX IF NOT EXISTS idx_faturas_nota_fiscal_id ON public.faturas(nota_fiscal_id);
CREATE INDEX IF NOT EXISTS idx_faturas_boleto_id ON public.faturas(boleto_id);

-- ------------------------------------------------------------
-- 7) Ajustes em boletos
-- ------------------------------------------------------------
ALTER TABLE public.boletos
  ADD COLUMN IF NOT EXISTS pedido_id BIGINT REFERENCES public.pedidos(id),
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS payload_envio JSONB,
  ADD COLUMN IF NOT EXISTS payload_retorno JSONB,
  ADD COLUMN IF NOT EXISTS mensagem_erro TEXT;

UPDATE public.boletos
SET mensagem_erro = COALESCE(mensagem_erro, integracao_erro)
WHERE mensagem_erro IS NULL AND integracao_erro IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_boletos_pedido_id ON public.boletos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_boletos_external_id ON public.boletos(external_id);
CREATE INDEX IF NOT EXISTS idx_boletos_fatura_pedido ON public.boletos(fatura_id, pedido_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_boletos_vinculo'
  ) THEN
    ALTER TABLE public.boletos
      ADD CONSTRAINT ck_boletos_vinculo
      CHECK (fatura_id IS NOT NULL OR pedido_id IS NOT NULL);
  END IF;
END $$;

-- ------------------------------------------------------------
-- 8) Compatibilidade com nomes esperados
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.enderecos AS
SELECT
  e.id,
  e.cliente_id,
  e.obra_id,
  e.contato,
  e.referencia,
  e.telefone,
  e.celular,
  e.endereco,
  e.numero,
  e.complemento,
  e.cep,
  e.bairro,
  e.cidade,
  e.estado,
  e.latitude,
  e.longitude,
  e.created_at
FROM public.enderecos_entrega e;

-- ------------------------------------------------------------
-- 9) Triggers de updated_at para nova tabela
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_cfg_fiscal_updated'
  ) THEN
    CREATE TRIGGER trg_cfg_fiscal_updated
      BEFORE UPDATE ON public.configuracoes_fiscais_empresa
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- ------------------------------------------------------------
-- 10) RLS para novas tabelas
-- ------------------------------------------------------------
ALTER TABLE public.configuracoes_fiscais_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_integracao_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'configuracoes_fiscais_empresa' AND policyname = 'authenticated_all_configuracoes_fiscais_empresa'
  ) THEN
    CREATE POLICY authenticated_all_configuracoes_fiscais_empresa
      ON public.configuracoes_fiscais_empresa
      FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'fiscal_integracao_logs' AND policyname = 'authenticated_all_fiscal_integracao_logs'
  ) THEN
    CREATE POLICY authenticated_all_fiscal_integracao_logs
      ON public.fiscal_integracao_logs
      FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

