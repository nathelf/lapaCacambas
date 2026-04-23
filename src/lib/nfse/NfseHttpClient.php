<?php
/**
 * NfseHttpClient.php
 * Gerencia conexão HTTP (cURL) com o WebService IPM.
 * Cuida de autenticação Basic Auth, sessão (cookie), envio multipart/form-data.
 * Baseado em: NTE-35/2021 v2.8, seção 3.4 e 3.5
 */

require_once __DIR__ . '/NfseConfig.php';

class NfseHttpClient
{
    /** @var string Token de sessão PHPSESSID (reutilizado entre requisições) */
    private string $sessionToken = '';

    /** @var string URL base do WebService */
    private string $url;

    public function __construct(string $url = '')
    {
        $this->url = $url ?: NfseConfig::URL_WS;
    }

    // -----------------------------------------------------------------------
    // MÉTODO PRINCIPAL DE ENVIO
    // -----------------------------------------------------------------------

    /**
     * Envia um arquivo XML ao WebService por POST multipart/form-data.
     *
     * @param string $xmlContent  Conteúdo XML já montado
     * @param string $fileKey     Nome do campo file no form (ex: "arquivo")
     * @return array ['sucesso' => bool, 'resposta' => string, 'erro' => string]
     */
    public function enviar(string $xmlContent, string $fileKey = 'arquivo'): array
    {
        // Salva XML em arquivo temporário (obrigatório para multipart/form-data)
        $tmpFile = tempnam(sys_get_temp_dir(), 'nfse_') . '.xml';
        file_put_contents($tmpFile, $xmlContent);

        $curl = curl_init();
        if (!$curl) {
            return $this->erro('Falha ao inicializar cURL.');
        }

        // Credenciais em Base64 (username:password)
        $credenciais = base64_encode(NfseConfig::WS_USERNAME . ':' . NfseConfig::WS_PASSWORD);

        // Monta cookie de sessão (reduz tempo de resposta nas requisições seguintes)
        $cookieHeader = $this->sessionToken ? 'Cookie: PHPSESSID=' . $this->sessionToken : '';

        $headers = [
            'Authorization: Basic ' . $credenciais,
        ];
        if ($cookieHeader) {
            $headers[] = $cookieHeader;
        }

        // Arquivo para envio via CURLFile
        $cfile = new CURLFile($tmpFile, 'text/xml', 'arquivo.xml');

        curl_setopt_array($curl, [
            CURLOPT_URL            => $this->url,
            CURLOPT_POST           => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER         => true,          // Retorna headers (para capturar PHPSESSID)
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_POSTFIELDS     => [$fileKey => $cfile],
            CURLOPT_HEADERFUNCTION => [$this, 'capturarCookie'],
            CURLOPT_TIMEOUT        => NfseConfig::TIMEOUT,
            CURLOPT_SSL_VERIFYPEER => NfseConfig::VERIFICAR_SSL,
            CURLOPT_SSL_VERIFYHOST => NfseConfig::VERIFICAR_SSL ? 2 : 0,
        ]);

        $resposta   = curl_exec($curl);
        $httpCode   = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $erroMsg    = curl_error($curl);
        $headerSize = curl_getinfo($curl, CURLINFO_HEADER_SIZE);

        curl_close($curl);
        @unlink($tmpFile);

        if ($resposta === false) {
            return $this->erro('Erro cURL: ' . $erroMsg);
        }

        // Separa headers do corpo
        $corpo = substr($resposta, $headerSize);

        if ($httpCode !== 200) {
            return $this->erro("HTTP {$httpCode}: {$corpo}");
        }

        return [
            'sucesso'  => true,
            'resposta' => $corpo,
            'erro'     => '',
        ];
    }

    // -----------------------------------------------------------------------
    // CAPTURA DE SESSÃO
    // -----------------------------------------------------------------------

    /**
     * Callback para capturar PHPSESSID da resposta e reutilizar na próxima chamada.
     * Conforme NTE-35/2021 seção 3.4: reduz tempo de emissão.
     */
    public function capturarCookie($curl, string $headerLine): int
    {
        if (stripos($headerLine, 'Set-Cookie:') !== false
            && stripos($headerLine, 'PHPSESSID=') !== false
        ) {
            preg_match('/PHPSESSID=([^;]+)/i', $headerLine, $matches);
            if (!empty($matches[1])) {
                $this->sessionToken = $matches[1];
            }
        }
        return strlen($headerLine);
    }

    // -----------------------------------------------------------------------
    // AUXILIARES
    // -----------------------------------------------------------------------

    private function erro(string $mensagem): array
    {
        return [
            'sucesso'  => false,
            'resposta' => '',
            'erro'     => $mensagem,
        ];
    }

    public function setUrl(string $url): void
    {
        $this->url = $url;
    }

    public function getSessionToken(): string
    {
        return $this->sessionToken;
    }
}
