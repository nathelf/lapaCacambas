-- ============================================================
-- LOG DE ROTEIRIZAÇÃO INTELIGENTE (Google Routes)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rotas_otimizacao_logs (
  id                     BIGSERIAL PRIMARY KEY,
  tenant_id              UUID NOT NULL REFERENCES public.tenants(id)
                           DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  created_by             UUID REFERENCES auth.users(id),
  veiculo_id             BIGINT REFERENCES public.veiculos(id),
  origem_label           TEXT,
  origem_lat             DOUBLE PRECISION NOT NULL,
  origem_lng             DOUBLE PRECISION NOT NULL,
  destino_label          TEXT,
  destino_lat            DOUBLE PRECISION NOT NULL,
  destino_lng            DOUBLE PRECISION NOT NULL,
  sugestao_nome          TEXT NOT NULL,
  sugestao_custo_total   NUMERIC(12,2),
  sugestao_duracao_seg   INTEGER,
  sugestao_distancia_m   INTEGER,
  payload                JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rotas_otimizacao_logs_tenant_created
  ON public.rotas_otimizacao_logs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rotas_otimizacao_logs_veiculo
  ON public.rotas_otimizacao_logs (veiculo_id)
  WHERE veiculo_id IS NOT NULL;

ALTER TABLE public.rotas_otimizacao_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rotas_otimizacao_logs' AND policyname = 'rotas_otimizacao_logs_tenant'
  ) THEN
    CREATE POLICY "rotas_otimizacao_logs_tenant"
      ON public.rotas_otimizacao_logs
      FOR ALL TO authenticated
      USING (tenant_id = get_my_tenant_id())
      WITH CHECK (tenant_id = get_my_tenant_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rotas_otimizacao_logs' AND policyname = 'rotas_otimizacao_logs_service'
  ) THEN
    CREATE POLICY "rotas_otimizacao_logs_service"
      ON public.rotas_otimizacao_logs
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
