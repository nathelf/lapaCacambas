# Integração NFS-e — Sistema lapaCacambas
### IPM Atende.Net | NTE-35/2021 v2.8 + NTE-122/2025 v1.5 (Reforma Tributária IBS/CBS)

---

## Estrutura de arquivos

```
lib/nfse/
├── NfseConfig.php       ← Configurações (CNPJ, senha, URL, município)
├── NfseHttpClient.php   ← Conexão cURL com o WebService
├── NfseXmlBuilder.php   ← Montagem do XML de emissão
├── NfseRetorno.php      ← Parsing do XML de retorno
├── NfseService.php      ← Fachada principal (emitir/cancelar/consultar)
└── exemplo_emissao.php  ← Exemplos de uso
```

---

## Instalação

1. Copie a pasta `nfse/` para `E:\2026\lapaCacambas\lib\nfse\`
2. Edite **NfseConfig.php** com os dados do município e prestador
3. Solicite acesso ao WebService no portal do município

---

## Configuração (NfseConfig.php)

| Constante | Valor | Onde obter |
|---|---|---|
| `CIDADE_SLUG` | `lapa` | Nome sem acentos/espaços |
| `CIDADE_TOM` | ex: `4745` | [tomweb.receita.fazenda.gov.br](https://www.tomweb.receita.fazenda.gov.br) |
| `PRESTADOR_CPFCNPJ` | CNPJ sem pontos | Dados da empresa |
| `WS_USERNAME` | igual ao CNPJ | Login no portal |
| `WS_PASSWORD` | senha do portal | Portal do Cidadão |
| `USAR_REFORMA_TRIBUTARIA` | `true` | Recomendado desde 2026 |
| `MODO_TESTE` | `false` (produção) | `true` para homologação |

---

## Solicitar acesso ao WebService

> **Portal do Cidadão do município → buscar "Emissão de NFS-e por WebService"
> → marcar "Acesso ao Usuário" → Confirmar**

*(NTE-35/2021 §3.2 / NTE-122/2025 §4.2)*

---

## Uso básico

```php
require_once 'lib/nfse/NfseService.php';
$nfse = new NfseService();

// 1. TESTAR (valida XML sem emitir)
$retorno = $nfse->testar($dadosNf, $tomador, $itens, $ibsCbs);

// 2. EMITIR
$retorno = $nfse->emitir($dadosNf, $tomador, $itens, $ibsCbs);

if ($retorno->isSucesso()) {
    $numero = $retorno->getNumero();
    $link   = $retorno->getLink();
} else {
    $erro = $retorno->getMensagem();
}

// 3. CANCELAR
$retorno = $nfse->cancelar('1293', '1', 'Motivo do cancelamento');

// 4. CONSULTAR
$retorno = $nfse->consultarPorAutenticidade('835773...');
$retorno = $nfse->consultarPorNumero('1293', '1', '123456');
```

---

## Situações Tributárias (campo `situacao_tributaria`)

| Código | Nome | Descrição |
|---|---|---|
| `0` | TI | Tributada Integralmente — ISS lançado para o prestador |
| `1` | TIRF | ISS retido pelo tomador (órgão público municipal) |
| `2` | TIST | ISS recolhido pelo tomador substituto (não órgão público) |
| `6` | ISE | Isenta |
| `7` | IMU | Imune |
| `14` | NTRIB | Não tributada — não sujeita ao ISS |

---

## Reforma Tributária — IBS/CBS (NTE-122/2025)

O bloco `$ibsCbs` é **facultativo até 2026** mas deve ser adaptado antes de se tornar obrigatório.

```php
$ibsCbs = [
    'finNFSe'    => 0,         // 0 = NFS-e regular
    'indFinal'   => 0,         // 0 = não é consumo pessoal
    'cIndOp'     => '020101',  // Código indicador de operação
    'CST'        => '011',     // Situação Tributária IBS/CBS
    'cClassTrib' => '011004',  // Classificação Tributária
];
```

> **Simples Nacional:** IBS e CBS **não se aplicam** aos optantes. Envie sem o bloco `$ibsCbs`.  
> *(NTE-122/2025 §2)*

---

## PIS/COFINS — Regras (NTE-122/2025 §3)

| Caso | Como informar |
|---|---|
| **PIS/COFINS próprio** (deduz da base IBS/CBS) | Grupo `pis_cofins` com `cst`, `base_calculo`, `aliquota_pis`, `aliquota_cofins` |
| **PIS/COFINS retido** (desconta do valor líquido) | Tags `valor_pis` e `valor_cofins` individualmente |

---

## Retorno completo com dados IBS/CBS

Habilite no portal:  
**Portal da Prefeitura → Nota Fiscal → Personalização do Prestador → aba Webservice →  
"Utiliza Retorno Completo na Importação de XML"** ✅

---

## Caracteres proibidos no XML

| Incorreto | Substituir por |
|---|---|
| `<` | `&lt;` |
| `>` | `&gt;` |
| `'` | `&apos;` |
| `"` | `&quot;` |
| `/` | *(não permitido — remover)* |
| `&` | `&amp;` |

> A classe `NfseXmlBuilder` já faz esse escape automaticamente.

---

## URLs do WebService

| Uso | URL |
|---|---|
| NTE-35/2021 (padrão) | `https://ws-lapa.atende.net:7443/?pg=rest&service=WNERestServiceNFSe` |
| NTE-122/2025 (IBS/CBS) | `https://lapa.atende.net/?pg=rest&service=WNERestServiceNFSe` |

> Certifique-se que a porta **7443** está liberada no firewall. Domínio `*.atende.net` deve estar desbloqueado.

---

## Suporte IPM

- Atendimento On-line: portal IPM
- Telefone: **(47) 3531-1500**
