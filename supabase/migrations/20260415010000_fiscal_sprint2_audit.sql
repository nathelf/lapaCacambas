-- ============================================================
-- SPRINT 2 FISCAL — Auditoria, status machine e consistência
-- ============================================================

-- ------------------------------------------------------------
-- 1) Expandir status_nota_fiscal para suportar status machine
-- ------------------------------------------------------------
DO $$
DECLARE v_type TEXT := 'status_nota_fiscal';
BEGIN
  -- Verifica se é enum ou text; adiciona valores novos se for enum
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = v_type AND typtype = 'e') THEN
    -- ADD VALUE é idempotente no Postgres 12+ com IF NOT EXISTS
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'validando'
                   AND enumtypid = v_type::regtype) THEN
      EXECUTE format('ALTER TYPE %I ADD VALUE %L', v_type, 'validando');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'validada'
                   AND enumtypid = v_type::regtype) THEN
      EXECUTE format('ALTER TYPE %I ADD VALUE %L', v_type, 'validada');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'em_processamento'
                   AND enumtypid = v_type::regtype) THEN
      EXECUTE format('ALTER TYPE %I ADD VALUE %L', v_type, 'em_processamento');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rejeitada'
                   AND enumtypid = v_type::regtype) THEN
      EXECUTE format('ALTER TYPE %I ADD VALUE %L', v_type, 'rejeitada');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cancelamento_solicitado'
                   AND enumtypid = v_type::regtype) THEN
      EXECUTE format('ALTER TYPE %I ADD VALUE %L', v_type, 'cancelamento_solicitado');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'erro_integracao'
                   AND enumtypid = v_type::regtype) THEN
      EXECUTE format('ALTER TYPE %I ADD VALUE %L', v_type, 'erro_integracao');
    END IF;
  END IF;
END $$;

-- Se a coluna status for TEXT (padrão após hardening), adicionar constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'notas_fiscais'
      AND column_name  = 'status'
      AND data_type    = 'text'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_notas_fiscais_status') THEN
      ALTER TABLE public.notas_fiscais
        ADD CONSTRAINT ck_notas_fiscais_status CHECK (
          status IN (
            'pendente', 'validando', 'validada', 'em_processamento',
            'emitida', 'rejeitada', 'cancelamento_solicitado',
            'cancelada', 'erro_integracao', 'erro'  -- 'erro' legado mantido
          )
        );
    END IF;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 2) Unique constraint na chave de idempotência (external_id)
--    Garante atomicidade mesmo com race condition no application layer
-- ------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_notas_fiscais_idempotency_key
  ON public.notas_fiscais (external_id)
  WHERE deleted_at IS NULL AND external_id IS NOT NULL;

-- ------------------------------------------------------------
-- 3) Tabela nota_fiscal_eventos — histórico fine-grained
--    Registra cada transição de estado com contexto completo
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nota_fiscal_eventos (
  id              BIGSERIAL PRIMARY KEY,
  nota_fiscal_id  BIGINT      NOT NULL REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  status_anterior TEXT,
  status_novo     TEXT        NOT NULL,
  descricao       TEXT,
  usuario_id      UUID        REFERENCES auth.users(id),
  correlation_id  TEXT,
  dados_extras    JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nf_eventos_nota    ON public.nota_fiscal_eventos(nota_fiscal_id);
CREATE INDEX IF NOT EXISTS idx_nf_eventos_status  ON public.nota_fiscal_eventos(status_novo);
CREATE INDEX IF NOT EXISTS idx_nf_eventos_corr    ON public.nota_fiscal_eventos(correlation_id);
CREATE INDEX IF NOT EXISTS idx_nf_eventos_created ON public.nota_fiscal_eventos(created_at DESC);

-- RLS: só authenticated pode ler eventos
ALTER TABLE public.nota_fiscal_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_nf_eventos" ON public.nota_fiscal_eventos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- 4) Expandir fiscal_integracao_logs com correlation_id e usuario_id
-- ------------------------------------------------------------
ALTER TABLE public.fiscal_integracao_logs
  ADD COLUMN IF NOT EXISTS correlation_id TEXT,
  ADD COLUMN IF NOT EXISTS usuario_id     UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_fiscal_logs_corr    ON public.fiscal_integracao_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_logs_usuario ON public.fiscal_integracao_logs(usuario_id);

-- ------------------------------------------------------------
-- 5) Função atômica de emissão (Etapa 7 — consistência transacional)
--
--    Executa em uma única transação Postgres:
--      1. INSERT notas_fiscais
--      2. INSERT nota_fiscal_pedidos[]
--      3. UPDATE pedidos (nota_fiscal_id, status_fiscal, tem_nota_fiscal)
--      4. INSERT nota_fiscal_eventos (transição PENDENTE → EMITIDA)
--
--    Retorna a nota inserida como JSONB.
--    Em caso de qualquer erro, tudo é revertido (ROLLBACK implícito).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.emitir_nota_fiscal_atomica(
  p_nota_data    JSONB,        -- campos da nota fiscal
  p_pedido_ids   BIGINT[],     -- ids dos pedidos a vincular
  p_valor_total  NUMERIC,      -- para distribuição proporcional
  p_usuario_id   UUID,
  p_correlation_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  -- executa como owner para bypassar RLS em tabelas restritas
AS $$
DECLARE
  v_nota          public.notas_fiscais;
  v_pedido_id     BIGINT;
  v_valor_por_pedido NUMERIC;
  v_status        TEXT;
BEGIN
  -- ── 1. Inserir nota fiscal ──────────────────────────────────────────────
  INSERT INTO public.notas_fiscais (
    empresa_id, cliente_id, obra_id, pedido_id, fatura_id,
    numero, numero_nota, serie, tipo_documento,
    status, ambiente, data_emissao,
    valor_total, base_calculo, valor_iss, valor_impostos,
    codigo_servico, descricao_servico, observacoes_fiscais,
    chave_acesso, protocolo, xml_url, pdf_url,
    payload_envio, payload_retorno, mensagem_erro,
    external_id, lote_id,
    created_by, updated_by
  )
  SELECT
    (p_nota_data->>'empresa_id')::UUID,
    (p_nota_data->>'cliente_id')::BIGINT,
    (p_nota_data->>'obra_id')::BIGINT,
    (p_nota_data->>'pedido_id')::BIGINT,
    (p_nota_data->>'fatura_id')::BIGINT,
    p_nota_data->>'numero',
    p_nota_data->>'numero_nota',
    COALESCE(p_nota_data->>'serie', '1'),
    COALESCE(p_nota_data->>'tipo_documento', 'NFS-e'),
    COALESCE(p_nota_data->>'status', 'pendente'),
    p_nota_data->>'ambiente',
    COALESCE((p_nota_data->>'data_emissao')::TIMESTAMPTZ, now()),
    COALESCE((p_nota_data->>'valor_total')::NUMERIC, 0),
    COALESCE((p_nota_data->>'base_calculo')::NUMERIC, 0),
    COALESCE((p_nota_data->>'valor_iss')::NUMERIC, 0),
    COALESCE((p_nota_data->>'valor_impostos')::NUMERIC, 0),
    p_nota_data->>'codigo_servico',
    p_nota_data->>'descricao_servico',
    p_nota_data->>'observacoes_fiscais',
    p_nota_data->>'chave_acesso',
    p_nota_data->>'protocolo',
    p_nota_data->>'xml_url',
    p_nota_data->>'pdf_url',
    p_nota_data->'payload_envio',
    p_nota_data->'payload_retorno',
    p_nota_data->>'mensagem_erro',
    p_nota_data->>'external_id',
    p_nota_data->>'lote_id',
    p_usuario_id,
    p_usuario_id
  RETURNING * INTO v_nota;

  -- ── 2. Vincular pedidos ─────────────────────────────────────────────────
  v_valor_por_pedido := CASE
    WHEN array_length(p_pedido_ids, 1) > 0
    THEN p_valor_total / array_length(p_pedido_ids, 1)
    ELSE 0
  END;

  FOREACH v_pedido_id IN ARRAY p_pedido_ids LOOP
    INSERT INTO public.nota_fiscal_pedidos (nota_fiscal_id, pedido_id, valor, valor_vinculado)
    VALUES (v_nota.id, v_pedido_id, v_valor_por_pedido, v_valor_por_pedido)
    ON CONFLICT (nota_fiscal_id, pedido_id) DO NOTHING;
  END LOOP;

  -- ── 3. Atualizar pedidos ────────────────────────────────────────────────
  v_status := COALESCE(v_nota.status, 'pendente');

  UPDATE public.pedidos
  SET
    nota_fiscal_id     = v_nota.id,
    status_fiscal      = CASE
                           WHEN v_status = 'emitida' THEN 'emitida'::public.status_nota_fiscal
                           ELSE status_fiscal
                         END,
    nota_fiscal_status = v_status,
    tem_nota_fiscal    = (v_status = 'emitida'),
    updated_at         = now()
  WHERE id = ANY(p_pedido_ids);

  -- ── 4. Registrar evento de transição ───────────────────────────────────
  INSERT INTO public.nota_fiscal_eventos (
    nota_fiscal_id, status_anterior, status_novo,
    descricao, usuario_id, correlation_id, dados_extras
  )
  VALUES (
    v_nota.id,
    'pendente',
    v_status,
    'Emissão processada via função atômica',
    p_usuario_id,
    p_correlation_id,
    jsonb_build_object(
      'pedidoIds', p_pedido_ids,
      'valorTotal', p_valor_total
    )
  );

  RETURN row_to_json(v_nota)::JSONB;

EXCEPTION
  WHEN unique_violation THEN
    -- Idempotência: nota com mesmo external_id já existe
    RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT: nota com external_id=% já existe.',
      p_nota_data->>'external_id'
      USING ERRCODE = 'unique_violation';
END;
$$;

-- Permissão: apenas service role (backend) pode chamar
REVOKE ALL ON FUNCTION public.emitir_nota_fiscal_atomica FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.emitir_nota_fiscal_atomica TO service_role;
