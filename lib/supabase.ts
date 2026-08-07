import { createClient } from '@supabase/supabase-js';

/**
 * Normaliza a URL do projeto. Colar a URL com barra no final, com aspas, ou
 * já com o caminho /rest/v1 faz o Supabase responder
 * "Invalid path specified in request URL" — o cliente monta //rest/v1/...
 */
function normalizeSupabaseUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;

  let url = raw.trim().replace(/^["']|["']$/g, '');
  url = url.replace(/\/+$/, '');
  url = url.replace(/\/rest\/v1.*$/, '');
  url = url.replace(/\/auth\/v1.*$/, '');

  // Coladas sem protocolo: xxxx.supabase.co
  if (/^[a-z0-9-]+\.supabase\.(co|in)$/i.test(url)) {
    url = `https://${url}`;
  }

  return url;
}

const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim().replace(
  /^["']|["']$/g,
  ''
);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

/**
 * Cliente Supabase. Lança apenas quando realmente usado sem configuração,
 * para o app continuar subindo (e o build passar) sem as variáveis definidas.
 */
export function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local'
    );
  }

  if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(supabaseUrl)) {
    // Erro clássico: copiar a URL da barra do navegador em vez da Project URL.
    const fromDashboard = supabaseUrl.match(
      /supabase\.(?:com|io)\/(?:dashboard\/)?project\/([a-z0-9-]+)/i
    );

    if (fromDashboard) {
      throw new Error(
        `NEXT_PUBLIC_SUPABASE_URL está com o endereço do painel. ` +
          `Troque por https://${fromDashboard[1]}.supabase.co ` +
          '(Settings > API > Project URL).'
      );
    }

    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL inválida: "${supabaseUrl}". ` +
        'Use exatamente a Project URL do painel (Settings > API), no formato ' +
        'https://xxxxxxxx.supabase.co — sem barra no final e sem /rest/v1.'
    );
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Usuário único enquanto a autenticação não existe. As tabelas exigem user_id,
 * então usamos um UUID fixo para o app funcionar sem login.
 */
export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';
