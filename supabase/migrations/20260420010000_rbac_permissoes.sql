-- ============================================================
-- RBAC Granular — permissoes, role_permissoes, usuario_permissoes
-- Idempotente (CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING)
-- ============================================================

-- ------------------------------------------------------------
-- 1) Catálogo de permissões
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.permissoes (
  id          SERIAL PRIMARY KEY,
  codigo      TEXT UNIQUE NOT NULL,   -- ex: 'usuarios.visualizar'
  descricao   TEXT,
  modulo      TEXT NOT NULL,           -- ex: 'usuarios', 'financeiro'
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2) Permissões por role (padrão do sistema)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.role_permissoes (
  role              app_role NOT NULL,
  permissao_codigo  TEXT     NOT NULL REFERENCES public.permissoes(codigo) ON DELETE CASCADE,
  PRIMARY KEY (role, permissao_codigo)
);

-- ------------------------------------------------------------
-- 3) Permissões por usuário (override — grant ou revoke)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usuario_permissoes (
  user_id           UUID     NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permissao_codigo  TEXT     NOT NULL REFERENCES public.permissoes(codigo) ON DELETE CASCADE,
  concedida         BOOLEAN  NOT NULL DEFAULT TRUE,  -- TRUE = grant, FALSE = revoke
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, permissao_codigo)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_role_perms_codigo   ON public.role_permissoes (permissao_codigo);
CREATE INDEX IF NOT EXISTS idx_user_perms_user     ON public.usuario_permissoes (user_id);

-- RLS
ALTER TABLE public.permissoes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissoes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_permissoes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='permissoes' AND policyname='service_role_permissoes') THEN
    CREATE POLICY "service_role_permissoes" ON public.permissoes FOR ALL TO service_role USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='role_permissoes' AND policyname='service_role_role_permissoes') THEN
    CREATE POLICY "service_role_role_permissoes" ON public.role_permissoes FOR ALL TO service_role USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='usuario_permissoes' AND policyname='service_role_usuario_permissoes') THEN
    CREATE POLICY "service_role_usuario_permissoes" ON public.usuario_permissoes FOR ALL TO service_role USING (true);
  END IF;
END $$;

-- ------------------------------------------------------------
-- 4) Seed: catálogo de permissões
-- ------------------------------------------------------------
INSERT INTO public.permissoes (codigo, descricao, modulo) VALUES
  -- Usuários
  ('usuarios.visualizar',      'Listar e visualizar usuários',           'usuarios'),
  ('usuarios.criar',           'Criar novos usuários',                   'usuarios'),
  ('usuarios.editar',          'Editar dados de usuários',               'usuarios'),
  ('usuarios.deletar',         'Remover usuários',                       'usuarios'),
  ('usuarios.alterar_status',  'Ativar/desativar usuários',              'usuarios'),
  -- Clientes
  ('clientes.visualizar',      'Visualizar clientes',                    'clientes'),
  ('clientes.criar',           'Criar clientes',                         'clientes'),
  ('clientes.editar',          'Editar clientes',                        'clientes'),
  ('clientes.deletar',         'Remover clientes',                       'clientes'),
  -- Pedidos
  ('pedidos.visualizar',       'Visualizar pedidos',                     'pedidos'),
  ('pedidos.criar',            'Criar pedidos',                          'pedidos'),
  ('pedidos.editar',           'Editar pedidos',                         'pedidos'),
  ('pedidos.cancelar',         'Cancelar pedidos',                       'pedidos'),
  -- Financeiro
  ('financeiro.visualizar',    'Visualizar módulo financeiro',           'financeiro'),
  ('financeiro.criar',         'Criar faturas e boletos',                'financeiro'),
  ('financeiro.editar',        'Editar registros financeiros',           'financeiro'),
  -- Fiscal
  ('fiscal.visualizar',        'Visualizar notas fiscais',               'fiscal'),
  ('fiscal.emitir',            'Emitir notas fiscais',                   'fiscal'),
  ('fiscal.cancelar',          'Cancelar notas fiscais',                 'fiscal'),
  -- Logística
  ('logistica.visualizar',     'Visualizar logística',                   'logistica'),
  ('logistica.editar',         'Editar rotas e execuções',               'logistica'),
  -- Relatórios
  ('relatorios.visualizar',    'Visualizar relatórios',                  'relatorios'),
  -- Configurações
  ('configuracoes.editar',     'Editar configurações do sistema',        'configuracoes')
ON CONFLICT (codigo) DO NOTHING;

-- ------------------------------------------------------------
-- 5) Seed: permissões por role
-- ------------------------------------------------------------

-- ADMINISTRADOR: tudo
INSERT INTO public.role_permissoes (role, permissao_codigo)
SELECT 'administrador', codigo FROM public.permissoes
ON CONFLICT DO NOTHING;

-- GESTOR: visualiza tudo, cria/edita clientes e pedidos, sem deletar usuários
INSERT INTO public.role_permissoes (role, permissao_codigo) VALUES
  ('gestor', 'usuarios.visualizar'),
  ('gestor', 'clientes.visualizar'), ('gestor', 'clientes.criar'), ('gestor', 'clientes.editar'),
  ('gestor', 'pedidos.visualizar'),  ('gestor', 'pedidos.criar'),  ('gestor', 'pedidos.editar'), ('gestor', 'pedidos.cancelar'),
  ('gestor', 'financeiro.visualizar'), ('gestor', 'financeiro.criar'), ('gestor', 'financeiro.editar'),
  ('gestor', 'fiscal.visualizar'), ('gestor', 'fiscal.emitir'),
  ('gestor', 'logistica.visualizar'), ('gestor', 'logistica.editar'),
  ('gestor', 'relatorios.visualizar')
ON CONFLICT DO NOTHING;

-- ATENDIMENTO: clientes e pedidos
INSERT INTO public.role_permissoes (role, permissao_codigo) VALUES
  ('atendimento', 'clientes.visualizar'), ('atendimento', 'clientes.criar'), ('atendimento', 'clientes.editar'),
  ('atendimento', 'pedidos.visualizar'),  ('atendimento', 'pedidos.criar'),  ('atendimento', 'pedidos.editar'),
  ('atendimento', 'logistica.visualizar')
ON CONFLICT DO NOTHING;

-- FINANCEIRO
INSERT INTO public.role_permissoes (role, permissao_codigo) VALUES
  ('financeiro', 'clientes.visualizar'),
  ('financeiro', 'pedidos.visualizar'),
  ('financeiro', 'financeiro.visualizar'), ('financeiro', 'financeiro.criar'), ('financeiro', 'financeiro.editar'),
  ('financeiro', 'fiscal.visualizar'),
  ('financeiro', 'relatorios.visualizar')
ON CONFLICT DO NOTHING;

-- FISCAL
INSERT INTO public.role_permissoes (role, permissao_codigo) VALUES
  ('fiscal', 'clientes.visualizar'),
  ('fiscal', 'pedidos.visualizar'),
  ('fiscal', 'financeiro.visualizar'),
  ('fiscal', 'fiscal.visualizar'), ('fiscal', 'fiscal.emitir'), ('fiscal', 'fiscal.cancelar'),
  ('fiscal', 'relatorios.visualizar')
ON CONFLICT DO NOTHING;

-- OPERADOR: logística
INSERT INTO public.role_permissoes (role, permissao_codigo) VALUES
  ('operador', 'pedidos.visualizar'),
  ('operador', 'logistica.visualizar'), ('operador', 'logistica.editar')
ON CONFLICT DO NOTHING;

-- MOTORISTA: apenas visualização de logística
INSERT INTO public.role_permissoes (role, permissao_codigo) VALUES
  ('motorista', 'logistica.visualizar')
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 6) Função helper: checar permissão (usada em RLS se necessário)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_permissao(_user_id UUID, _permissao TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    -- Override explícito por usuário
    WHEN EXISTS (
      SELECT 1 FROM public.usuario_permissoes
      WHERE user_id = _user_id AND permissao_codigo = _permissao AND concedida = FALSE
    ) THEN FALSE
    WHEN EXISTS (
      SELECT 1 FROM public.usuario_permissoes
      WHERE user_id = _user_id AND permissao_codigo = _permissao AND concedida = TRUE
    ) THEN TRUE
    -- Fallback para role
    ELSE EXISTS (
      SELECT 1 FROM public.role_permissoes rp
      JOIN public.user_roles ur ON ur.role = rp.role
      WHERE ur.user_id = _user_id AND rp.permissao_codigo = _permissao
    )
  END
$$;
