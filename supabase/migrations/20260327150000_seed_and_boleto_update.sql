-- ============================================================
-- SEED: dados iniciais de teste + atualização da tabela boletos
-- Idempotente: usa INSERT ... ON CONFLICT DO NOTHING
-- Execute via Supabase SQL Editor (como service_role / owner)
-- ============================================================

-- Adicionar pedido_id em boletos para vínculo direto
ALTER TABLE public.boletos
  ADD COLUMN IF NOT EXISTS pedido_id BIGINT REFERENCES public.pedidos(id);

-- ============================================================
-- CLIENTES (3 PJ + 2 PF)
-- ============================================================
INSERT INTO public.clientes (id, nome, fantasia, tipo, cnpj, cpf, telefone, celular, email,
  endereco, numero, complemento, bairro, cidade, estado, cep, status, observacao)
VALUES
  (1, 'Construtora Horizonte Ltda', 'Horizonte', 'pj', '12.345.678/0001-90', NULL,
   '(11) 3456-7890', '(11) 99876-5432', 'contato@horizonte.com.br',
   'Av. Paulista', '1000', 'Sala 501', 'Bela Vista', 'São Paulo', 'SP', '01310-100',
   'ativo', 'Cliente prioritário - obras na região central'),
  (2, 'MRV Engenharia e Participações S.A.', 'MRV', 'pj', '08.765.432/0001-10', NULL,
   '(11) 2345-6789', '(11) 98765-4321', 'financeiro@mrv.com.br',
   'Rua Funchal', '263', 'Andar 10', 'Vila Olímpia', 'São Paulo', 'SP', '04551-060',
   'ativo', NULL),
  (3, 'Rapido Demolições ME', 'Rapido Demo', 'pj', '33.444.555/0001-66', NULL,
   '(11) 4567-8901', '(11) 97654-3210', 'rapido@rapido.com.br',
   'Rua Comendador Elias Zarzur', '1240', NULL, 'Santo Amaro', 'São Paulo', 'SP', '04736-002',
   'ativo', NULL),
  (4, 'Carlos Eduardo Silva', NULL, 'pf', NULL, '123.456.789-00',
   '(11) 98765-4321', '(11) 98765-4321', 'carlos.silva@gmail.com',
   'Rua das Flores', '321', 'Apto 42', 'Jardim América', 'Guarulhos', 'SP', '07060-010',
   'ativo', NULL),
  (5, 'Ana Paula Mendes', NULL, 'pf', NULL, '987.654.321-00',
   '(11) 91234-5678', '(11) 91234-5678', 'ana.mendes@hotmail.com',
   'Av. Brasil', '500', NULL, 'Centro', 'São Paulo', 'SP', '01430-000',
   'bloqueado', 'Inadimplente - cobrança em andamento')
ON CONFLICT (id) DO NOTHING;

-- Ajustar sequence após insert com IDs explícitos
SELECT setval('public.clientes_id_seq', GREATEST((SELECT MAX(id) FROM public.clientes), 5), true);

-- ============================================================
-- OBRAS / ENDEREÇOS DE ENTREGA
-- ============================================================
INSERT INTO public.obras (id, cliente_id, nome, responsavel, telefone,
  endereco, numero, complemento, bairro, cidade, estado, cep, ativa)
VALUES
  (1, 1, 'Obra Paulista Centro', 'José Oliveira', '(11) 99111-2233',
   'Av. Paulista', '500', NULL, 'Bela Vista', 'São Paulo', 'SP', '01310-000', true),
  (2, 1, 'Residencial Jardins', 'Maria Costa', '(11) 99222-3344',
   'Rua Oscar Freire', '800', NULL, 'Jardins', 'São Paulo', 'SP', '01426-001', true),
  (3, 2, 'Condomínio Vila Olímpia', 'Pedro Martins', '(11) 99333-4455',
   'Rua Funchal', '700', NULL, 'Vila Olímpia', 'São Paulo', 'SP', '04551-000', true),
  (4, 3, 'Demolição Santo Amaro', 'Lucas Rapido', '(11) 97654-3210',
   'Rua Comendador Elias Zarzur', '1000', NULL, 'Santo Amaro', 'São Paulo', 'SP', '04736-000', true),
  (5, 4, 'Reforma Guarulhos', 'Carlos Silva', '(11) 98765-4321',
   'Rua das Flores', '321', NULL, 'Jardim América', 'Guarulhos', 'SP', '07060-010', true)
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.obras_id_seq', GREATEST((SELECT MAX(id) FROM public.obras), 5), true);

INSERT INTO public.enderecos_entrega (id, cliente_id, obra_id, contato, referencia,
  endereco, numero, complemento, bairro, cidade, estado, cep)
VALUES
  (1, 1, 1, 'José Oliveira', 'Portaria principal',
   'Av. Paulista', '500', NULL, 'Bela Vista', 'São Paulo', 'SP', '01310-000'),
  (2, 1, 2, 'Maria Costa', 'Acesso pela Rua Augusta',
   'Rua Oscar Freire', '800', NULL, 'Jardins', 'São Paulo', 'SP', '01426-001'),
  (3, 2, 3, 'Pedro Martins', 'Entrada lateral',
   'Rua Funchal', '700', NULL, 'Vila Olímpia', 'São Paulo', 'SP', '04551-000'),
  (4, 3, 4, 'Lucas Rapido', 'Portão industrial',
   'Rua Comendador Elias Zarzur', '1000', NULL, 'Santo Amaro', 'São Paulo', 'SP', '04736-000'),
  (5, 4, 5, 'Carlos Silva', 'Residência - campainha',
   'Rua das Flores', '321', 'Apto 42', 'Jardim América', 'Guarulhos', 'SP', '07060-010')
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.enderecos_entrega_id_seq', GREATEST((SELECT MAX(id) FROM public.enderecos_entrega), 5), true);

-- ============================================================
-- CONTATOS DOS CLIENTES
-- ============================================================
INSERT INTO public.contatos_cliente (id, cliente_id, nome, telefone, celular, email, cargo, principal)
VALUES
  (1, 1, 'José Oliveira', '(11) 3456-7890', '(11) 99111-2233', 'jose@horizonte.com.br', 'Engenheiro de Obras', true),
  (2, 1, 'Maria Costa', '(11) 3456-7891', '(11) 99222-3344', 'maria@horizonte.com.br', 'Gerente Financeiro', false),
  (3, 2, 'Pedro Martins', '(11) 2345-6789', '(11) 99333-4455', 'pedro@mrv.com.br', 'Coordenador', true),
  (4, 3, 'Lucas Rapido', '(11) 4567-8901', '(11) 97654-3210', 'lucas@rapido.com.br', 'Proprietário', true)
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.contatos_cliente_id_seq', GREATEST((SELECT MAX(id) FROM public.contatos_cliente), 4), true);

-- ============================================================
-- SERVIÇOS
-- ============================================================
INSERT INTO public.servicos (id, descricao, codigo_fiscal, aliquota, ativo)
VALUES
  (1, 'Locação de Caçamba', '7.09', 5.00, true),
  (2, 'Retirada de Caçamba', '7.09', 5.00, true),
  (3, 'Troca de Caçamba', '7.09', 5.00, true),
  (4, 'Locação de Máquina', '7.02', 3.00, true),
  (5, 'Demolição e Remoção', '7.09', 5.00, true)
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.servicos_id_seq', GREATEST((SELECT MAX(id) FROM public.servicos), 5), true);

-- ============================================================
-- CAÇAMBAS (tipos)
-- ============================================================
INSERT INTO public.cacambas (id, descricao, capacidade, preco_dia, preco_semana, preco_quinzena, preco_mes, ativo)
VALUES
  (1, 'Caçamba 3m³', '3 metros cúbicos', 120.00, 350.00, 550.00, 900.00, true),
  (2, 'Caçamba 5m³', '5 metros cúbicos', 180.00, 500.00, 800.00, 1300.00, true),
  (3, 'Caçamba 20m³', '20 metros cúbicos', 450.00, 1200.00, 2000.00, 3500.00, true),
  (4, 'Caçamba 30m³', '30 metros cúbicos', 650.00, 1800.00, 3000.00, 5000.00, true)
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.cacambas_id_seq', GREATEST((SELECT MAX(id) FROM public.cacambas), 4), true);

-- ============================================================
-- UNIDADES DE CAÇAMBA (patrimônio)
-- ============================================================
INSERT INTO public.unidades_cacamba (id, cacamba_id, patrimonio, status)
VALUES
  (1,  2, 'CC-001', 'disponivel'),
  (2,  2, 'CC-002', 'disponivel'),
  (3,  1, 'CC-003', 'disponivel'),
  (4,  2, 'CC-004', 'disponivel'),
  (5,  3, 'CC-005', 'disponivel'),
  (6,  1, 'CC-006', 'disponivel'),
  (7,  2, 'CC-007', 'disponivel'),
  (8,  4, 'CC-008', 'manutencao'),
  (9,  3, 'CC-009', 'disponivel'),
  (10, 2, 'CC-010', 'disponivel'),
  (11, 1, 'CC-011', 'disponivel'),
  (12, 4, 'CC-012', 'disponivel')
ON CONFLICT (patrimonio) DO NOTHING;

SELECT setval('public.unidades_cacamba_id_seq', GREATEST((SELECT MAX(id) FROM public.unidades_cacamba), 12), true);

-- ============================================================
-- VEÍCULOS
-- ============================================================
INSERT INTO public.veiculos (id, placa, modelo, marca, tipo, cor, ano_fabricacao,
  data_licenciamento, km_inicial, km_atual, status, combustivel)
VALUES
  (1, 'ABC-1234', 'Constellation 24.280', 'Volkswagen', 'Poliguindaste', 'Branco', 2020,
   '2025-06-15', 45000, 47230, 'disponivel', 'diesel'),
  (2, 'DEF-5678', 'Atego 2426', 'Mercedes-Benz', 'Roll-on/off', 'Azul', 2019,
   '2025-08-20', 78000, 80450, 'disponivel', 'diesel'),
  (3, 'JKL-3456', 'Worker 15.190', 'Volkswagen', 'Poliguindaste', 'Verde', 2018,
   '2024-04-10', 102000, 103300, 'manutencao', 'diesel'),
  (4, 'MNO-7890', 'Accelo 1016', 'Mercedes-Benz', 'Utilitário', 'Prata', 2021,
   '2025-11-25', 30000, 31200, 'disponivel', 'diesel')
ON CONFLICT (placa) DO NOTHING;

SELECT setval('public.veiculos_id_seq', GREATEST((SELECT MAX(id) FROM public.veiculos), 4), true);

-- ============================================================
-- MOTORISTAS
-- ============================================================
INSERT INTO public.motoristas (id, nome, cpf, cnh, status,
  data_vencimento_cnh, categoria_c, categoria_d, categoria_e,
  telefone, celular, email)
VALUES
  (1, 'Marcos Souza', '111.222.333-44', '00123456789', 'ativo',
   '2026-04-10', true, true, true, '(11) 3333-1111', '(11) 99111-1111', 'marcos@email.com'),
  (2, 'João Pereira', '222.333.444-55', '00234567890', 'ativo',
   '2027-09-15', true, true, false, '(11) 3333-2222', '(11) 99222-2222', 'joao@email.com'),
  (3, 'Roberto Alves', '333.444.555-66', '00345678901', 'ativo',
   '2026-12-22', true, true, true, '(11) 3333-3333', '(11) 99333-3333', 'roberto@email.com'),
  (4, 'Fernando Lima', '444.555.666-77', '00456789012', 'inativo',
   '2025-01-05', false, false, false, '(11) 3333-4444', '(11) 99444-4444', NULL)
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.motoristas_id_seq', GREATEST((SELECT MAX(id) FROM public.motoristas), 4), true);

-- ============================================================
-- PEDIDOS (5 pedidos em diferentes estados)
-- ============================================================
INSERT INTO public.pedidos (id, numero, cliente_id, endereco_entrega_id, servico_id, cacamba_id,
  tipo, tipo_locacao, status, quantidade, valor_unitario, valor_total,
  data_pedido, data_retirada_prevista, observacao, status_fiscal)
VALUES
  (1, 'PED-2026-0001', 1, 1, 1, 2,
   'entrega_cacamba', 'semana', 'concluido', 1, 500.00, 500.00,
   '2026-03-01', '2026-03-08', 'Entrega no período da manhã.', 'nao_emitida'),
  (2, 'PED-2026-0002', 2, 3, 1, 2,
   'entrega_cacamba', 'quinzena', 'faturado', 1, 800.00, 800.00,
   '2026-03-05', '2026-03-20', NULL, 'nao_emitida'),
  (3, 'PED-2026-0003', 1, 2, 1, 3,
   'entrega_cacamba', 'dia', 'programado', 1, 450.00, 450.00,
   '2026-03-20', '2026-03-21', 'Urgente - obra com prazo apertado.', 'nao_emitida'),
  (4, 'PED-2026-0004', 3, 4, 5, 3,
   'entrega_cacamba', 'mes', 'orcamento', 2, 3500.00, 7000.00,
   '2026-03-25', '2026-04-25', 'Demolição completa - 2 caçambas 20m³.', 'nao_emitida'),
  (5, 'PED-2026-0005', 4, 5, 1, 1,
   'entrega_cacamba', 'semana', 'em_execucao', 1, 350.00, 350.00,
   '2026-03-22', '2026-03-29', NULL, 'nao_emitida')
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.pedidos_id_seq', GREATEST((SELECT MAX(id) FROM public.pedidos), 5), true);

-- Histórico de pedidos
INSERT INTO public.pedido_historico (pedido_id, status_anterior, status_novo, observacao)
VALUES
  (1, NULL,       'orcamento',   'Pedido criado'),
  (1, 'orcamento','programado',  'Motorista: Marcos Souza — Veículo: ABC-1234'),
  (1, 'programado','em_execucao','Caçamba colocada em 01/03/2026 às 09:00'),
  (1, 'em_execucao','concluido', 'Retirada confirmada em 08/03/2026 — Aterro São Paulo'),
  (2, NULL,       'orcamento',   'Pedido criado'),
  (2, 'orcamento','programado',  'Motorista: João Pereira — Veículo: DEF-5678'),
  (2, 'programado','em_execucao','Colocação confirmada'),
  (2, 'em_execucao','concluido', 'Retirada confirmada'),
  (2, 'concluido','faturado',    'Faturado na fatura FAT-2026-0001'),
  (3, NULL,       'orcamento',   'Pedido criado'),
  (3, 'orcamento','programado',  'Motorista: Roberto Alves — Veículo: MNO-7890'),
  (4, NULL,       'orcamento',   'Pedido criado'),
  (5, NULL,       'orcamento',   'Pedido criado'),
  (5, 'orcamento','programado',  'Motorista: Marcos Souza — Veículo: ABC-1234'),
  (5, 'programado','em_execucao','Caçamba colocada')
ON CONFLICT DO NOTHING;

-- ============================================================
-- FATURAS
-- ============================================================
INSERT INTO public.faturas (id, numero, cliente_id, data_emissao, data_vencimento,
  valor_bruto, valor_desconto, valor_juros, valor_multa, valor_taxa, valor_liquido,
  forma_cobranca, status, observacao)
VALUES
  (1, 'FAT-2026-0001', 2, '2026-03-10', '2026-04-10',
   800.00, 0.00, 0.00, 0.00, 0.00, 800.00,
   'boleto', 'aberta', 'Referente ao pedido PED-2026-0002'),
  (2, 'FAT-2026-0002', 1, '2026-03-08', '2026-03-22',
   500.00, 0.00, 0.00, 0.00, 0.00, 500.00,
   'transferencia', 'paga', 'Referente ao pedido PED-2026-0001')
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.faturas_id_seq', GREATEST((SELECT MAX(id) FROM public.faturas), 2), true);

-- Vincular pedidos às faturas
INSERT INTO public.fatura_pedidos (fatura_id, pedido_id, valor)
VALUES
  (1, 2, 800.00),
  (2, 1, 500.00)
ON CONFLICT (fatura_id, pedido_id) DO NOTHING;

-- ============================================================
-- BOLETOS
-- ============================================================
INSERT INTO public.boletos (id, fatura_id, pedido_id, cliente_id,
  banco, nosso_numero, numero_documento,
  linha_digitavel, data_emissao, data_vencimento,
  valor, valor_multa, valor_juros, status, observacao)
VALUES
  (1, 1, 2, 2,
   'Itaú', '00001-2', 'DOC-2026-001',
   '34191.75630 01010.101010 10101.010101 1 00000000080000',
   '2026-03-10', '2026-04-10',
   800.00, 16.00, 0.00, 'emitido',
   'Boleto referente a FAT-2026-0001 / PED-2026-0002')
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.boletos_id_seq', GREATEST((SELECT MAX(id) FROM public.boletos), 1), true);

-- ============================================================
-- MÁQUINAS (para completar o catálogo)
-- ============================================================
INSERT INTO public.maquinas (id, descricao, modelo, patrimonio, preco_hora, preco_dia, status)
VALUES
  (1, 'Escavadeira Hidráulica 20t', 'Case CX210D', 'MAQ-001', 450.00, 3500.00, 'disponivel'),
  (2, 'Mini Carregadeira', 'Bobcat S650', 'MAQ-002', 280.00, 2200.00, 'disponivel'),
  (3, 'Rolo Compactador', 'Dynapac CA250', 'MAQ-003', 320.00, 2500.00, 'disponivel')
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.maquinas_id_seq', GREATEST((SELECT MAX(id) FROM public.maquinas), 3), true);

-- ============================================================
-- RLS: garantir que as políticas básicas existam para seed funcionar
-- (usuários autenticados podem ver todos os dados da empresa)
-- ============================================================

-- Habilitar RLS (já deve estar habilitado, mas garante)
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boletos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cacambas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades_cacamba ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enderecos_entrega ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contatos_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;

-- Políticas para usuários autenticados (acesso completo à empresa)
DO $$
DECLARE
  tbls TEXT[] := ARRAY[
    'clientes','pedidos','pedido_historico','pedido_itens','faturas','fatura_pedidos',
    'boletos','notas_fiscais','nota_fiscal_pedidos','cacambas','unidades_cacamba',
    'veiculos','motoristas','servicos','obras','enderecos_entrega','contatos_cliente',
    'logs_auditoria','fornecedores','contas_pagar','maquinas','cobrancas','rotas',
    'rota_paradas','execucoes','materiais','ocorrencias','anexos'
  ];
  tbl TEXT;
  policy_name TEXT;
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    policy_name := 'authenticated_all_' || tbl;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl AND policyname = policy_name
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
        policy_name, tbl
      );
    END IF;
  END LOOP;
END $$;

-- profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'authenticated_all_profiles'
  ) THEN
    CREATE POLICY authenticated_all_profiles ON public.profiles
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- user_roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'authenticated_read_user_roles'
  ) THEN
    CREATE POLICY authenticated_read_user_roles ON public.user_roles
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
