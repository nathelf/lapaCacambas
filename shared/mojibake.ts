/**
 * Corrige texto em que bytes UTF-8 foram interpretados como Latin-1 (acentos “Ã£”, “Ã§”, etc.).
 * Funciona no browser e no Node (Buffer).
 */
export function corrigirMojibakeUtf8(s: string): string {
  if (!s) return s;
  const t = s.trim();
  if (!t) return t;

  const suspeito = t.includes('Ã') || t.includes('Â') || t.includes('\uFFFD');

  if (!suspeito) return t;

  try {
    let asUtf8: string;
    if (typeof Buffer !== 'undefined') {
      asUtf8 = Buffer.from(t, 'latin1').toString('utf8');
    } else {
      const bytes = new Uint8Array(t.length);
      for (let i = 0; i < t.length; i += 1) bytes[i] = t.charCodeAt(i) & 0xff;
      asUtf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    }
    if (!asUtf8 || asUtf8 === t) return t.replace(/\uFFFD/g, ' ').replace(/\s+/g, ' ').trim();
    const limpo = asUtf8.replace(/\uFFFD/g, '').trim();
    return limpo || t.replace(/\uFFFD/g, ' ').replace(/\s+/g, ' ').trim();
  } catch {
    return t.replace(/\uFFFD/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
