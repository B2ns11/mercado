import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Usuário único enquanto a autenticação não existe. As tabelas exigem user_id,
 * então usamos um UUID fixo para o app funcionar sem login.
 */
export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';
