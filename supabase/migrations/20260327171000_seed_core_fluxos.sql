-- ============================================================
-- SEED CORE: clientes, obras, pedidos, financeiro e fiscal
-- Idempotente (ON CONFLICT) e com relacionamentos consistentes
-- ============================================================

-- ------------------------------------------------------------
-- 1) Configuração fiscal de teste
-- ------------------------------------------------------------
INSERT INTO public.configuracoes_fiscais_empresa (
  id, empresa_id, provedor_fiscal, ambiente, api_base_url,
  client_id, client_secret, api_key,
  municipio_codigo, inscricao_municipal, regime_tributario, ativo
)
VALUES
  (
    9001,
    '00000000-0000-0000-0000-000000000001',
    'mock',
    'homologacao',
    'https://api.fiscal-hml.local',
    'CLIENTE_HML_LAPA',
    'SECRET_REF_HML',
    'API_KEY_REF_HML',
    '3550308',
    '1234567',
    'simples_nacional',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  provedor_fiscal = EXCLUDED.provedor_fiscal,
  ambiente = EXCLUDED.ambiente,
  api_base_url = EXCLUDED.api_base_url,
  municipio_codigo = EXCLUDED.municipio_codigo,
  inscricao_municipal = EXCLUDED.inscricao_municipal,
  regime_tributario = EXCLUDED.regime_tributario,
  ativo = EXCLUDED.ativo,
  updated_at = now();

-- ------------------------------------------------------------
-- 2) Clientes
-- ------------------------------------------------------------
INSERT INTO public.clientes (
  id, nome, fantasia, tipo, cnpj, cpf,
  telefone, celular, email, endereco, numero, bairro, cidade, estado, cep,
  status, observacao
)
VALUES
  (9001, 'Construtora Alfa Obras Ltda', 'Alfa Obras', 'pj', '11.222.333/0001-44', NULL,
   '(11) 3456-1000', '(11) 99111-1000', 'financeiro@alfaobras.com.br',
   'Av. Brasil', '1500', 'Jardins', 'São Paulo', 'SP', '01430-000',
   'ativo', 'Cliente corporativo com alto volume mensal'),
  (9002, 'Engenharia Beta S.A.', 'Beta Engenharia', 'pj', '22.333.444/0001-55', NULL,
   '(11) 3456-2000', '(11) 99222-2000', 'contas@betaengenharia.com.br',
   'Rua Funchal', '800', 'Vila Olímpia', 'São Paulo', 'SP', '04551-060',
   'ativo', NULL),
  (9003, 'Carlos Alberto Mendes', NULL, 'pf', NULL, '321.654.987-00',
   '(11) 4002-3000', '(11) 99333-3000', 'carlos.mendes@email.com',
   'Rua das Acácias', '321', 'Centro', 'Guarulhos', 'SP', '07010-001',
   'ativo', 'Cliente residencial recorrente')
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  fantasia = EXCLUDED.fantasia,
  status = EXCLUDED.status,
  telefone = EXCLUDED.telefone,
  celular = EXCLUDED.celular,
  email = EXCLUDED.email,
  updated_at = now();

-- ------------------------------------------------------------
-- 3) Obras e endereços
-- ------------------------------------------------------------
INSERT INTO public.obras (
  id, cliente_id, nome, responsavel, telefone,
  endereco, numero, bairro, cidade, estado, cep, ativa
)
VALUES
  (9001, 9001, 'Obra Centro Expandido', 'Mariana Prado', '(11) 99111-1010',
   'Av. Paulista', '2100', 'Bela Vista', 'São Paulo', 'SP', '01310-300', true),
  (9002, 9002, 'Condomínio Beta Tower', 'Ricardo Nunes', '(11) 99222-2020',
   'Rua Helena', '300', 'Vila Olímpia', 'São Paulo', 'SP', '04552-050', true),
  (9003, 9003, 'Reforma Residencial Mendes', 'Carlos Mendes', '(11) 99333-3030',
   'Rua das Acácias', '321', 'Centro', 'Guarulhos', 'SP', '07010-001', true)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  responsavel = EXCLUDED.responsavel,
  telefone = EXCLUDED.telefone,
  ativa = EXCLUDED.ativa,
  updated_at = now();

INSERT INTO public.enderecos_entrega (
  id, cliente_id, obra_id, contato, referencia,
  endereco, numero, bairro, cidade, estado, cep
)
VALUES
  (9001, 9001, 9001, 'Mariana Prado', 'Portaria principal',
   'Av. Paulista', '2100', 'Bela Vista', 'São Paulo', 'SP', '01310-300'),
  (9002, 9002, 9002, 'Ricardo Nunes', 'Entrada de serviços',
   'Rua Helena', '300', 'Vila Olímpia', 'São Paulo', 'SP', '04552-050'),
  (9003, 9003, 9003, 'Carlos Mendes', 'Casa térrea',
   'Rua das Acácias', '321', 'Centro', 'Guarulhos', 'SP', '07010-001')
ON CONFLICT (id) DO UPDATE SET
  contato = EXCLUDED.contato,
  referencia = EXCLUDED.referencia,
  endereco = EXCLUDED.endereco,
  numero = EXCLUDED.numero,
  bairro = EXCLUDED.bairro,
  cidade = EXCLUDED.cidade,
  estado = EXCLUDED.estado,
  cep = EXCLUDED.cep;

-- ------------------------------------------------------------
-- 4) Serviços e caçambas
-- ------------------------------------------------------------
INSERT INTO public.servicos (id, descricao, codigo_fiscal, aliquota, ativo)
VALUES
  (9001, 'Locação de Caçamba 5m³', '7.09', 5.00, true),
  (9002, 'Retirada de Caçamba', '7.09', 5.00, true),
  (9003, 'Troca de Caçamba', '7.09', 5.00, true)
ON CONFLICT (id) DO UPDATE SET
  descricao = EXCLUDED.descricao,
  codigo_fiscal = EXCLUDED.codigo_fiscal,
  aliquota = EXCLUDED.aliquota,
  ativo = EXCLUDED.ativo;

INSERT INTO public.cacambas (
  id, descricao, capacidade, preco_dia, preco_semana, preco_quinzena, preco_mes, ativo
)
VALUES
  (9001, 'Caçamba 4m³', '4 metros cúbicos', 140.00, 420.00, 700.00, 1200.00, true),
  (9002, 'Caçamba 5m³', '5 metros cúbicos', 180.00, 520.00, 860.00, 1450.00, true),
  (9003, 'Caçamba 20m³', '20 metros cúbicos', 490.00, 1350.00, 2200.00, 3900.00, true)
ON CONFLICT (id) DO UPDATE SET
  descricao = EXCLUDED.descricao,
  capacidade = EXCLUDED.capacidade,
  preco_dia = EXCLUDED.preco_dia,
  preco_semana = EXCLUDED.preco_semana,
  preco_quinzena = EXCLUDED.preco_quinzena,
  preco_mes = EXCLUDED.preco_mes,
  ativo = EXCLUDED.ativo,
  updated_at = now();

INSERT INTO public.unidades_cacamba (id, cacamba_id, patrimonio, status)
VALUES
  (9001, 9001, 'CC-TST-9001', 'disponivel'),
  (9002, 9002, 'CC-TST-9002', 'em_uso'),
  (9003, 9003, 'CC-TST-9003', 'disponivel')
ON CONFLICT (patrimonio) DO UPDATE SET
  cacamba_id = EXCLUDED.cacamba_id,
  status = EXCLUDED.status,
  updated_at = now();

-- ------------------------------------------------------------
-- 5) Motoristas e veículos
-- ------------------------------------------------------------
INSERT INTO public.motoristas (
  id, nome, cpf, cnh, status, data_vencimento_cnh,
  categoria_c, categoria_d, categoria_e, telefone, celular, email
)
VALUES
  (9001, 'Fabio Rodrigues', '111.000.222-33', '00999111222', 'ativo', '2028-05-10',
   true, true, false, '(11) 3333-9001', '(11) 99444-9001', 'fabio.rodrigues@lapa.com'),
  (9002, 'Paulo Ferreira', '222.000.333-44', '00999111333', 'ativo', '2027-11-22',
   true, true, true, '(11) 3333-9002', '(11) 99444-9002', 'paulo.ferreira@lapa.com')
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  status = EXCLUDED.status,
  data_vencimento_cnh = EXCLUDED.data_vencimento_cnh,
  telefone = EXCLUDED.telefone,
  celular = EXCLUDED.celular,
  email = EXCLUDED.email,
  updated_at = now();

INSERT INTO public.veiculos (
  id, placa, modelo, marca, tipo, cor, ano_fabricacao,
  data_licenciamento, km_inicial, km_atual, status, combustivel
)
VALUES
  (9001, 'LPA-9A01', 'Atego 2426', 'Mercedes-Benz', 'Poliguindaste', 'Branco', 2021,
   '2026-12-20', 55000, 57340, 'disponivel', 'diesel'),
  (9002, 'LPA-9B02', 'Constellation 24.280', 'Volkswagen', 'Roll-on/off', 'Azul', 2020,
   '2026-10-15', 78000, 81220, 'em_operacao', 'diesel')
ON CONFLICT (placa) DO UPDATE SET
  modelo = EXCLUDED.modelo,
  marca = EXCLUDED.marca,
  tipo = EXCLUDED.tipo,
  status = EXCLUDED.status,
  km_atual = EXCLUDED.km_atual,
  updated_at = now();

-- ------------------------------------------------------------
-- 6) Pedidos operacionais
-- ------------------------------------------------------------
INSERT INTO public.pedidos (
  id, numero, cliente_id, obra_id, endereco_entrega_id, servico_id, cacamba_id,
  unidade_cacamba_id, tipo, tipo_locacao, status, quantidade,
  valor_unitario, valor_total, data_pedido, data_retirada_prevista,
  motorista_colocacao_id, veiculo_colocacao_id, status_fiscal,
  nota_fiscal_status, financeiro_status, faturavel, tem_boleto, tem_nota_fiscal
)
VALUES
  (9001, 'PED-2026-9001', 9001, 9001, 9001, 9001, 9002,
   9002, 'entrega_cacamba', 'semana', 'concluido', 1,
   520.00, 520.00, CURRENT_DATE - 7, CURRENT_DATE - 1,
   9001, 9002, 'nao_emitida',
   'nao_emitida', 'pendente_faturamento', true, false, false),

  (9002, 'PED-2026-9002', 9002, 9002, 9002, 9001, 9003,
   NULL, 'entrega_cacamba', 'quinzena', 'faturado', 1,
   2200.00, 2200.00, CURRENT_DATE - 12, CURRENT_DATE - 2,
   9002, 9001, 'nao_emitida',
   'nao_emitida', 'faturado', true, true, false),

  (9003, 'PED-2026-9003', 9003, 9003, 9003, 9001, 9001,
   NULL, 'entrega_cacamba', 'dia', 'programado', 1,
   140.00, 140.00, CURRENT_DATE - 1, CURRENT_DATE + 6,
   9001, 9001, 'nao_emitida',
   'nao_emitida', 'aberto', true, false, false)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  valor_total = EXCLUDED.valor_total,
  status_fiscal = EXCLUDED.status_fiscal,
  nota_fiscal_status = EXCLUDED.nota_fiscal_status,
  financeiro_status = EXCLUDED.financeiro_status,
  faturavel = EXCLUDED.faturavel,
  tem_boleto = EXCLUDED.tem_boleto,
  tem_nota_fiscal = EXCLUDED.tem_nota_fiscal,
  updated_at = now();

INSERT INTO public.pedido_historico (pedido_id, status_anterior, status_novo, observacao)
VALUES
  (9001, NULL, 'orcamento', 'Pedido criado (seed)'),
  (9001, 'orcamento', 'programado', 'Programado com motorista/veículo'),
  (9001, 'programado', 'em_execucao', 'Colocação confirmada'),
  (9001, 'em_execucao', 'concluido', 'Retirada concluída'),
  (9002, NULL, 'orcamento', 'Pedido criado (seed)'),
  (9002, 'orcamento', 'concluido', 'Execução finalizada'),
  (9002, 'concluido', 'faturado', 'Faturado automaticamente'),
  (9003, NULL, 'orcamento', 'Pedido criado (seed)'),
  (9003, 'orcamento', 'programado', 'Programação inicial')
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 7) Faturas e vínculos financeiros
-- ------------------------------------------------------------
INSERT INTO public.faturas (
  id, numero, cliente_id, obra_id, status, forma_cobranca,
  data_emissao, data_vencimento, valor_bruto, valor_liquido, valor_total, observacao
)
VALUES
  (9001, 'FAT-2026-9001', 9002, 9002, 'aberta', 'boleto',
   CURRENT_DATE - 5, CURRENT_DATE + 10, 2200.00, 2200.00, 2200.00, 'Fatura seed vinculada ao pedido 9002'),
  (9002, 'FAT-2026-9002', 9001, 9001, 'paga', 'transferencia',
   CURRENT_DATE - 15, CURRENT_DATE - 5, 520.00, 520.00, 520.00, 'Fatura seed paga')
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  valor_bruto = EXCLUDED.valor_bruto,
  valor_liquido = EXCLUDED.valor_liquido,
  valor_total = EXCLUDED.valor_total,
  data_vencimento = EXCLUDED.data_vencimento,
  updated_at = now();

INSERT INTO public.fatura_pedidos (fatura_id, pedido_id, valor)
VALUES
  (9001, 9002, 2200.00),
  (9002, 9001, 520.00)
ON CONFLICT (fatura_id, pedido_id) DO UPDATE SET
  valor = EXCLUDED.valor;

UPDATE public.pedidos
SET
  fatura_id = CASE id WHEN 9001 THEN 9002 WHEN 9002 THEN 9001 ELSE fatura_id END,
  financeiro_status = CASE id WHEN 9001 THEN 'pago' WHEN 9002 THEN 'faturado' ELSE financeiro_status END
WHERE id IN (9001, 9002);

-- ------------------------------------------------------------
-- 8) Boletos vinculados (pedido/fatura)
-- ------------------------------------------------------------
INSERT INTO public.boletos (
  id, fatura_id, pedido_id, cliente_id, banco, nosso_numero, numero_documento,
  linha_digitavel, codigo_barras, pdf_url,
  data_emissao, data_vencimento, valor, status,
  external_id, integracao_status, payload_envio, payload_retorno
)
VALUES
  (9001, 9001, 9002, 9002, 'Itaú', '9000001', 'BOL-2026-9001',
   '34191.79001 00000.000000 00000.000000 1 00000000220000',
   '34191000000002200001790010000000000000000000',
   'https://mock.bancario.local/boleto/9000001.pdf',
   CURRENT_DATE - 4, CURRENT_DATE + 10, 2200.00, 'emitido',
   'bank_bol_9001', 'pendente',
   '{"canal":"seed","origem":"fatura"}'::jsonb,
   '{"mensagem":"registro em fila"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  linha_digitavel = EXCLUDED.linha_digitavel,
  codigo_barras = EXCLUDED.codigo_barras,
  pdf_url = EXCLUDED.pdf_url,
  integracao_status = EXCLUDED.integracao_status,
  updated_at = now();

UPDATE public.faturas SET boleto_id = 9001 WHERE id = 9001;
UPDATE public.pedidos SET tem_boleto = true WHERE id = 9002;

-- ------------------------------------------------------------
-- 9) Nota fiscal e vínculos fiscais
-- ------------------------------------------------------------
INSERT INTO public.notas_fiscais (
  id, empresa_id, cliente_id, obra_id, pedido_id, fatura_id,
  numero, numero_nota, serie, tipo_documento, status, ambiente,
  data_emissao, valor_total, base_calculo, valor_iss, valor_impostos,
  codigo_servico, descricao_servico, observacoes_fiscais,
  chave_acesso, protocolo, xml_url, pdf_url,
  payload_envio, payload_retorno, external_id, lote_id
)
VALUES
  (
    9001,
    '00000000-0000-0000-0000-000000000001',
    9001, 9001, 9001, 9002,
    'NF-900001', 'NF-900001', '1', 'NFS-e', 'emitida', 'homologacao',
    now() - interval '2 days',
    520.00, 520.00, 26.00, 26.00,
    '7.09', 'Locação de caçamba 5m³',
    'Nota emitida para validação do fluxo fiscal',
    '35260300000000000000000000000000000000000001',
    'PRT-900001',
    'https://mock.fiscal.local/xml/9001.xml',
    'https://mock.fiscal.local/pdf/9001.pdf',
    '{"canal":"seed","origem":"pedido"}'::jsonb,
    '{"status":"autorizado"}'::jsonb,
    'fiscal_nf_9001',
    'lote_9001'
  )
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  valor_total = EXCLUDED.valor_total,
  chave_acesso = EXCLUDED.chave_acesso,
  protocolo = EXCLUDED.protocolo,
  payload_retorno = EXCLUDED.payload_retorno,
  updated_at = now();

INSERT INTO public.nota_fiscal_pedidos (nota_fiscal_id, pedido_id, valor, valor_vinculado)
VALUES
  (9001, 9001, 520.00, 520.00)
ON CONFLICT (nota_fiscal_id, pedido_id) DO UPDATE SET
  valor = EXCLUDED.valor,
  valor_vinculado = EXCLUDED.valor_vinculado;

UPDATE public.pedidos
SET
  nota_fiscal_id = 9001,
  status_fiscal = 'emitida',
  nota_fiscal_status = 'emitida',
  tem_nota_fiscal = true
WHERE id = 9001;

UPDATE public.faturas
SET nota_fiscal_id = 9001
WHERE id = 9002;

INSERT INTO public.fiscal_integracao_logs (
  nota_fiscal_id, empresa_id, tipo_operacao,
  request_payload, response_payload,
  http_status, status_integracao, mensagem, tentativa
)
VALUES
  (
    9001,
    '00000000-0000-0000-0000-000000000001',
    'emitir_nf',
    '{"numero":"NF-900001","cliente_id":9001}'::jsonb,
    '{"status":"autorizado","protocolo":"PRT-900001"}'::jsonb,
    200,
    'sucesso',
    'Emissão homologada',
    1
  )
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 10) Sequences alinhadas para reexecução segura
-- ------------------------------------------------------------
SELECT setval('public.configuracoes_fiscais_empresa_id_seq',
  GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.configuracoes_fiscais_empresa), 9001), true);

SELECT setval('public.clientes_id_seq',
  GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.clientes), 9003), true);

SELECT setval('public.obras_id_seq',
  GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.obras), 9003), true);

SELECT setval('public.enderecos_entrega_id_seq',
  GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.enderecos_entrega), 9003), true);

SELECT setval('public.servicos_id_seq',
  GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.servicos), 9003), true);

SELECT setval('public.cacambas_id_seq',
  GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.cacambas), 9003), true);

SELECT setval('public.unidades_cacamba_id_seq',
  GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.unidades_cacamba), 9003), true);

SELECT setval('public.motoristas_id_seq',
  GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.motoristas), 9002), true);

SELECT setval('public.veiculos_id_seq',
  GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.veiculos), 9002), true);

SELECT setval('public.pedidos_id_seq',
  GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.pedidos), 9003), true);

SELECT setval('public.faturas_id_seq',
  GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.faturas), 9002), true);

SELECT setval('public.boletos_id_seq',
  GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.boletos), 9001), true);

SELECT setval('public.notas_fiscais_id_seq',
  GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.notas_fiscais), 9001), true);

SELECT setval('public.fiscal_integracao_logs_id_seq',
  GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.fiscal_integracao_logs), 1), true);

