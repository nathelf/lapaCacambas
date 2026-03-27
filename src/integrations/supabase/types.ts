export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      anexos: {
        Row: {
          created_at: string
          created_by: string | null
          entidade: string
          entidade_id: number
          id: number
          nome: string
          tamanho: number | null
          tipo: string | null
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entidade: string
          entidade_id: number
          id?: number
          nome: string
          tamanho?: number | null
          tipo?: string | null
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entidade?: string
          entidade_id?: number
          id?: number
          nome?: string
          tamanho?: number | null
          tipo?: string | null
          url?: string
        }
        Relationships: []
      }
      boletos: {
        Row: {
          banco: string | null
          cliente_id: number
          cobranca_id: number | null
          codigo_barras: string | null
          created_at: string
          created_by: string | null
          data_emissao: string
          data_pagamento: string | null
          data_vencimento: string
          fatura_id: number | null
          id: number
          integracao_erro: string | null
          integracao_id: string | null
          integracao_status: string | null
          linha_digitavel: string | null
          nosso_numero: string | null
          numero_documento: string | null
          observacao: string | null
          pdf_url: string | null
          pix_copia_cola: string | null
          status: Database["public"]["Enums"]["status_boleto"]
          tentativas_envio: number
          ultimo_envio: string | null
          updated_at: string
          valor: number
          valor_juros: number | null
          valor_multa: number | null
          valor_pago: number | null
        }
        Insert: {
          banco?: string | null
          cliente_id: number
          cobranca_id?: number | null
          codigo_barras?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          data_pagamento?: string | null
          data_vencimento: string
          fatura_id?: number | null
          id?: number
          integracao_erro?: string | null
          integracao_id?: string | null
          integracao_status?: string | null
          linha_digitavel?: string | null
          nosso_numero?: string | null
          numero_documento?: string | null
          observacao?: string | null
          pdf_url?: string | null
          pix_copia_cola?: string | null
          status?: Database["public"]["Enums"]["status_boleto"]
          tentativas_envio?: number
          ultimo_envio?: string | null
          updated_at?: string
          valor: number
          valor_juros?: number | null
          valor_multa?: number | null
          valor_pago?: number | null
        }
        Update: {
          banco?: string | null
          cliente_id?: number
          cobranca_id?: number | null
          codigo_barras?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          data_pagamento?: string | null
          data_vencimento?: string
          fatura_id?: number | null
          id?: number
          integracao_erro?: string | null
          integracao_id?: string | null
          integracao_status?: string | null
          linha_digitavel?: string | null
          nosso_numero?: string | null
          numero_documento?: string | null
          observacao?: string | null
          pdf_url?: string | null
          pix_copia_cola?: string | null
          status?: Database["public"]["Enums"]["status_boleto"]
          tentativas_envio?: number
          ultimo_envio?: string | null
          updated_at?: string
          valor?: number
          valor_juros?: number | null
          valor_multa?: number | null
          valor_pago?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "boletos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boletos_cobranca_id_fkey"
            columns: ["cobranca_id"]
            isOneToOne: false
            referencedRelation: "cobrancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boletos_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
        ]
      }
      cacambas: {
        Row: {
          ativo: boolean
          capacidade: string | null
          created_at: string
          descricao: string
          id: number
          imagem: string | null
          preco_dia: number
          preco_mes: number
          preco_quinzena: number
          preco_semana: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          capacidade?: string | null
          created_at?: string
          descricao: string
          id?: number
          imagem?: string | null
          preco_dia?: number
          preco_mes?: number
          preco_quinzena?: number
          preco_semana?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          capacidade?: string | null
          created_at?: string
          descricao?: string
          id?: number
          imagem?: string | null
          preco_dia?: number
          preco_mes?: number
          preco_quinzena?: number
          preco_semana?: number
          updated_at?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          bairro: string | null
          bairro_cobranca: string | null
          celular: string | null
          cep: string | null
          cep_cobranca: string | null
          cidade: string | null
          cidade_cobranca: string | null
          cnpj: string | null
          complemento: string | null
          complemento_cobranca: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          endereco: string | null
          endereco_cobranca: string | null
          estado: string | null
          estado_cobranca: string | null
          fantasia: string | null
          fax: string | null
          id: number
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          motivo_bloqueio: string | null
          nome: string
          numero: string | null
          numero_cobranca: string | null
          observacao: string | null
          referencia: string | null
          rg: string | null
          status: Database["public"]["Enums"]["status_cliente"]
          telefone: string | null
          tipo: Database["public"]["Enums"]["tipo_cliente"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bairro?: string | null
          bairro_cobranca?: string | null
          celular?: string | null
          cep?: string | null
          cep_cobranca?: string | null
          cidade?: string | null
          cidade_cobranca?: string | null
          cnpj?: string | null
          complemento?: string | null
          complemento_cobranca?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          endereco?: string | null
          endereco_cobranca?: string | null
          estado?: string | null
          estado_cobranca?: string | null
          fantasia?: string | null
          fax?: string | null
          id?: number
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          motivo_bloqueio?: string | null
          nome: string
          numero?: string | null
          numero_cobranca?: string | null
          observacao?: string | null
          referencia?: string | null
          rg?: string | null
          status?: Database["public"]["Enums"]["status_cliente"]
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["tipo_cliente"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bairro?: string | null
          bairro_cobranca?: string | null
          celular?: string | null
          cep?: string | null
          cep_cobranca?: string | null
          cidade?: string | null
          cidade_cobranca?: string | null
          cnpj?: string | null
          complemento?: string | null
          complemento_cobranca?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          endereco?: string | null
          endereco_cobranca?: string | null
          estado?: string | null
          estado_cobranca?: string | null
          fantasia?: string | null
          fax?: string | null
          id?: number
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          motivo_bloqueio?: string | null
          nome?: string
          numero?: string | null
          numero_cobranca?: string | null
          observacao?: string | null
          referencia?: string | null
          rg?: string | null
          status?: Database["public"]["Enums"]["status_cliente"]
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["tipo_cliente"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      cobrancas: {
        Row: {
          cliente_id: number
          created_at: string
          data_vencimento: string
          fatura_id: number | null
          id: number
          observacao: string | null
          status: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          cliente_id: number
          created_at?: string
          data_vencimento: string
          fatura_id?: number | null
          id?: number
          observacao?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor: number
        }
        Update: {
          cliente_id?: number
          created_at?: string
          data_vencimento?: string
          fatura_id?: number | null
          id?: number
          observacao?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "cobrancas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_pagar: {
        Row: {
          cartorio: boolean
          categoria: string | null
          conta_bancaria: string | null
          created_at: string
          created_by: string | null
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          fornecedor_id: number | null
          id: number
          nota_fiscal: string | null
          observacao: string | null
          status: Database["public"]["Enums"]["status_conta"]
          subcategoria: string | null
          updated_at: string
          valor: number
          valor_pagamento: number | null
        }
        Insert: {
          cartorio?: boolean
          categoria?: string | null
          conta_bancaria?: string | null
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          fornecedor_id?: number | null
          id?: number
          nota_fiscal?: string | null
          observacao?: string | null
          status?: Database["public"]["Enums"]["status_conta"]
          subcategoria?: string | null
          updated_at?: string
          valor: number
          valor_pagamento?: number | null
        }
        Update: {
          cartorio?: boolean
          categoria?: string | null
          conta_bancaria?: string | null
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          fornecedor_id?: number | null
          id?: number
          nota_fiscal?: string | null
          observacao?: string | null
          status?: Database["public"]["Enums"]["status_conta"]
          subcategoria?: string | null
          updated_at?: string
          valor?: number
          valor_pagamento?: number | null
        }
        Relationships: []
      }
      contatos_cliente: {
        Row: {
          cargo: string | null
          celular: string | null
          cliente_id: number
          created_at: string
          email: string | null
          id: number
          nome: string
          principal: boolean
          telefone: string | null
        }
        Insert: {
          cargo?: string | null
          celular?: string | null
          cliente_id: number
          created_at?: string
          email?: string | null
          id?: number
          nome: string
          principal?: boolean
          telefone?: string | null
        }
        Update: {
          cargo?: string | null
          celular?: string | null
          cliente_id?: number
          created_at?: string
          email?: string | null
          id?: number
          nome?: string
          principal?: boolean
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contatos_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      enderecos_entrega: {
        Row: {
          bairro: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          cliente_id: number
          complemento: string | null
          contato: string | null
          created_at: string
          endereco: string
          estado: string | null
          id: number
          latitude: number | null
          longitude: number | null
          numero: string | null
          obra_id: number | null
          referencia: string | null
          telefone: string | null
        }
        Insert: {
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          cliente_id: number
          complemento?: string | null
          contato?: string | null
          created_at?: string
          endereco: string
          estado?: string | null
          id?: number
          latitude?: number | null
          longitude?: number | null
          numero?: string | null
          obra_id?: number | null
          referencia?: string | null
          telefone?: string | null
        }
        Update: {
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          cliente_id?: number
          complemento?: string | null
          contato?: string | null
          created_at?: string
          endereco?: string
          estado?: string | null
          id?: number
          latitude?: number | null
          longitude?: number | null
          numero?: string | null
          obra_id?: number | null
          referencia?: string | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enderecos_entrega_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enderecos_entrega_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      execucoes: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          evidencia_url: string | null
          id: number
          latitude: number | null
          longitude: number | null
          motorista_id: number | null
          observacao: string | null
          pedido_id: number
          rota_parada_id: number | null
          status: Database["public"]["Enums"]["status_execucao"]
          tipo: string
          updated_at: string
          veiculo_id: number | null
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          evidencia_url?: string | null
          id?: number
          latitude?: number | null
          longitude?: number | null
          motorista_id?: number | null
          observacao?: string | null
          pedido_id: number
          rota_parada_id?: number | null
          status?: Database["public"]["Enums"]["status_execucao"]
          tipo: string
          updated_at?: string
          veiculo_id?: number | null
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          evidencia_url?: string | null
          id?: number
          latitude?: number | null
          longitude?: number | null
          motorista_id?: number | null
          observacao?: string | null
          pedido_id?: number
          rota_parada_id?: number | null
          status?: Database["public"]["Enums"]["status_execucao"]
          tipo?: string
          updated_at?: string
          veiculo_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "execucoes_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execucoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execucoes_rota_parada_id_fkey"
            columns: ["rota_parada_id"]
            isOneToOne: false
            referencedRelation: "rota_paradas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execucoes_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      fatura_pedidos: {
        Row: {
          fatura_id: number
          id: number
          pedido_id: number
          valor: number
        }
        Insert: {
          fatura_id: number
          id?: number
          pedido_id: number
          valor?: number
        }
        Update: {
          fatura_id?: number
          id?: number
          pedido_id?: number
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "fatura_pedidos_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fatura_pedidos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      faturas: {
        Row: {
          cliente_id: number
          created_at: string
          created_by: string | null
          data_baixa: string | null
          data_emissao: string
          data_vencimento: string
          forma_cobranca: string | null
          id: number
          numero: string
          obra_id: number | null
          observacao: string | null
          status: Database["public"]["Enums"]["status_fatura"]
          updated_at: string
          updated_by: string | null
          valor_baixa: number | null
          valor_bruto: number
          valor_desconto: number
          valor_juros: number
          valor_liquido: number
          valor_multa: number
          valor_taxa: number
        }
        Insert: {
          cliente_id: number
          created_at?: string
          created_by?: string | null
          data_baixa?: string | null
          data_emissao?: string
          data_vencimento: string
          forma_cobranca?: string | null
          id?: number
          numero?: string
          obra_id?: number | null
          observacao?: string | null
          status?: Database["public"]["Enums"]["status_fatura"]
          updated_at?: string
          updated_by?: string | null
          valor_baixa?: number | null
          valor_bruto?: number
          valor_desconto?: number
          valor_juros?: number
          valor_liquido?: number
          valor_multa?: number
          valor_taxa?: number
        }
        Update: {
          cliente_id?: number
          created_at?: string
          created_by?: string | null
          data_baixa?: string | null
          data_emissao?: string
          data_vencimento?: string
          forma_cobranca?: string | null
          id?: number
          numero?: string
          obra_id?: number | null
          observacao?: string | null
          status?: Database["public"]["Enums"]["status_fatura"]
          updated_at?: string
          updated_by?: string | null
          valor_baixa?: number | null
          valor_bruto?: number
          valor_desconto?: number
          valor_juros?: number
          valor_liquido?: number
          valor_multa?: number
          valor_taxa?: number
        }
        Relationships: [
          {
            foreignKeyName: "faturas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          contato: string | null
          cpf: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          fantasia: string | null
          id: number
          nome: string
          numero: string | null
          status: string
          telefone: string | null
          tipo: Database["public"]["Enums"]["tipo_cliente"]
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          contato?: string | null
          cpf?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          fantasia?: string | null
          id?: number
          nome: string
          numero?: string | null
          status?: string
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["tipo_cliente"]
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          contato?: string | null
          cpf?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          fantasia?: string | null
          id?: number
          nome?: string
          numero?: string | null
          status?: string
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["tipo_cliente"]
          updated_at?: string
        }
        Relationships: []
      }
      logs_auditoria: {
        Row: {
          acao: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          entidade: string
          entidade_id: number | null
          id: number
          ip: string | null
          usuario_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          entidade: string
          entidade_id?: number | null
          id?: number
          ip?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          entidade?: string
          entidade_id?: number | null
          id?: number
          ip?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      maquinas: {
        Row: {
          created_at: string
          descricao: string
          id: number
          modelo: string | null
          observacao: string | null
          patrimonio: string | null
          preco_dia: number | null
          preco_hora: number | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: number
          modelo?: string | null
          observacao?: string | null
          patrimonio?: string | null
          preco_dia?: number | null
          preco_hora?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: number
          modelo?: string | null
          observacao?: string | null
          patrimonio?: string | null
          preco_dia?: number | null
          preco_hora?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      materiais: {
        Row: {
          created_at: string
          descricao: string
          estoque: number
          id: number
          quantidade: number
          status: Database["public"]["Enums"]["status_material"]
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          descricao: string
          estoque?: number
          id?: number
          quantidade?: number
          status?: Database["public"]["Enums"]["status_material"]
          updated_at?: string
          valor?: number
        }
        Update: {
          created_at?: string
          descricao?: string
          estoque?: number
          id?: number
          quantidade?: number
          status?: Database["public"]["Enums"]["status_material"]
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      motoristas: {
        Row: {
          categoria_a: boolean | null
          categoria_b: boolean | null
          categoria_c: boolean | null
          categoria_d: boolean | null
          categoria_e: boolean | null
          celular: string | null
          cnh: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          data_vencimento_cnh: string | null
          email: string | null
          id: number
          nome: string
          status: Database["public"]["Enums"]["status_motorista"]
          telefone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          categoria_a?: boolean | null
          categoria_b?: boolean | null
          categoria_c?: boolean | null
          categoria_d?: boolean | null
          categoria_e?: boolean | null
          celular?: string | null
          cnh?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          data_vencimento_cnh?: string | null
          email?: string | null
          id?: number
          nome: string
          status?: Database["public"]["Enums"]["status_motorista"]
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          categoria_a?: boolean | null
          categoria_b?: boolean | null
          categoria_c?: boolean | null
          categoria_d?: boolean | null
          categoria_e?: boolean | null
          celular?: string | null
          cnh?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          data_vencimento_cnh?: string | null
          email?: string | null
          id?: number
          nome?: string
          status?: Database["public"]["Enums"]["status_motorista"]
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      nota_fiscal_pedidos: {
        Row: {
          id: number
          nota_fiscal_id: number
          pedido_id: number
          valor: number
        }
        Insert: {
          id?: number
          nota_fiscal_id: number
          pedido_id: number
          valor?: number
        }
        Update: {
          id?: number
          nota_fiscal_id?: number
          pedido_id?: number
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "nota_fiscal_pedidos_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_fiscal_pedidos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais: {
        Row: {
          aliquota: number | null
          base_calculo: number | null
          chave_acesso: string | null
          cliente_id: number
          codigo_servico: string | null
          cpf_cnpj_tomador: string | null
          created_at: string
          created_by: string | null
          danfe_url: string | null
          data_emissao: string
          descricao_servico: string | null
          endereco_tomador: string | null
          erro_mensagem: string | null
          fatura_id: number | null
          id: number
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          integracao_id: string | null
          integracao_request: Json | null
          integracao_response: Json | null
          municipio_tomador: string | null
          numero: string | null
          observacao_fiscal: string | null
          pdf_url: string | null
          protocolo: string | null
          serie: string | null
          status: Database["public"]["Enums"]["status_nota_fiscal"]
          tentativas: number
          updated_at: string
          valor_iss: number | null
          valor_total: number
          xml_url: string | null
        }
        Insert: {
          aliquota?: number | null
          base_calculo?: number | null
          chave_acesso?: string | null
          cliente_id: number
          codigo_servico?: string | null
          cpf_cnpj_tomador?: string | null
          created_at?: string
          created_by?: string | null
          danfe_url?: string | null
          data_emissao?: string
          descricao_servico?: string | null
          endereco_tomador?: string | null
          erro_mensagem?: string | null
          fatura_id?: number | null
          id?: number
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          integracao_id?: string | null
          integracao_request?: Json | null
          integracao_response?: Json | null
          municipio_tomador?: string | null
          numero?: string | null
          observacao_fiscal?: string | null
          pdf_url?: string | null
          protocolo?: string | null
          serie?: string | null
          status?: Database["public"]["Enums"]["status_nota_fiscal"]
          tentativas?: number
          updated_at?: string
          valor_iss?: number | null
          valor_total?: number
          xml_url?: string | null
        }
        Update: {
          aliquota?: number | null
          base_calculo?: number | null
          chave_acesso?: string | null
          cliente_id?: number
          codigo_servico?: string | null
          cpf_cnpj_tomador?: string | null
          created_at?: string
          created_by?: string | null
          danfe_url?: string | null
          data_emissao?: string
          descricao_servico?: string | null
          endereco_tomador?: string | null
          erro_mensagem?: string | null
          fatura_id?: number | null
          id?: number
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          integracao_id?: string | null
          integracao_request?: Json | null
          integracao_response?: Json | null
          municipio_tomador?: string | null
          numero?: string | null
          observacao_fiscal?: string | null
          pdf_url?: string | null
          protocolo?: string | null
          serie?: string | null
          status?: Database["public"]["Enums"]["status_nota_fiscal"]
          tentativas?: number
          updated_at?: string
          valor_iss?: number | null
          valor_total?: number
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_fiscais_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          ativa: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          cliente_id: number
          complemento: string | null
          created_at: string
          deleted_at: string | null
          endereco: string | null
          estado: string | null
          id: number
          latitude: number | null
          longitude: number | null
          nome: string
          numero: string | null
          observacao: string | null
          responsavel: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cliente_id: number
          complemento?: string | null
          created_at?: string
          deleted_at?: string | null
          endereco?: string | null
          estado?: string | null
          id?: number
          latitude?: number | null
          longitude?: number | null
          nome: string
          numero?: string | null
          observacao?: string | null
          responsavel?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cliente_id?: number
          complemento?: string | null
          created_at?: string
          deleted_at?: string | null
          endereco?: string | null
          estado?: string | null
          id?: number
          latitude?: number | null
          longitude?: number | null
          nome?: string
          numero?: string | null
          observacao?: string | null
          responsavel?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencias: {
        Row: {
          cliente_id: number | null
          created_at: string
          created_by: string | null
          descricao: string | null
          id: number
          pedido_id: number | null
          prioridade: number
          responsavel_id: string | null
          status: Database["public"]["Enums"]["status_ocorrencia"]
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          cliente_id?: number | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: number
          pedido_id?: number | null
          prioridade?: number
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["status_ocorrencia"]
          tipo: string
          titulo: string
          updated_at?: string
        }
        Update: {
          cliente_id?: number | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: number
          pedido_id?: number | null
          prioridade?: number
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["status_ocorrencia"]
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencias_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencias_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_historico: {
        Row: {
          created_at: string
          id: number
          observacao: string | null
          pedido_id: number
          status_anterior: Database["public"]["Enums"]["status_pedido"] | null
          status_novo: Database["public"]["Enums"]["status_pedido"]
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          observacao?: string | null
          pedido_id: number
          status_anterior?: Database["public"]["Enums"]["status_pedido"] | null
          status_novo: Database["public"]["Enums"]["status_pedido"]
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          observacao?: string | null
          pedido_id?: number
          status_anterior?: Database["public"]["Enums"]["status_pedido"] | null
          status_novo?: Database["public"]["Enums"]["status_pedido"]
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedido_historico_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_itens: {
        Row: {
          cacamba_id: number | null
          created_at: string
          descricao: string
          id: number
          pedido_id: number
          quantidade: number
          servico_id: number | null
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          cacamba_id?: number | null
          created_at?: string
          descricao: string
          id?: number
          pedido_id: number
          quantidade?: number
          servico_id?: number | null
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          cacamba_id?: number | null
          created_at?: string
          descricao?: string
          id?: number
          pedido_id?: number
          quantidade?: number
          servico_id?: number | null
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_itens_cacamba_id_fkey"
            columns: ["cacamba_id"]
            isOneToOne: false
            referencedRelation: "cacambas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          aterro_destino: string | null
          cacamba_id: number | null
          cliente_id: number
          created_at: string
          created_by: string | null
          data_colocacao: string | null
          data_desejada: string | null
          data_faturamento: string | null
          data_pedido: string
          data_programada: string | null
          data_retirada: string | null
          data_retirada_prevista: string | null
          deleted_at: string | null
          endereco_entrega_id: number | null
          faturado: boolean
          hora_programada: string | null
          id: number
          janela_atendimento: string | null
          maquina_id: number | null
          motorista_colocacao_id: number | null
          motorista_retirada_id: number | null
          nota_fiscal_id: number | null
          numero: string
          obra_id: number | null
          obs_colocacao: string | null
          obs_retirada: string | null
          observacao: string | null
          observacao_operacional: string | null
          prioridade: number
          quantidade: number
          servico_id: number | null
          status: Database["public"]["Enums"]["status_pedido"]
          status_fiscal: Database["public"]["Enums"]["status_nota_fiscal"]
          tipo: Database["public"]["Enums"]["tipo_pedido"]
          tipo_locacao: Database["public"]["Enums"]["tipo_locacao"]
          unidade_cacamba_id: number | null
          updated_at: string
          updated_by: string | null
          valor_desconto: number
          valor_total: number
          valor_unitario: number
          veiculo_colocacao_id: number | null
          veiculo_retirada_id: number | null
        }
        Insert: {
          aterro_destino?: string | null
          cacamba_id?: number | null
          cliente_id: number
          created_at?: string
          created_by?: string | null
          data_colocacao?: string | null
          data_desejada?: string | null
          data_faturamento?: string | null
          data_pedido?: string
          data_programada?: string | null
          data_retirada?: string | null
          data_retirada_prevista?: string | null
          deleted_at?: string | null
          endereco_entrega_id?: number | null
          faturado?: boolean
          hora_programada?: string | null
          id?: number
          janela_atendimento?: string | null
          maquina_id?: number | null
          motorista_colocacao_id?: number | null
          motorista_retirada_id?: number | null
          nota_fiscal_id?: number | null
          numero?: string
          obra_id?: number | null
          obs_colocacao?: string | null
          obs_retirada?: string | null
          observacao?: string | null
          observacao_operacional?: string | null
          prioridade?: number
          quantidade?: number
          servico_id?: number | null
          status?: Database["public"]["Enums"]["status_pedido"]
          status_fiscal?: Database["public"]["Enums"]["status_nota_fiscal"]
          tipo?: Database["public"]["Enums"]["tipo_pedido"]
          tipo_locacao?: Database["public"]["Enums"]["tipo_locacao"]
          unidade_cacamba_id?: number | null
          updated_at?: string
          updated_by?: string | null
          valor_desconto?: number
          valor_total?: number
          valor_unitario?: number
          veiculo_colocacao_id?: number | null
          veiculo_retirada_id?: number | null
        }
        Update: {
          aterro_destino?: string | null
          cacamba_id?: number | null
          cliente_id?: number
          created_at?: string
          created_by?: string | null
          data_colocacao?: string | null
          data_desejada?: string | null
          data_faturamento?: string | null
          data_pedido?: string
          data_programada?: string | null
          data_retirada?: string | null
          data_retirada_prevista?: string | null
          deleted_at?: string | null
          endereco_entrega_id?: number | null
          faturado?: boolean
          hora_programada?: string | null
          id?: number
          janela_atendimento?: string | null
          maquina_id?: number | null
          motorista_colocacao_id?: number | null
          motorista_retirada_id?: number | null
          nota_fiscal_id?: number | null
          numero?: string
          obra_id?: number | null
          obs_colocacao?: string | null
          obs_retirada?: string | null
          observacao?: string | null
          observacao_operacional?: string | null
          prioridade?: number
          quantidade?: number
          servico_id?: number | null
          status?: Database["public"]["Enums"]["status_pedido"]
          status_fiscal?: Database["public"]["Enums"]["status_nota_fiscal"]
          tipo?: Database["public"]["Enums"]["tipo_pedido"]
          tipo_locacao?: Database["public"]["Enums"]["tipo_locacao"]
          unidade_cacamba_id?: number | null
          updated_at?: string
          updated_by?: string | null
          valor_desconto?: number
          valor_total?: number
          valor_unitario?: number
          veiculo_colocacao_id?: number | null
          veiculo_retirada_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_pedido_nota_fiscal"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_cacamba_id_fkey"
            columns: ["cacamba_id"]
            isOneToOne: false
            referencedRelation: "cacambas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_endereco_entrega_id_fkey"
            columns: ["endereco_entrega_id"]
            isOneToOne: false
            referencedRelation: "enderecos_entrega"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_maquina_id_fkey"
            columns: ["maquina_id"]
            isOneToOne: false
            referencedRelation: "maquinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_motorista_colocacao_id_fkey"
            columns: ["motorista_colocacao_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_motorista_retirada_id_fkey"
            columns: ["motorista_retirada_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_unidade_cacamba_id_fkey"
            columns: ["unidade_cacamba_id"]
            isOneToOne: false
            referencedRelation: "unidades_cacamba"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_veiculo_colocacao_id_fkey"
            columns: ["veiculo_colocacao_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_veiculo_retirada_id_fkey"
            columns: ["veiculo_retirada_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rota_paradas: {
        Row: {
          created_at: string
          endereco: string | null
          hora_chegada: string | null
          hora_saida: string | null
          id: number
          latitude: number | null
          longitude: number | null
          observacao: string | null
          ordem: number
          pedido_id: number | null
          rota_id: number
          status: Database["public"]["Enums"]["status_execucao"]
          tipo: string | null
        }
        Insert: {
          created_at?: string
          endereco?: string | null
          hora_chegada?: string | null
          hora_saida?: string | null
          id?: number
          latitude?: number | null
          longitude?: number | null
          observacao?: string | null
          ordem?: number
          pedido_id?: number | null
          rota_id: number
          status?: Database["public"]["Enums"]["status_execucao"]
          tipo?: string | null
        }
        Update: {
          created_at?: string
          endereco?: string | null
          hora_chegada?: string | null
          hora_saida?: string | null
          id?: number
          latitude?: number | null
          longitude?: number | null
          observacao?: string | null
          ordem?: number
          pedido_id?: number | null
          rota_id?: number
          status?: Database["public"]["Enums"]["status_execucao"]
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rota_paradas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rota_paradas_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "rotas"
            referencedColumns: ["id"]
          },
        ]
      }
      rotas: {
        Row: {
          created_at: string
          created_by: string | null
          data: string
          id: number
          motorista_id: number
          observacao: string | null
          status: string
          updated_at: string
          veiculo_id: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: string
          id?: number
          motorista_id: number
          observacao?: string | null
          status?: string
          updated_at?: string
          veiculo_id: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: string
          id?: number
          motorista_id?: number
          observacao?: string | null
          status?: string
          updated_at?: string
          veiculo_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "rotas_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotas_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          aliquota: number | null
          ativo: boolean
          codigo_fiscal: string | null
          created_at: string
          descricao: string
          id: number
        }
        Insert: {
          aliquota?: number | null
          ativo?: boolean
          codigo_fiscal?: string | null
          created_at?: string
          descricao: string
          id?: number
        }
        Update: {
          aliquota?: number | null
          ativo?: boolean
          codigo_fiscal?: string | null
          created_at?: string
          descricao?: string
          id?: number
        }
        Relationships: []
      }
      unidades_cacamba: {
        Row: {
          cacamba_id: number
          cliente_atual: string | null
          created_at: string
          id: number
          observacao: string | null
          patrimonio: string
          pedido_atual_id: number | null
          status: Database["public"]["Enums"]["status_cacamba"]
          updated_at: string
        }
        Insert: {
          cacamba_id: number
          cliente_atual?: string | null
          created_at?: string
          id?: number
          observacao?: string | null
          patrimonio: string
          pedido_atual_id?: number | null
          status?: Database["public"]["Enums"]["status_cacamba"]
          updated_at?: string
        }
        Update: {
          cacamba_id?: number
          cliente_atual?: string | null
          created_at?: string
          id?: number
          observacao?: string | null
          patrimonio?: string
          pedido_atual_id?: number | null
          status?: Database["public"]["Enums"]["status_cacamba"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidades_cacamba_cacamba_id_fkey"
            columns: ["cacamba_id"]
            isOneToOne: false
            referencedRelation: "cacambas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      veiculos: {
        Row: {
          ano_fabricacao: number | null
          combustivel: string | null
          cor: string | null
          created_at: string
          data_aquisicao: string | null
          data_licenciamento: string | null
          id: number
          km_atual: number
          km_aviso_manutencao: number | null
          km_inicial: number
          marca: string | null
          modelo: string
          placa: string
          status: Database["public"]["Enums"]["status_veiculo"]
          tipo: string | null
          updated_at: string
        }
        Insert: {
          ano_fabricacao?: number | null
          combustivel?: string | null
          cor?: string | null
          created_at?: string
          data_aquisicao?: string | null
          data_licenciamento?: string | null
          id?: number
          km_atual?: number
          km_aviso_manutencao?: number | null
          km_inicial?: number
          marca?: string | null
          modelo: string
          placa: string
          status?: Database["public"]["Enums"]["status_veiculo"]
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          ano_fabricacao?: number | null
          combustivel?: string | null
          cor?: string | null
          created_at?: string
          data_aquisicao?: string | null
          data_licenciamento?: string | null
          id?: number
          km_atual?: number
          km_aviso_manutencao?: number | null
          km_inicial?: number
          marca?: string | null
          modelo?: string
          placa?: string
          status?: Database["public"]["Enums"]["status_veiculo"]
          tipo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "administrador"
        | "atendimento"
        | "financeiro"
        | "fiscal"
        | "operador"
        | "motorista"
        | "gestor"
      status_boleto:
        | "pendente"
        | "emitido"
        | "enviado"
        | "vencido"
        | "pago"
        | "cancelado"
        | "renegociado"
      status_cacamba:
        | "disponivel"
        | "em_uso"
        | "em_rota"
        | "reservada"
        | "manutencao"
        | "indisponivel"
      status_cliente: "ativo" | "inativo" | "bloqueado"
      status_conta: "aberta" | "paga" | "vencida" | "cancelada"
      status_execucao:
        | "pendente"
        | "em_rota"
        | "no_local"
        | "executando"
        | "concluida"
        | "cancelada"
      status_fatura:
        | "aberta"
        | "paga"
        | "paga_parcial"
        | "vencida"
        | "cancelada"
        | "protesto"
      status_material: "ativo" | "inativo"
      status_motorista:
        | "ativo"
        | "inativo"
        | "ferias"
        | "afastado"
        | "bloqueado"
      status_nota_fiscal:
        | "nao_emitida"
        | "pendente"
        | "processando"
        | "emitida"
        | "cancelada"
        | "erro"
        | "substituida"
      status_ocorrencia: "aberta" | "em_andamento" | "resolvida" | "fechada"
      status_pedido:
        | "orcamento"
        | "aguardando_aprovacao"
        | "aprovado"
        | "pendente_programacao"
        | "programado"
        | "em_rota"
        | "em_execucao"
        | "concluido"
        | "faturado"
        | "cancelado"
      status_veiculo:
        | "disponivel"
        | "em_operacao"
        | "manutencao"
        | "indisponivel"
      tipo_cliente: "pf" | "pj"
      tipo_fluxo: "entrada" | "saida"
      tipo_locacao: "dia" | "semana" | "quinzena" | "mes"
      tipo_pedido:
        | "entrega_cacamba"
        | "retirada"
        | "troca"
        | "recolhimento"
        | "locacao_maquina"
        | "terraplanagem"
        | "demolicao"
        | "venda_material"
        | "hora_maquina"
        | "diaria"
        | "mensal"
        | "renovacao"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "administrador",
        "atendimento",
        "financeiro",
        "fiscal",
        "operador",
        "motorista",
        "gestor",
      ],
      status_boleto: [
        "pendente",
        "emitido",
        "enviado",
        "vencido",
        "pago",
        "cancelado",
        "renegociado",
      ],
      status_cacamba: [
        "disponivel",
        "em_uso",
        "em_rota",
        "reservada",
        "manutencao",
        "indisponivel",
      ],
      status_cliente: ["ativo", "inativo", "bloqueado"],
      status_conta: ["aberta", "paga", "vencida", "cancelada"],
      status_execucao: [
        "pendente",
        "em_rota",
        "no_local",
        "executando",
        "concluida",
        "cancelada",
      ],
      status_fatura: [
        "aberta",
        "paga",
        "paga_parcial",
        "vencida",
        "cancelada",
        "protesto",
      ],
      status_material: ["ativo", "inativo"],
      status_motorista: ["ativo", "inativo", "ferias", "afastado", "bloqueado"],
      status_nota_fiscal: [
        "nao_emitida",
        "pendente",
        "processando",
        "emitida",
        "cancelada",
        "erro",
        "substituida",
      ],
      status_ocorrencia: ["aberta", "em_andamento", "resolvida", "fechada"],
      status_pedido: [
        "orcamento",
        "aguardando_aprovacao",
        "aprovado",
        "pendente_programacao",
        "programado",
        "em_rota",
        "em_execucao",
        "concluido",
        "faturado",
        "cancelado",
      ],
      status_veiculo: [
        "disponivel",
        "em_operacao",
        "manutencao",
        "indisponivel",
      ],
      tipo_cliente: ["pf", "pj"],
      tipo_fluxo: ["entrada", "saida"],
      tipo_locacao: ["dia", "semana", "quinzena", "mes"],
      tipo_pedido: [
        "entrega_cacamba",
        "retirada",
        "troca",
        "recolhimento",
        "locacao_maquina",
        "terraplanagem",
        "demolicao",
        "venda_material",
        "hora_maquina",
        "diaria",
        "mensal",
        "renovacao",
      ],
    },
  },
} as const
