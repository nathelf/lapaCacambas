
-- ENUMS
CREATE TYPE public.status_cliente AS ENUM ('ativo', 'inativo', 'bloqueado');
CREATE TYPE public.tipo_cliente AS ENUM ('pf', 'pj');
CREATE TYPE public.status_pedido AS ENUM ('orcamento', 'aguardando_aprovacao', 'aprovado', 'pendente_programacao', 'programado', 'em_rota', 'em_execucao', 'concluido', 'faturado', 'cancelado');
CREATE TYPE public.tipo_pedido AS ENUM ('entrega_cacamba', 'retirada', 'troca', 'recolhimento', 'locacao_maquina', 'terraplanagem', 'demolicao', 'venda_material', 'hora_maquina', 'diaria', 'mensal', 'renovacao');
CREATE TYPE public.tipo_locacao AS ENUM ('dia', 'semana', 'quinzena', 'mes');
CREATE TYPE public.status_cacamba AS ENUM ('disponivel', 'em_uso', 'em_rota', 'reservada', 'manutencao', 'indisponivel');
CREATE TYPE public.status_veiculo AS ENUM ('disponivel', 'em_operacao', 'manutencao', 'indisponivel');
CREATE TYPE public.status_motorista AS ENUM ('ativo', 'inativo', 'ferias', 'afastado', 'bloqueado');
CREATE TYPE public.status_fatura AS ENUM ('aberta', 'paga', 'paga_parcial', 'vencida', 'cancelada', 'protesto');
CREATE TYPE public.status_boleto AS ENUM ('pendente', 'emitido', 'enviado', 'vencido', 'pago', 'cancelado', 'renegociado');
CREATE TYPE public.status_nota_fiscal AS ENUM ('nao_emitida', 'pendente', 'processando', 'emitida', 'cancelada', 'erro', 'substituida');
CREATE TYPE public.tipo_fluxo AS ENUM ('entrada', 'saida');
CREATE TYPE public.status_conta AS ENUM ('aberta', 'paga', 'vencida', 'cancelada');
CREATE TYPE public.status_material AS ENUM ('ativo', 'inativo');
CREATE TYPE public.app_role AS ENUM ('administrador', 'atendimento', 'financeiro', 'fiscal', 'operador', 'motorista', 'gestor');
CREATE TYPE public.status_ocorrencia AS ENUM ('aberta', 'em_andamento', 'resolvida', 'fechada');
CREATE TYPE public.status_execucao AS ENUM ('pendente', 'em_rota', 'no_local', 'executando', 'concluida', 'cancelada');

-- PROFILES & RBAC
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT,
  telefone TEXT,
  avatar_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- CLIENTES
CREATE TABLE public.clientes (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  fantasia TEXT,
  referencia TEXT,
  status status_cliente NOT NULL DEFAULT 'ativo',
  motivo_bloqueio TEXT,
  tipo tipo_cliente NOT NULL DEFAULT 'pf',
  cpf TEXT, cnpj TEXT, rg TEXT,
  inscricao_municipal TEXT, inscricao_estadual TEXT,
  telefone TEXT, fax TEXT, celular TEXT, email TEXT,
  endereco TEXT, numero TEXT, complemento TEXT, cep TEXT, bairro TEXT, cidade TEXT, estado TEXT,
  observacao TEXT,
  endereco_cobranca TEXT, numero_cobranca TEXT, complemento_cobranca TEXT, cep_cobranca TEXT,
  bairro_cobranca TEXT, cidade_cobranca TEXT, estado_cobranca TEXT,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE public.contatos_cliente (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT, celular TEXT, email TEXT, cargo TEXT,
  principal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- OBRAS & ENDERECOS
CREATE TABLE public.obras (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  responsavel TEXT, telefone TEXT,
  endereco TEXT, numero TEXT, complemento TEXT, cep TEXT, bairro TEXT, cidade TEXT, estado TEXT,
  latitude DOUBLE PRECISION, longitude DOUBLE PRECISION,
  ativa BOOLEAN NOT NULL DEFAULT true,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE public.enderecos_entrega (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  obra_id BIGINT REFERENCES public.obras(id),
  contato TEXT, referencia TEXT, telefone TEXT, celular TEXT,
  endereco TEXT NOT NULL, numero TEXT, complemento TEXT, cep TEXT, bairro TEXT, cidade TEXT, estado TEXT,
  latitude DOUBLE PRECISION, longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SERVICOS
CREATE TABLE public.servicos (
  id BIGSERIAL PRIMARY KEY,
  descricao TEXT NOT NULL,
  codigo_fiscal TEXT,
  aliquota NUMERIC(5,2) DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CACAMBAS
CREATE TABLE public.cacambas (
  id BIGSERIAL PRIMARY KEY,
  descricao TEXT NOT NULL,
  capacidade TEXT,
  preco_dia NUMERIC(10,2) NOT NULL DEFAULT 0,
  preco_semana NUMERIC(10,2) NOT NULL DEFAULT 0,
  preco_quinzena NUMERIC(10,2) NOT NULL DEFAULT 0,
  preco_mes NUMERIC(10,2) NOT NULL DEFAULT 0,
  imagem TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.unidades_cacamba (
  id BIGSERIAL PRIMARY KEY,
  cacamba_id BIGINT NOT NULL REFERENCES public.cacambas(id),
  patrimonio TEXT NOT NULL UNIQUE,
  status status_cacamba NOT NULL DEFAULT 'disponivel',
  pedido_atual_id BIGINT,
  cliente_atual TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MAQUINAS
CREATE TABLE public.maquinas (
  id BIGSERIAL PRIMARY KEY,
  descricao TEXT NOT NULL,
  modelo TEXT, patrimonio TEXT UNIQUE,
  preco_hora NUMERIC(10,2) DEFAULT 0,
  preco_dia NUMERIC(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'disponivel',
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FROTA
CREATE TABLE public.veiculos (
  id BIGSERIAL PRIMARY KEY,
  placa TEXT NOT NULL UNIQUE,
  modelo TEXT NOT NULL,
  cor TEXT, ano_fabricacao INT,
  data_aquisicao DATE, data_licenciamento DATE,
  km_inicial INT NOT NULL DEFAULT 0, km_atual INT NOT NULL DEFAULT 0, km_aviso_manutencao INT,
  status status_veiculo NOT NULL DEFAULT 'disponivel',
  marca TEXT, tipo TEXT, combustivel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.motoristas (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL, cpf TEXT, cnh TEXT,
  data_nascimento DATE,
  status status_motorista NOT NULL DEFAULT 'ativo',
  data_vencimento_cnh DATE,
  categoria_a BOOLEAN DEFAULT false, categoria_b BOOLEAN DEFAULT false,
  categoria_c BOOLEAN DEFAULT false, categoria_d BOOLEAN DEFAULT false, categoria_e BOOLEAN DEFAULT false,
  telefone TEXT, celular TEXT, email TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PEDIDOS
CREATE TABLE public.pedidos (
  id BIGSERIAL PRIMARY KEY,
  numero TEXT NOT NULL DEFAULT '',
  cliente_id BIGINT NOT NULL REFERENCES public.clientes(id),
  obra_id BIGINT REFERENCES public.obras(id),
  endereco_entrega_id BIGINT REFERENCES public.enderecos_entrega(id),
  servico_id BIGINT REFERENCES public.servicos(id),
  cacamba_id BIGINT REFERENCES public.cacambas(id),
  unidade_cacamba_id BIGINT REFERENCES public.unidades_cacamba(id),
  maquina_id BIGINT REFERENCES public.maquinas(id),
  tipo tipo_pedido NOT NULL DEFAULT 'entrega_cacamba',
  tipo_locacao tipo_locacao NOT NULL DEFAULT 'dia',
  status status_pedido NOT NULL DEFAULT 'orcamento',
  quantidade INT NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_desconto NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  data_pedido DATE NOT NULL DEFAULT CURRENT_DATE,
  data_desejada DATE, data_retirada_prevista DATE,
  janela_atendimento TEXT, prioridade INT NOT NULL DEFAULT 0,
  observacao TEXT, observacao_operacional TEXT,
  motorista_colocacao_id BIGINT REFERENCES public.motoristas(id),
  veiculo_colocacao_id BIGINT REFERENCES public.veiculos(id),
  data_programada DATE, hora_programada TIME,
  data_colocacao TIMESTAMPTZ, obs_colocacao TEXT,
  motorista_retirada_id BIGINT REFERENCES public.motoristas(id),
  veiculo_retirada_id BIGINT REFERENCES public.veiculos(id),
  data_retirada TIMESTAMPTZ, obs_retirada TEXT, aterro_destino TEXT,
  faturado BOOLEAN NOT NULL DEFAULT false,
  data_faturamento TIMESTAMPTZ,
  status_fiscal status_nota_fiscal NOT NULL DEFAULT 'nao_emitida',
  nota_fiscal_id BIGINT,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE public.pedido_itens (
  id BIGSERIAL PRIMARY KEY,
  pedido_id BIGINT NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  servico_id BIGINT REFERENCES public.servicos(id),
  cacamba_id BIGINT REFERENCES public.cacambas(id),
  descricao TEXT NOT NULL,
  quantidade INT NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pedido_historico (
  id BIGSERIAL PRIMARY KEY,
  pedido_id BIGINT NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  status_anterior status_pedido,
  status_novo status_pedido NOT NULL,
  observacao TEXT,
  usuario_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ROTAS & EXECUCOES
CREATE TABLE public.rotas (
  id BIGSERIAL PRIMARY KEY,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  motorista_id BIGINT NOT NULL REFERENCES public.motoristas(id),
  veiculo_id BIGINT NOT NULL REFERENCES public.veiculos(id),
  status TEXT NOT NULL DEFAULT 'planejada',
  observacao TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.rota_paradas (
  id BIGSERIAL PRIMARY KEY,
  rota_id BIGINT NOT NULL REFERENCES public.rotas(id) ON DELETE CASCADE,
  pedido_id BIGINT REFERENCES public.pedidos(id),
  ordem INT NOT NULL DEFAULT 0,
  endereco TEXT,
  latitude DOUBLE PRECISION, longitude DOUBLE PRECISION,
  tipo TEXT,
  status status_execucao NOT NULL DEFAULT 'pendente',
  hora_chegada TIMESTAMPTZ, hora_saida TIMESTAMPTZ,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.execucoes (
  id BIGSERIAL PRIMARY KEY,
  pedido_id BIGINT NOT NULL REFERENCES public.pedidos(id),
  rota_parada_id BIGINT REFERENCES public.rota_paradas(id),
  motorista_id BIGINT REFERENCES public.motoristas(id),
  veiculo_id BIGINT REFERENCES public.veiculos(id),
  tipo TEXT NOT NULL,
  status status_execucao NOT NULL DEFAULT 'pendente',
  data_inicio TIMESTAMPTZ, data_fim TIMESTAMPTZ,
  latitude DOUBLE PRECISION, longitude DOUBLE PRECISION,
  observacao TEXT, evidencia_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FINANCEIRO
CREATE TABLE public.faturas (
  id BIGSERIAL PRIMARY KEY,
  numero TEXT NOT NULL DEFAULT '',
  cliente_id BIGINT NOT NULL REFERENCES public.clientes(id),
  obra_id BIGINT REFERENCES public.obras(id),
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento DATE NOT NULL,
  valor_bruto NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_desconto NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_juros NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_multa NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_taxa NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_liquido NUMERIC(10,2) NOT NULL DEFAULT 0,
  forma_cobranca TEXT,
  status status_fatura NOT NULL DEFAULT 'aberta',
  data_baixa TIMESTAMPTZ, valor_baixa NUMERIC(10,2),
  observacao TEXT,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.fatura_pedidos (
  id BIGSERIAL PRIMARY KEY,
  fatura_id BIGINT NOT NULL REFERENCES public.faturas(id) ON DELETE CASCADE,
  pedido_id BIGINT NOT NULL REFERENCES public.pedidos(id),
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  UNIQUE(fatura_id, pedido_id)
);

CREATE TABLE public.cobrancas (
  id BIGSERIAL PRIMARY KEY,
  fatura_id BIGINT REFERENCES public.faturas(id),
  cliente_id BIGINT NOT NULL REFERENCES public.clientes(id),
  tipo TEXT NOT NULL DEFAULT 'boleto',
  valor NUMERIC(10,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.boletos (
  id BIGSERIAL PRIMARY KEY,
  fatura_id BIGINT REFERENCES public.faturas(id),
  cobranca_id BIGINT REFERENCES public.cobrancas(id),
  cliente_id BIGINT NOT NULL REFERENCES public.clientes(id),
  banco TEXT, nosso_numero TEXT, numero_documento TEXT,
  linha_digitavel TEXT, codigo_barras TEXT, pix_copia_cola TEXT, pdf_url TEXT,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento DATE NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  valor_multa NUMERIC(10,2) DEFAULT 0,
  valor_juros NUMERIC(10,2) DEFAULT 0,
  data_pagamento DATE, valor_pago NUMERIC(10,2),
  status status_boleto NOT NULL DEFAULT 'pendente',
  tentativas_envio INT NOT NULL DEFAULT 0, ultimo_envio TIMESTAMPTZ,
  observacao TEXT,
  integracao_id TEXT, integracao_status TEXT, integracao_erro TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.contas_pagar (
  id BIGSERIAL PRIMARY KEY,
  descricao TEXT NOT NULL,
  nota_fiscal TEXT,
  valor NUMERIC(10,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE, valor_pagamento NUMERIC(10,2),
  fornecedor_id BIGINT,
  categoria TEXT, subcategoria TEXT, conta_bancaria TEXT,
  status status_conta NOT NULL DEFAULT 'aberta',
  cartorio BOOLEAN NOT NULL DEFAULT false,
  observacao TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FISCAL
CREATE TABLE public.notas_fiscais (
  id BIGSERIAL PRIMARY KEY,
  numero TEXT, serie TEXT DEFAULT '1', chave_acesso TEXT, protocolo TEXT,
  data_emissao TIMESTAMPTZ NOT NULL DEFAULT now(),
  cliente_id BIGINT NOT NULL REFERENCES public.clientes(id),
  fatura_id BIGINT REFERENCES public.faturas(id),
  cpf_cnpj_tomador TEXT, inscricao_municipal TEXT, inscricao_estadual TEXT,
  endereco_tomador TEXT, municipio_tomador TEXT,
  codigo_servico TEXT, descricao_servico TEXT,
  aliquota NUMERIC(5,2) DEFAULT 0, base_calculo NUMERIC(10,2) DEFAULT 0,
  valor_iss NUMERIC(10,2) DEFAULT 0, valor_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  observacao_fiscal TEXT,
  status status_nota_fiscal NOT NULL DEFAULT 'pendente',
  erro_mensagem TEXT, tentativas INT NOT NULL DEFAULT 0,
  xml_url TEXT, pdf_url TEXT, danfe_url TEXT,
  integracao_id TEXT, integracao_request JSONB, integracao_response JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.nota_fiscal_pedidos (
  id BIGSERIAL PRIMARY KEY,
  nota_fiscal_id BIGINT NOT NULL REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  pedido_id BIGINT NOT NULL REFERENCES public.pedidos(id),
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  UNIQUE(nota_fiscal_id, pedido_id)
);

ALTER TABLE public.pedidos ADD CONSTRAINT fk_pedido_nota_fiscal FOREIGN KEY (nota_fiscal_id) REFERENCES public.notas_fiscais(id);

-- FORNECEDORES
CREATE TABLE public.fornecedores (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL, fantasia TEXT,
  tipo tipo_cliente NOT NULL DEFAULT 'pj',
  cpf TEXT, cnpj TEXT, contato TEXT, telefone TEXT, email TEXT,
  endereco TEXT, numero TEXT, complemento TEXT, cep TEXT, bairro TEXT, cidade TEXT, estado TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- MATERIAIS
CREATE TABLE public.materiais (
  id BIGSERIAL PRIMARY KEY,
  descricao TEXT NOT NULL,
  status status_material NOT NULL DEFAULT 'ativo',
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantidade INT NOT NULL DEFAULT 0, estoque INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- OCORRENCIAS & ANEXOS
CREATE TABLE public.ocorrencias (
  id BIGSERIAL PRIMARY KEY,
  pedido_id BIGINT REFERENCES public.pedidos(id),
  cliente_id BIGINT REFERENCES public.clientes(id),
  tipo TEXT NOT NULL, titulo TEXT NOT NULL, descricao TEXT,
  status status_ocorrencia NOT NULL DEFAULT 'aberta',
  prioridade INT NOT NULL DEFAULT 0,
  responsavel_id UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.anexos (
  id BIGSERIAL PRIMARY KEY,
  entidade TEXT NOT NULL, entidade_id BIGINT NOT NULL,
  nome TEXT NOT NULL, url TEXT NOT NULL, tipo TEXT, tamanho BIGINT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AUDITORIA
CREATE TABLE public.logs_auditoria (
  id BIGSERIAL PRIMARY KEY,
  usuario_id UUID REFERENCES auth.users(id),
  acao TEXT NOT NULL, entidade TEXT NOT NULL, entidade_id BIGINT,
  dados_anteriores JSONB, dados_novos JSONB, ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_clientes_nome ON public.clientes(nome);
CREATE INDEX idx_clientes_cpf ON public.clientes(cpf);
CREATE INDEX idx_clientes_cnpj ON public.clientes(cnpj);
CREATE INDEX idx_clientes_status ON public.clientes(status);
CREATE INDEX idx_pedidos_cliente ON public.pedidos(cliente_id);
CREATE INDEX idx_pedidos_status ON public.pedidos(status);
CREATE INDEX idx_pedidos_data ON public.pedidos(data_pedido);
CREATE INDEX idx_pedidos_numero ON public.pedidos(numero);
CREATE INDEX idx_pedidos_status_fiscal ON public.pedidos(status_fiscal);
CREATE INDEX idx_faturas_cliente ON public.faturas(cliente_id);
CREATE INDEX idx_faturas_status ON public.faturas(status);
CREATE INDEX idx_faturas_vencimento ON public.faturas(data_vencimento);
CREATE INDEX idx_boletos_cliente ON public.boletos(cliente_id);
CREATE INDEX idx_boletos_status ON public.boletos(status);
CREATE INDEX idx_boletos_vencimento ON public.boletos(data_vencimento);
CREATE INDEX idx_notas_fiscais_cliente ON public.notas_fiscais(cliente_id);
CREATE INDEX idx_notas_fiscais_status ON public.notas_fiscais(status);
CREATE INDEX idx_notas_fiscais_numero ON public.notas_fiscais(numero);
CREATE INDEX idx_obras_cliente ON public.obras(cliente_id);
CREATE INDEX idx_enderecos_cliente ON public.enderecos_entrega(cliente_id);
CREATE INDEX idx_contatos_cliente ON public.contatos_cliente(cliente_id);
CREATE INDEX idx_historico_pedido ON public.pedido_historico(pedido_id);
CREATE INDEX idx_logs_entidade ON public.logs_auditoria(entidade, entidade_id);
CREATE INDEX idx_logs_usuario ON public.logs_auditoria(usuario_id);

-- RBAC FUNCTION
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'atendimento');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- AUTO-GENERATE PEDIDO NUMERO
CREATE OR REPLACE FUNCTION public.generate_pedido_numero()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.numero := 'PED-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEW.id::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pedido_numero BEFORE INSERT ON public.pedidos FOR EACH ROW WHEN (NEW.numero = '') EXECUTE FUNCTION public.generate_pedido_numero();

-- AUTO-GENERATE FATURA NUMERO
CREATE OR REPLACE FUNCTION public.generate_fatura_numero()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.numero := 'FAT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEW.id::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_fatura_numero BEFORE INSERT ON public.faturas FOR EACH ROW WHEN (NEW.numero = '') EXECUTE FUNCTION public.generate_fatura_numero();

-- UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_clientes_updated BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_pedidos_updated BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_faturas_updated BEFORE UPDATE ON public.faturas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_notas_fiscais_updated BEFORE UPDATE ON public.notas_fiscais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_boletos_updated BEFORE UPDATE ON public.boletos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_veiculos_updated BEFORE UPDATE ON public.veiculos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_motoristas_updated BEFORE UPDATE ON public.motoristas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contatos_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enderecos_entrega ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cacambas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades_cacamba ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maquinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rota_paradas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execucoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fatura_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cobrancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boletos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nota_fiscal_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "System inserts profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "auth_clientes" ON public.clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_contatos" ON public.contatos_cliente FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_obras" ON public.obras FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_enderecos" ON public.enderecos_entrega FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_servicos" ON public.servicos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_cacambas" ON public.cacambas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_unidades" ON public.unidades_cacamba FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_maquinas" ON public.maquinas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_veiculos" ON public.veiculos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_motoristas" ON public.motoristas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_pedidos" ON public.pedidos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_pedido_itens" ON public.pedido_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_pedido_hist" ON public.pedido_historico FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_rotas" ON public.rotas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_rota_par" ON public.rota_paradas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_execucoes" ON public.execucoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_faturas" ON public.faturas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_fat_ped" ON public.fatura_pedidos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_cobrancas" ON public.cobrancas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_boletos" ON public.boletos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_contas" ON public.contas_pagar FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_nf" ON public.notas_fiscais FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_nf_ped" ON public.nota_fiscal_pedidos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_fornecedores" ON public.fornecedores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_materiais" ON public.materiais FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_ocorrencias" ON public.ocorrencias FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_anexos" ON public.anexos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_logs_read" ON public.logs_auditoria FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_logs_insert" ON public.logs_auditoria FOR INSERT TO authenticated WITH CHECK (true);
