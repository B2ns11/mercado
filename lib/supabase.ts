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

function clean(value: string | undefined): string | undefined {
  return value?.trim().replace(/^["']|["']$/g, '');
}

const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const anonKey = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/**
 * Chave de service role: ignora RLS. Só existe no servidor (sem NEXT_PUBLIC_),
 * e todas as chamadas ao Supabase neste app acontecem em API routes, então ela
 * nunca chega ao navegador. É o que permite gravar sem login com o RLS ligado.
 */
const serviceRoleKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabaseKey = serviceRoleKey || anonKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
export const usingServiceRole = Boolean(serviceRoleKey);

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

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Usuário único enquanto a autenticação não existe. As tabelas exigem user_id,
 * então usamos um UUID fixo para o app funcionar sem login.
 *
 * Só serve quando a FK para auth.users foi removida — veja getDefaultUserId().
 */
export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

/** E-mail do usuário local criado automaticamente enquanto não há login. */
const LOCAL_USER_EMAIL = 'local@mercado.app';

let cachedUserId: string | null = null;

/**
 * user_id tem FK para auth.users, então um UUID inventado é rejeitado com
 * "violates foreign key constraint". Com a service_role dá para criar (ou
 * reaproveitar) um usuário de verdade pela Admin API, sem SQL manual.
 */
export async function getDefaultUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId;

  if (!usingServiceRole) {
    // Sem service_role não há acesso à Admin API; resta o UUID fixo, que só
    // funciona se a FK tiver sido removida.
    return DEFAULT_USER_ID;
  }

  const supabase = getSupabase();

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: LOCAL_USER_EMAIL,
    email_confirm: true,
    user_metadata: { criadoPor: 'mercado-app', motivo: 'uso local sem login' },
  });

  if (!createError && created?.user) {
    cachedUserId = created.user.id;
    return cachedUserId;
  }

  // Já existe de execuções anteriores: procura o id dele.
  const { data: list, error: listError } = await supabase.auth.admin.listUsers();

  const existing = list?.users?.find((u) => u.email === LOCAL_USER_EMAIL);
  if (existing) {
    cachedUserId = existing.id;
    return cachedUserId;
  }

  throw new Error(
    'Não foi possível criar o usuário local no Supabase Auth. ' +
      `Erro: ${createError?.message ?? listError?.message ?? 'desconhecido'}. ` +
      'Confirme que SUPABASE_SERVICE_ROLE_KEY é mesmo a chave service_role.'
  );
}

/**
 * Traduz o erro de RLS para instruções acionáveis. Sem login, auth.uid() é null
 * e as policies "auth.uid() = user_id" barram qualquer INSERT.
 */
export function describeSupabaseError(error: unknown): string {
  // O supabase-js rejeita com PostgrestError (objeto simples com message/code/
  // details/hint), não com Error — String(error) daria "[object Object]".
  let message: string;
  let code = '';

  if (error instanceof Error) {
    message = error.message;
  } else if (error && typeof error === 'object') {
    const e = error as { message?: string; code?: string; details?: string; hint?: string };
    code = e.code ?? '';
    message = [e.message, e.details, e.hint].filter(Boolean).join(' — ') || JSON.stringify(error);
  } else {
    message = String(error);
  }

  if (message.includes('ENOTFOUND') || message.includes('getaddrinfo')) {
    return (
      'Não foi possível alcançar o projeto do Supabase. Confira se a ' +
      'NEXT_PUBLIC_SUPABASE_URL aponta para um projeto existente e ativo ' +
      '(Settings > API > Project URL).'
    );
  }

  if (
    message.includes('foreign key constraint') &&
    (message.includes('user_id') || message.includes('users'))
  ) {
    return (
      'O user_id usado não existe em auth.users. Com SUPABASE_SERVICE_ROLE_KEY ' +
      'definida o app cria esse usuário sozinho — confirme que a chave é a ' +
      'service_role e reinicie o servidor. Alternativa: remover a FK com ' +
      'ALTER TABLE purchases DROP CONSTRAINT purchases_user_id_fkey; ' +
      'ALTER TABLE products DROP CONSTRAINT products_user_id_fkey;'
    );
  }

  if (message.includes('Invalid API key') || message.includes('JWT')) {
    return (
      'Chave do Supabase inválida. Copie novamente em Settings > API e ' +
      'reinicie o servidor após editar o .env.local.'
    );
  }

  if (
    message.includes('does not exist') &&
    (message.includes('relation') || message.includes('table'))
  ) {
    return (
      'As tabelas não existem no banco. Rode o SQL de criação que está no ' +
      'README (seção "Setup do Banco de Dados") no SQL Editor do Supabase.'
    );
  }

  const isRlsError =
    message.includes('row-level security') ||
    message.includes('violates row-level security policy') ||
    code === '42501' ||
    message.includes('42501');

  // Sem tratamento específico: devolve a mensagem sem o stack trace.
  if (!isRlsError) return message.split('\n')[0].slice(0, 300);

  if (usingServiceRole) {
    return (
      'O RLS bloqueou a operação mesmo com SUPABASE_SERVICE_ROLE_KEY definida. ' +
      'Confirme que a chave é a service_role (Settings > API > service_role, ' +
      'não a anon) e reinicie o servidor após editar o .env.local.'
    );
  }

  return (
    'O RLS do Supabase bloqueou a gravação porque ainda não existe login — ' +
    'auth.uid() é nulo e as policies exigem auth.uid() = user_id. ' +
    'Solução: copie a chave service_role em Settings > API e coloque no .env.local como ' +
    'SUPABASE_SERVICE_ROLE_KEY=..., depois reinicie o servidor (npm run dev). ' +
    'Ela só é usada no servidor e não vai para o navegador. ' +
    'Veja a seção "RLS" no README para a alternativa.'
  );
}
