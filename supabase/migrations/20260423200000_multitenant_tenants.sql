-- ============================================================
-- MULTITENANT: tabela tenants + tenant_id em todas as tabelas
-- + função get_my_tenant_id() + RLS por tenant
-- Idempotente (IF NOT EXISTS / ON CONFLICT / DO UPDATE)
-- ============================================================

-- ------------------------------------------------------------
-- 1) Tabela mestre de tenants
--    id = mesmo UUID usado em empresa_id nas configs fiscal/bancária
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenants (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT        UNIQUE NOT NULL,
  name             TEXT        NOT NULL,
  logo_url         TEXT,
  -- theme_config: { "primary": "#hex", "secondary": "#hex", "accent": "#hex" }
  theme_config     JSONB       NOT NULL DEFAULT '{}',
  -- enabled_features: ["fiscal", "frotas", "whatsapp", "relatorios", ...]
  enabled_features TEXT[]      NOT NULL DEFAULT '{}',
  active           BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants (slug);

CREATE TRIGGER trg_tenants_updated
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS na tabela tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Leitura pública de branding (necessário para carregar logo/tema antes do login)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tenants' AND policyname='tenants_public_read') THEN
    CREATE POLICY "tenants_public_read" ON public.tenants FOR SELECT USING (active = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tenants' AND policyname='tenants_service_role') THEN
    CREATE POLICY "tenants_service_role" ON public.tenants FOR ALL TO service_role USING (true);
  END IF;
END $$;

-- ------------------------------------------------------------
-- 2) Seed: primeiro tenant — Lapa Caçambas
--    UUID fixo = o mesmo empresa_id já usado nas configs fiscal/bancária
-- ------------------------------------------------------------
INSERT INTO public.tenants (id, slug, name, logo_url, theme_config, enabled_features, active)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'lapa',
  'Lapa Caçambas',
  NULL,
  '{"primary": "#16a34a", "secondary": "#15803d", "accent": "#4ade80"}',
  ARRAY['fiscal', 'financeiro', 'frotas', 'relatorios', 'whatsapp', 'ocorrencias'],
  true
)
ON CONFLICT (id) DO UPDATE SET
  slug             = EXCLUDED.slug,
  name             = EXCLUDED.name,
  theme_config     = EXCLUDED.theme_config,
  enabled_features = EXCLUDED.enabled_features,
  active           = EXCLUDED.active,
  updated_at       = now();

-- ------------------------------------------------------------
-- 3) Adicionar tenant_id nas tabelas "âncora"
--    DEFAULT = primeiro tenant para backfill seguro dos dados existentes
-- ------------------------------------------------------------

-- profiles: vínculo usuário → tenant
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

UPDATE public.profiles
  SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
  WHERE tenant_id IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;

CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON public.profiles (tenant_id);

-- clientes
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
UPDATE public.clientes SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE tenant_id IS NULL;
ALTER TABLE public.clientes ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
CREATE INDEX IF NOT EXISTS idx_clientes_tenant ON public.clientes (tenant_id);

-- servicos
ALTER TABLE public.servicos
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
UPDATE public.servicos SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE tenant_id IS NULL;
ALTER TABLE public.servicos ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;

-- cacambas
ALTER TABLE public.cacambas
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
UPDATE public.cacambas SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE tenant_id IS NULL;
ALTER TABLE public.cacambas ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;

-- maquinas
ALTER TABLE public.maquinas
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
UPDATE public.maquinas SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE tenant_id IS NULL;
ALTER TABLE public.maquinas ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;

-- veiculos
ALTER TABLE public.veiculos
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
UPDATE public.veiculos SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE tenant_id IS NULL;
ALTER TABLE public.veiculos ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;

-- motoristas
ALTER TABLE public.motoristas
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
UPDATE public.motoristas SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE tenant_id IS NULL;
ALTER TABLE public.motoristas ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;

-- pedidos
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
UPDATE public.pedidos SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE tenant_id IS NULL;
ALTER TABLE public.pedidos ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
CREATE INDEX IF NOT EXISTS idx_pedidos_tenant ON public.pedidos (tenant_id);

-- rotas
ALTER TABLE public.rotas
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
UPDATE public.rotas SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE tenant_id IS NULL;
ALTER TABLE public.rotas ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;

-- faturas
ALTER TABLE public.faturas
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
UPDATE public.faturas SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE tenant_id IS NULL;
ALTER TABLE public.faturas ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
CREATE INDEX IF NOT EXISTS idx_faturas_tenant ON public.faturas (tenant_id);

-- boletos
ALTER TABLE public.boletos
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
UPDATE public.boletos SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE tenant_id IS NULL;
ALTER TABLE public.boletos ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;

-- contas_pagar
ALTER TABLE public.contas_pagar
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
UPDATE public.contas_pagar SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE tenant_id IS NULL;
ALTER TABLE public.contas_pagar ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;

-- notas_fiscais
ALTER TABLE public.notas_fiscais
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
UPDATE public.notas_fiscais SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE tenant_id IS NULL;
ALTER TABLE public.notas_fiscais ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;

-- fornecedores
ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
UPDATE public.fornecedores SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE tenant_id IS NULL;
ALTER TABLE public.fornecedores ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;

-- materiais
ALTER TABLE public.materiais
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
UPDATE public.materiais SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE tenant_id IS NULL;
ALTER TABLE public.materiais ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;

-- anexos
ALTER TABLE public.anexos
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
UPDATE public.anexos SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE tenant_id IS NULL;
ALTER TABLE public.anexos ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;

-- logs_auditoria
ALTER TABLE public.logs_auditoria
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
UPDATE public.logs_auditoria SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE tenant_id IS NULL;

-- FK em configuracoes_fiscais_empresa (empresa_id → tenants.id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_config_fiscal_tenant'
  ) THEN
    ALTER TABLE public.configuracoes_fiscais_empresa
      ADD CONSTRAINT fk_config_fiscal_tenant
      FOREIGN KEY (empresa_id) REFERENCES public.tenants(id);
  END IF;
END $$;

-- ------------------------------------------------------------
-- 4) Função helper: retorna tenant_id do usuário autenticado
--    Usada nas políticas RLS do frontend (service_role bypassa RLS)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;

-- ------------------------------------------------------------
-- 5) Atualizar handle_new_user para suportar tenant via metadata
--    signup com  options: { data: { tenant_id: "uuid" } }
--    Se não informado, usa o tenant padrão (lapa)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := COALESCE(
    (NEW.raw_user_meta_data->>'tenant_id')::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid
  );

  INSERT INTO public.profiles (id, nome, email, tenant_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email,
    v_tenant_id
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'atendimento');
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 6) Substituir políticas RLS permissivas por tenant-scoped
--    Tabelas âncora: filtro direto por tenant_id
--    Tabelas filho: filtro via JOIN na âncora
-- ------------------------------------------------------------

-- profiles: usuário lê apenas seu próprio (ou admins do mesmo tenant)
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "System inserts profile" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (
      tenant_id = get_my_tenant_id()
      AND public.has_role(auth.uid(), 'administrador')
    )
  );
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "profiles_service" ON public.profiles FOR ALL TO service_role
  USING (true);

-- ── CLIENTES ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_clientes" ON public.clientes;
CREATE POLICY "clientes_tenant" ON public.clientes FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());
CREATE POLICY "clientes_service" ON public.clientes FOR ALL TO service_role USING (true);

-- ── CONTATOS_CLIENTE (filho de clientes) ─────────────────────
DROP POLICY IF EXISTS "auth_contatos" ON public.contatos_cliente;
CREATE POLICY "contatos_tenant" ON public.contatos_cliente FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = contatos_cliente.cliente_id AND c.tenant_id = get_my_tenant_id()
  ));
CREATE POLICY "contatos_service" ON public.contatos_cliente FOR ALL TO service_role USING (true);

-- ── OBRAS (filho de clientes) ─────────────────────────────────
DROP POLICY IF EXISTS "auth_obras" ON public.obras;
CREATE POLICY "obras_tenant" ON public.obras FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = obras.cliente_id AND c.tenant_id = get_my_tenant_id()
  ));
CREATE POLICY "obras_service" ON public.obras FOR ALL TO service_role USING (true);

-- ── ENDERECOS_ENTREGA (filho de clientes) ────────────────────
DROP POLICY IF EXISTS "auth_enderecos" ON public.enderecos_entrega;
CREATE POLICY "enderecos_tenant" ON public.enderecos_entrega FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = enderecos_entrega.cliente_id AND c.tenant_id = get_my_tenant_id()
  ));
CREATE POLICY "enderecos_service" ON public.enderecos_entrega FOR ALL TO service_role USING (true);

-- ── SERVICOS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_servicos" ON public.servicos;
CREATE POLICY "servicos_tenant" ON public.servicos FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());
CREATE POLICY "servicos_service" ON public.servicos FOR ALL TO service_role USING (true);

-- ── CACAMBAS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_cacambas" ON public.cacambas;
CREATE POLICY "cacambas_tenant" ON public.cacambas FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());
CREATE POLICY "cacambas_service" ON public.cacambas FOR ALL TO service_role USING (true);

-- ── UNIDADES_CACAMBA (filho de cacambas) ─────────────────────
DROP POLICY IF EXISTS "auth_unidades" ON public.unidades_cacamba;
CREATE POLICY "unidades_tenant" ON public.unidades_cacamba FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cacambas ca
    WHERE ca.id = unidades_cacamba.cacamba_id AND ca.tenant_id = get_my_tenant_id()
  ));
CREATE POLICY "unidades_service" ON public.unidades_cacamba FOR ALL TO service_role USING (true);

-- ── MAQUINAS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_maquinas" ON public.maquinas;
CREATE POLICY "maquinas_tenant" ON public.maquinas FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());
CREATE POLICY "maquinas_service" ON public.maquinas FOR ALL TO service_role USING (true);

-- ── VEICULOS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_veiculos" ON public.veiculos;
CREATE POLICY "veiculos_tenant" ON public.veiculos FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());
CREATE POLICY "veiculos_service" ON public.veiculos FOR ALL TO service_role USING (true);

-- ── MOTORISTAS ────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_motoristas" ON public.motoristas;
CREATE POLICY "motoristas_tenant" ON public.motoristas FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());
CREATE POLICY "motoristas_service" ON public.motoristas FOR ALL TO service_role USING (true);

-- ── PEDIDOS ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_pedidos" ON public.pedidos;
CREATE POLICY "pedidos_tenant" ON public.pedidos FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());
CREATE POLICY "pedidos_service" ON public.pedidos FOR ALL TO service_role USING (true);

-- ── PEDIDO_ITENS (filho de pedidos) ──────────────────────────
DROP POLICY IF EXISTS "auth_pedido_itens" ON public.pedido_itens;
CREATE POLICY "pedido_itens_tenant" ON public.pedido_itens FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = pedido_itens.pedido_id AND p.tenant_id = get_my_tenant_id()
  ));
CREATE POLICY "pedido_itens_service" ON public.pedido_itens FOR ALL TO service_role USING (true);

-- ── PEDIDO_HISTORICO (filho de pedidos) ──────────────────────
DROP POLICY IF EXISTS "auth_pedido_hist" ON public.pedido_historico;
CREATE POLICY "pedido_hist_tenant" ON public.pedido_historico FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = pedido_historico.pedido_id AND p.tenant_id = get_my_tenant_id()
  ));
CREATE POLICY "pedido_hist_service" ON public.pedido_historico FOR ALL TO service_role USING (true);

-- ── ROTAS ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_rotas" ON public.rotas;
CREATE POLICY "rotas_tenant" ON public.rotas FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());
CREATE POLICY "rotas_service" ON public.rotas FOR ALL TO service_role USING (true);

-- ── ROTA_PARADAS (filho de rotas) ────────────────────────────
DROP POLICY IF EXISTS "auth_rota_par" ON public.rota_paradas;
CREATE POLICY "rota_par_tenant" ON public.rota_paradas FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.rotas r
    WHERE r.id = rota_paradas.rota_id AND r.tenant_id = get_my_tenant_id()
  ));
CREATE POLICY "rota_par_service" ON public.rota_paradas FOR ALL TO service_role USING (true);

-- ── EXECUCOES (filho de pedidos) ─────────────────────────────
DROP POLICY IF EXISTS "auth_execucoes" ON public.execucoes;
CREATE POLICY "execucoes_tenant" ON public.execucoes FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = execucoes.pedido_id AND p.tenant_id = get_my_tenant_id()
  ));
CREATE POLICY "execucoes_service" ON public.execucoes FOR ALL TO service_role USING (true);

-- ── FATURAS ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_faturas" ON public.faturas;
CREATE POLICY "faturas_tenant" ON public.faturas FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());
CREATE POLICY "faturas_service" ON public.faturas FOR ALL TO service_role USING (true);

-- ── FATURA_PEDIDOS (filho de faturas) ────────────────────────
DROP POLICY IF EXISTS "auth_fat_ped" ON public.fatura_pedidos;
CREATE POLICY "fat_ped_tenant" ON public.fatura_pedidos FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.faturas f
    WHERE f.id = fatura_pedidos.fatura_id AND f.tenant_id = get_my_tenant_id()
  ));
CREATE POLICY "fat_ped_service" ON public.fatura_pedidos FOR ALL TO service_role USING (true);

-- ── COBRANCAS (filho de clientes) ────────────────────────────
DROP POLICY IF EXISTS "auth_cobrancas" ON public.cobrancas;
CREATE POLICY "cobrancas_tenant" ON public.cobrancas FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = cobrancas.cliente_id AND c.tenant_id = get_my_tenant_id()
  ));
CREATE POLICY "cobrancas_service" ON public.cobrancas FOR ALL TO service_role USING (true);

-- ── BOLETOS ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_boletos" ON public.boletos;
CREATE POLICY "boletos_tenant" ON public.boletos FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());
CREATE POLICY "boletos_service" ON public.boletos FOR ALL TO service_role USING (true);

-- ── CONTAS_PAGAR ──────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_contas" ON public.contas_pagar;
CREATE POLICY "contas_tenant" ON public.contas_pagar FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());
CREATE POLICY "contas_service" ON public.contas_pagar FOR ALL TO service_role USING (true);

-- ── NOTAS_FISCAIS ─────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_nf" ON public.notas_fiscais;
CREATE POLICY "nf_tenant" ON public.notas_fiscais FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());
CREATE POLICY "nf_service" ON public.notas_fiscais FOR ALL TO service_role USING (true);

-- ── NOTA_FISCAL_PEDIDOS (filho de notas_fiscais) ─────────────
DROP POLICY IF EXISTS "auth_nf_ped" ON public.nota_fiscal_pedidos;
CREATE POLICY "nf_ped_tenant" ON public.nota_fiscal_pedidos FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.notas_fiscais nf
    WHERE nf.id = nota_fiscal_pedidos.nota_fiscal_id AND nf.tenant_id = get_my_tenant_id()
  ));
CREATE POLICY "nf_ped_service" ON public.nota_fiscal_pedidos FOR ALL TO service_role USING (true);

-- ── FORNECEDORES ──────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_fornecedores" ON public.fornecedores;
CREATE POLICY "fornecedores_tenant" ON public.fornecedores FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());
CREATE POLICY "fornecedores_service" ON public.fornecedores FOR ALL TO service_role USING (true);

-- ── MATERIAIS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_materiais" ON public.materiais;
CREATE POLICY "materiais_tenant" ON public.materiais FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());
CREATE POLICY "materiais_service" ON public.materiais FOR ALL TO service_role USING (true);

-- ── OCORRENCIAS (filho de pedidos/clientes) ───────────────────
DROP POLICY IF EXISTS "auth_ocorrencias" ON public.ocorrencias;
CREATE POLICY "ocorrencias_tenant" ON public.ocorrencias FOR ALL TO authenticated
  USING (
    (pedido_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.pedidos p
      WHERE p.id = ocorrencias.pedido_id AND p.tenant_id = get_my_tenant_id()
    ))
    OR
    (cliente_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.clientes c
      WHERE c.id = ocorrencias.cliente_id AND c.tenant_id = get_my_tenant_id()
    ))
  );
CREATE POLICY "ocorrencias_service" ON public.ocorrencias FOR ALL TO service_role USING (true);

-- ── ANEXOS ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_anexos" ON public.anexos;
CREATE POLICY "anexos_tenant" ON public.anexos FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());
CREATE POLICY "anexos_service" ON public.anexos FOR ALL TO service_role USING (true);

-- ── LOGS_AUDITORIA ────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_logs_read" ON public.logs_auditoria;
DROP POLICY IF EXISTS "auth_logs_insert" ON public.logs_auditoria;
CREATE POLICY "logs_tenant_select" ON public.logs_auditoria FOR SELECT TO authenticated
  USING (tenant_id = get_my_tenant_id());
CREATE POLICY "logs_tenant_insert" ON public.logs_auditoria FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_my_tenant_id());
CREATE POLICY "logs_service" ON public.logs_auditoria FOR ALL TO service_role USING (true);

-- ── PERMISSOES (catálogo global, leitura por autenticados) ────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='permissoes' AND policyname='permissoes_read') THEN
    CREATE POLICY "permissoes_read" ON public.permissoes FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
