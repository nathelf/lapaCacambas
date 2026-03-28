-- ============================================================
-- MIGRAÇÃO BATCH LEGADO → SISTEMA (LAPACacambas)
-- Executa tudo server-side em 2 INSERTs + mapa de IDs.
-- Rodar com: psql -f etl_batch.sql
-- ============================================================

BEGIN;

-- ─── 1) CLIENTES ────────────────────────────────────────────
-- Lê de public.cliente (legado) e insere em public.clientes (sistema).
-- status: 0=ativo, 1=inativo, 2=bloqueado
-- tipo:   0=pj,   1=pf
WITH ins AS (
  INSERT INTO public.clientes (
    nome, fantasia, referencia,
    email, telefone, celular, fax,
    cpf, cnpj, rg,
    observacao,
    endereco, numero, complemento, cep, bairro, cidade, estado,
    endereco_cobranca, numero_cobranca, complemento_cobranca,
    cep_cobranca, bairro_cobranca, cidade_cobranca, estado_cobranca,
    status, tipo,
    legacy_codigo_cliente
  )
  SELECT
    COALESCE(NULLIF(TRIM(c.nome_cliente), ''), 'SEM NOME'),
    NULLIF(TRIM(c.fantasia),        ''),
    NULLIF(TRIM(c.referencia_cli),  ''),
    NULLIF(TRIM(c.e_mail),          ''),
    NULLIF(TRIM(c.fone),            ''),
    NULLIF(TRIM(c.celular),         ''),
    NULLIF(TRIM(c.fax),             ''),
    NULLIF(TRIM(c.cpf),             ''),
    NULLIF(TRIM(c.cnpj),            ''),
    NULLIF(TRIM(c.rg),              ''),
    NULLIF(TRIM(c.observa),         ''),
    NULLIF(TRIM(c.endereco),        ''),
    NULLIF(TRIM(c.numero),          ''),
    NULLIF(TRIM(c.complemento),     ''),
    NULLIF(TRIM(c.cep),             ''),
    NULLIF(TRIM(c.bairro),          ''),
    NULLIF(TRIM(c.cidade),          ''),
    NULLIF(TRIM(c.estado),          ''),
    NULLIF(TRIM(c.endereco_cob),    ''),
    NULLIF(TRIM(c.numero_cob),      ''),
    NULLIF(TRIM(c.complemento_cob), ''),
    NULLIF(TRIM(c.cep_cob),         ''),
    NULLIF(TRIM(c.bairro_cob),      ''),
    NULLIF(TRIM(c.cidade_cob),      ''),
    NULLIF(TRIM(c.estado_cob),      ''),
    CASE TRIM(c.status)
      WHEN '0' THEN 'ativo'::public.status_cliente
      WHEN '1' THEN 'inativo'::public.status_cliente
      WHEN '2' THEN 'bloqueado'::public.status_cliente
      ELSE          'ativo'::public.status_cliente
    END,
    CASE TRIM(c.tipo)
      WHEN '1' THEN 'pf'::public.tipo_cliente
      ELSE          'pj'::public.tipo_cliente
    END,
    c.codigo_cliente
  FROM public.cliente c
  RETURNING id, legacy_codigo_cliente
)
INSERT INTO public.migration_legacy_id_map (entity_type, legacy_id, new_id)
SELECT 'cliente', ins.legacy_codigo_cliente, ins.id
FROM ins
ON CONFLICT (entity_type, legacy_id) DO NOTHING;

-- ─── 2) PEDIDOS ─────────────────────────────────────────────
-- Lê de public.pedido (legado) e insere em public.pedidos (sistema).
-- Resolve cliente_id via migration_legacy_id_map.
-- status_pedido: D=concluido, C=cancelado, L=pendente_programacao, A=orcamento
-- tipo_locacao:  D=dia, S=semana, Q=quinzena, M=mes
-- faturado:      S=true, N=false
WITH map AS (
  SELECT legacy_id, new_id
  FROM public.migration_legacy_id_map
  WHERE entity_type = 'cliente'
),
ins AS (
  INSERT INTO public.pedidos (
    numero, cliente_id,
    data_pedido, data_retirada_prevista,
    tipo, tipo_locacao, status,
    quantidade, valor_unitario, valor_total, valor_desconto,
    faturado, status_fiscal,
    observacao,
    legacy_codigo_pedido
  )
  SELECT
    p.codigo_pedido::text,
    m.new_id,
    p.data_pedido_colocada,
    p.data_ret_prev,
    'entrega_cacamba'::public.tipo_pedido,
    CASE TRIM(p.tipo_locacao)
      WHEN 'D' THEN 'dia'::public.tipo_locacao
      WHEN 'S' THEN 'semana'::public.tipo_locacao
      WHEN 'Q' THEN 'quinzena'::public.tipo_locacao
      WHEN 'M' THEN 'mes'::public.tipo_locacao
      ELSE          'dia'::public.tipo_locacao
    END,
    CASE TRIM(p.status_pedido)
      WHEN 'D' THEN 'concluido'::public.status_pedido
      WHEN 'C' THEN 'cancelado'::public.status_pedido
      WHEN 'L' THEN 'pendente_programacao'::public.status_pedido
      WHEN 'A' THEN 'orcamento'::public.status_pedido
      ELSE          'orcamento'::public.status_pedido
    END,
    COALESCE(p.qtde, 1),
    COALESCE(ROUND(p.valor / NULLIF(p.qtde, 0), 2), p.valor, 0),
    COALESCE(p.valor, 0),
    0,
    TRIM(p.faturado) = 'S',
    'nao_emitida'::public.status_nota_fiscal,
    NULLIF(TRIM(p.obscoloca::text), ''),
    p.codigo_pedido
  FROM public.pedido p
  JOIN map m ON m.legacy_id = p.codigo_cliente
  RETURNING id, legacy_codigo_pedido
)
INSERT INTO public.migration_legacy_id_map (entity_type, legacy_id, new_id)
SELECT 'pedido', ins.legacy_codigo_pedido, ins.id
FROM ins
ON CONFLICT (entity_type, legacy_id) DO NOTHING;

-- ─── LOG ─────────────────────────────────────────────────────
INSERT INTO public.migration_run_log (phase, status, message, finished_at)
VALUES ('etl_batch_sql', 'ok', 'migração batch SQL concluída', now());

COMMIT;

-- ─── RESULTADO ───────────────────────────────────────────────
SELECT
  'clientes'  AS tabela, count(*) AS migrados FROM public.clientes
UNION ALL
SELECT 'pedidos',    count(*) FROM public.pedidos
UNION ALL
SELECT 'id_map',     count(*) FROM public.migration_legacy_id_map;
