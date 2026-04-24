-- ============================================================
-- CICLO DE VIDA DAS CAÇAMBAS
-- Adiciona: unidade_cacamba_id em execucoes, tabela de
-- movimentações (log imutável), índices e RLS.
-- Idempotente.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Vincular unidade física à execução (binding dinâmico)
--    O motorista injeta a cacamba_id no momento de retirar do pátio.
-- ------------------------------------------------------------
ALTER TABLE public.execucoes
  ADD COLUMN IF NOT EXISTS unidade_cacamba_id BIGINT
    REFERENCES public.unidades_cacamba(id);

CREATE INDEX IF NOT EXISTS idx_execucoes_unidade_cacamba
  ON public.execucoes (unidade_cacamba_id)
  WHERE unidade_cacamba_id IS NOT NULL;

-- ------------------------------------------------------------
-- 2) Log imutável de movimentações de cada unidade física
--    Cada transição de estado gera um registro aqui.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.movimentacoes_cacamba (
  id                  BIGSERIAL   PRIMARY KEY,
  unidade_cacamba_id  BIGINT      NOT NULL REFERENCES public.unidades_cacamba(id),
  execucao_id         BIGINT      REFERENCES public.execucoes(id),
  motorista_id        BIGINT      REFERENCES public.motoristas(id),
  usuario_id          UUID        REFERENCES auth.users(id),
  -- Tipo da movimentação
  tipo                TEXT        NOT NULL,
  -- CHECK: 'retirada_patio' | 'entrega_cliente' | 'coleta_cliente'
  --        | 'chegada_patio' | 'entrada_manutencao' | 'saida_manutencao'
  status_anterior     status_cacamba,
  status_novo         status_cacamba NOT NULL,
  latitude            DOUBLE PRECISION,
  longitude           DOUBLE PRECISION,
  foto_url            TEXT,
  observacao          TEXT,
  tenant_id           UUID        REFERENCES public.tenants(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
  -- Sem updated_at: log imutável
);

CREATE INDEX IF NOT EXISTS idx_mov_cacamba_unidade
  ON public.movimentacoes_cacamba (unidade_cacamba_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mov_cacamba_execucao
  ON public.movimentacoes_cacamba (execucao_id)
  WHERE execucao_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mov_cacamba_tenant
  ON public.movimentacoes_cacamba (tenant_id);

-- RLS
ALTER TABLE public.movimentacoes_cacamba ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='movimentacoes_cacamba' AND policyname='mov_tenant') THEN
    CREATE POLICY "mov_tenant" ON public.movimentacoes_cacamba
      FOR ALL TO authenticated
      USING (tenant_id = get_my_tenant_id())
      WITH CHECK (tenant_id = get_my_tenant_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='movimentacoes_cacamba' AND policyname='mov_service') THEN
    CREATE POLICY "mov_service" ON public.movimentacoes_cacamba
      FOR ALL TO service_role USING (true);
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3) Trigger updated_at em unidades_cacamba (já existe o fn)
-- ------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_unidades_cacamba_updated'
  ) THEN
    CREATE TRIGGER trg_unidades_cacamba_updated
      BEFORE UPDATE ON public.unidades_cacamba
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- ------------------------------------------------------------
-- 4) Índice de busca rápida por unidades disponíveis
--    (unidades_cacamba não tem tenant_id direto — é filho de cacambas)
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_unidades_cacamba_status
  ON public.unidades_cacamba (status);
