/**
 * Decodifica corpo textual de respostas HTTP quando o charset declarado (ou os bytes)
 * não batem com UTF-8. O webservice IPM/AtendeNet costuma devolver XML em ISO-8859-1
 * / Windows-1252; usar `res.text()` assume UTF-8 e gera mojibake ou U+FFFD.
 */
export function decodeTextResponseBytes(buf: ArrayBuffer, contentType: string | null): string {
  const ct = (contentType || '').toLowerCase();
  if (/charset\s*=\s*utf-8/i.test(ct)) {
    return new TextDecoder('utf-8', { fatal: false }).decode(buf);
  }
  if (/charset\s*=\s*(iso-8859-1|iso-8859-15|windows-1252|latin1|latin-1)/i.test(ct)) {
    return new TextDecoder('windows-1252', { fatal: false }).decode(buf);
  }

  const u8 = new Uint8Array(buf);
  const headLen = Math.min(400, u8.length);
  const headAscii = new TextDecoder('ascii', { fatal: false }).decode(u8.subarray(0, headLen));
  const m = /encoding\s*=\s*["']([^"']+)["']/i.exec(headAscii);
  const decl = (m?.[1] || '').toLowerCase();
  if (/iso-8859-1|iso-8859-15|windows-1252|latin1|latin-1/.test(decl)) {
    return new TextDecoder('windows-1252', { fatal: false }).decode(buf);
  }

  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buf);
  if (!/\uFFFD/.test(utf8)) return utf8;
  return new TextDecoder('windows-1252', { fatal: false }).decode(buf);
}
