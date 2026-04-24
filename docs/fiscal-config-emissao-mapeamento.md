# Mapeamento de Configuração da Emissão Fiscal (NFS-e)

Este documento descreve onde cada dado da tela **Fiscal > Configurações** é gravado no banco para a emissão de NFS-e.

## Tabela principal

- **Tabela:** `public.configuracoes_fiscais_empresa`
- **Regra de uso no backend:** o serviço lê a configuração ativa via `getConfiguracaoFiscalAtiva(...)`.
- **Atualização:** endpoint `PUT /api/fiscal/configuracoes` (método `updateConfiguracoes` no backend).

## De/Para de campos (UI/API -> banco)

| Campo (UI/API) | Tabela.Coluna | Observação |
|---|---|---|
| `provedor_fiscal` | `configuracoes_fiscais_empresa.provedor_fiscal` | Ex.: `atendenet`, `focus`, `http`. |
| `ambiente` | `configuracoes_fiscais_empresa.ambiente` | `homologacao` ou `producao`. |
| `api_base_url` | `configuracoes_fiscais_empresa.api_base_url` | URL base do webservice fiscal. |
| `client_id` | `configuracoes_fiscais_empresa.client_id` | Para AtendeNet também espelha em `login`. |
| `client_secret` | `configuracoes_fiscais_empresa.client_secret` | Para AtendeNet também espelha em `senha`. |
| `api_key` | `configuracoes_fiscais_empresa.api_key` | Token genérico; para Focus também espelha em `focus_token`. |
| `login` | `configuracoes_fiscais_empresa.login` | Credencial específica AtendeNet/IPM. |
| `senha` | `configuracoes_fiscais_empresa.senha` | Credencial específica AtendeNet/IPM. |
| `focus_token` | `configuracoes_fiscais_empresa.focus_token` | Credencial específica Focus NFe. |
| `cnpj` | `configuracoes_fiscais_empresa.cnpj` | Backend normaliza para apenas dígitos ao salvar. |
| `razao_social` | `configuracoes_fiscais_empresa.razao_social` | Nome empresarial do prestador. |
| `inscricao_municipal` | `configuracoes_fiscais_empresa.inscricao_municipal` | Enviada no bloco do prestador no XML. |
| `municipio_codigo` | `configuracoes_fiscais_empresa.municipio_codigo` | Código municipal cadastral. |
| `regime_tributario` | `configuracoes_fiscais_empresa.regime_tributario` | Texto de regime (simples, lucro, etc.). |
| `serie_rps` | `configuracoes_fiscais_empresa.serie_rps` | Série padrão da emissão. |
| `item_lista_servico` | `configuracoes_fiscais_empresa.item_lista_servico` | Item LC 116 usado no XML. |
| `aliquota_iss` | `configuracoes_fiscais_empresa.aliquota_iss` | Percentual ISS padrão. |
| `codigo_atividade` | `configuracoes_fiscais_empresa.codigo_atividade` | IPM: código de tributação municipal do serviço (tag `codigo_atividade`). |
| `ipm_situacao_tributaria` | `configuracoes_fiscais_empresa.ipm_situacao_tributaria` | IPM: tag `situacao_tributaria`. |
| `ipm_tributa_municipio_prestador` | `configuracoes_fiscais_empresa.ipm_tributa_municipio_prestador` | IPM: tag `tributa_municipio_prestador` (`S/N`). |
| `ipm_tributa_municipio_tomador` | `configuracoes_fiscais_empresa.ipm_tributa_municipio_tomador` | IPM: tag `tributa_municipio_tomador` (`S/N`). |

## Campos da mesma tabela que nao sao atualizados por esse endpoint

| Coluna | Como e usada |
|---|---|
| `token_atual` | Cache de token OAuth (quando aplicavel). |
| `token_expira_em` | Expiracao do token OAuth. |
| `tenant_id` | Roteamento multi-tenant. |
| `codigo_municipio` | Campo legado/auxiliar usado em mapeamentos de provider. |
| `natureza_operacao` | Config tributaria adicional para providers. |
| `regime_tributario_cod` | Codigo numerico de regime para providers. |
| `cbs_habilitado`, `ibs_habilitado` | Flags da reforma tributaria. |
| `certificate_ref`, `certificate_password_ref` | Existem na tabela e aparecem na UI, mas nao sao persistidos no fluxo atual de `updateConfiguracoes`. |

## Outras tabelas relacionadas (nao sao "configuracao", mas participam do fluxo)

| Tabela | Papel no fluxo |
|---|---|
| `public.notas_fiscais` | Resultado da emissao (status, numero, xml/pdf, payload enviado/retornado). |
| `public.nota_fiscal_pedidos` | Vinculo entre nota fiscal e pedidos. |
| `public.nota_fiscal_eventos` | Historico de transicoes/status da nota. |
| `public.fiscal_integracao_logs` e `public.nfse_logs` | Logs tecnicos da integracao com provider. |

## Referencias de implementacao

- `backend/src/modules/fiscal/fiscal.service.ts` (`getConfiguracoes` e `updateConfiguracoes`)
- `backend/src/modules/fiscal/fiscal.auth.service.ts` (persistencia de token OAuth)
- `backend/src/modules/fiscal/fiscal.repository.ts` (`updateConfiguracaoFiscal`)
- `src/pages/fiscal/FiscalPage.tsx` (campos da UI de configuracao fiscal)

