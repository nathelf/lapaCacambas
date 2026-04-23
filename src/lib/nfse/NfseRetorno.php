<?php
/**
 * NfseRetorno.php
 * Parseia o XML de retorno do WebService IPM.
 * Cobre o retorno simples (NTE-35/2021 §3.3 e §4.6)
 * e o retorno completo com IBS/CBS (NTE-122/2025 §5.2).
 */

class NfseRetorno
{
    private bool    $sucesso     = false;
    private array   $mensagens   = [];
    private array   $dados       = [];
    private ?SimpleXMLElement $xml = null;

    public function __construct(string $xmlString)
    {
        $this->parse($xmlString);
    }

    // -----------------------------------------------------------------------
    // PARSE PRINCIPAL
    // -----------------------------------------------------------------------

    private function parse(string $xmlString): void
    {
        // Suprime erros de parsing e tenta carregar
        libxml_use_internal_errors(true);
        $xml = simplexml_load_string(trim($xmlString));

        if ($xml === false) {
            $this->mensagens[] = 'XML de retorno inválido: ' . $xmlString;
            return;
        }

        $this->xml = $xml;

        // Lê mensagens (erros ou sucessos)
        if (isset($xml->mensagem)) {
            foreach ($xml->mensagem->codigo as $codigo) {
                $this->mensagens[] = (string)$codigo;
            }
        }

        // Determina sucesso: código começa com "00001 - Sucesso" ou "NFS-e válida"
        foreach ($this->mensagens as $msg) {
            if (stripos($msg, 'Sucesso') !== false || stripos($msg, 'válida para emissão') !== false) {
                $this->sucesso = true;
                break;
            }
        }

        // Extrai dados da NFS-e emitida
        if (isset($xml->nfse)) {
            $nfse = $xml->nfse;
            $this->parseDadosBasicos($nfse);
        }

        // Retorno simples (NTE-35/2021 §4.6, Tabela 10)
        if (isset($xml->numero_nfse)) {
            $this->dados['numero_nfse'] = (string)$xml->numero_nfse;
        }
        if (isset($xml->link_nfse)) {
            $this->dados['link_nfse'] = (string)$xml->link_nfse;
            $this->sucesso = true; // Se há link, foi emitida
        }
        if (isset($xml->cod_verificador_autenticidade)) {
            $this->dados['cod_verificador'] = (string)$xml->cod_verificador_autenticidade;
        }
        if (isset($xml->chave_acesso_nfse_nacional)) {
            $this->dados['chave_acesso_nacional'] = (string)$xml->chave_acesso_nfse_nacional;
        }
    }

    private function parseDadosBasicos(SimpleXMLElement $nfse): void
    {
        // Bloco <nf>
        if (isset($nfse->nf)) {
            $nf = $nfse->nf;
            $this->dados['numero_nfse']         = (string)($nf->numero_nfse           ?? '');
            $this->dados['serie_nfse']           = (string)($nf->serie_nfse            ?? '');
            $this->dados['data_nfse']            = (string)($nf->data_nfse             ?? '');
            $this->dados['hora_nfse']            = (string)($nf->hora_nfse             ?? '');
            $this->dados['situacao_codigo']      = (string)($nf->situacao_codigo_nfse  ?? '');
            $this->dados['situacao_descricao']   = (string)($nf->situacao_descricao_nfse ?? '');
            $this->dados['link_nfse']            = (string)($nf->link_nfse             ?? '');
            $this->dados['cod_verificador']      = (string)($nf->cod_verificador_autenticidade ?? '');
            $this->dados['chave_acesso_nacional']= (string)($nf->chave_acesso_nfse_nacional ?? '');
            $this->dados['valor_total']          = (string)($nf->valor_total           ?? '');

            // Dados IBS/CBS (NTE-122/2025 §5.2)
            if (isset($nf->IBSCBS)) {
                $ibs = $nf->IBSCBS;
                $this->dados['ibs_cbs'] = [
                    'vBC'      => (string)($ibs->valores->vBC       ?? ''),
                    'vIBSTot'  => (string)($ibs->totCIBS->gIBS->vIBSTot ?? ''),
                    'vIBSUF'   => (string)($ibs->totCIBS->gIBS->gIBSUFTot->vIBSUF ?? ''),
                    'vIBSMun'  => (string)($ibs->totCIBS->gIBS->vIBSMun ?? ''),
                    'vCBS'     => (string)($ibs->totCIBS->gCBS->vCBS    ?? ''),
                    'vTotNF'   => (string)($ibs->totCIBS->vTotNF        ?? ''),
                ];
            }

            if (!empty($this->dados['link_nfse'])) {
                $this->sucesso = true;
            }
        }
    }

    // -----------------------------------------------------------------------
    // GETTERS
    // -----------------------------------------------------------------------

    public function isSucesso(): bool   { return $this->sucesso; }
    public function getMensagens(): array { return $this->mensagens; }
    public function getMensagem(): string { return implode(' | ', $this->mensagens); }
    public function getDados(): array   { return $this->dados; }
    public function get(string $chave): string { return $this->dados[$chave] ?? ''; }

    public function getNumero(): string  { return $this->get('numero_nfse'); }
    public function getLink(): string    { return $this->get('link_nfse'); }
    public function getChaveNacional(): string { return $this->get('chave_acesso_nacional'); }
    public function getCodVerificador(): string { return $this->get('cod_verificador'); }
    public function getIbsCbs(): array   { return $this->dados['ibs_cbs'] ?? []; }
}
