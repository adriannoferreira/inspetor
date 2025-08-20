import { createBrowserClient } from '@supabase/ssr';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

// Cliente Supabase singleton para garantir consistência
let supabaseClient: SupabaseClient | null = null;

/**
 * Cria ou retorna o cliente Supabase com sessão ativa
 * Garante que a autenticação seja mantida em todas as requisições
 */
export const getSupabaseClient = () => {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return supabaseClient;
};

/**
 * Verifica se o usuário está autenticado e retorna a sessão
 * Útil para validar autenticação antes de fazer requisições
 */
export const getAuthenticatedSession = async () => {
  const supabase = getSupabaseClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Erro ao obter sessão:', error);
    return null;
  }
  
  return session;
};

/**
 * Executa uma operação no Supabase garantindo que o usuário está autenticado
 * Retorna null se não houver sessão ativa
 */
export const withAuth = async <T>(operation: (supabase: SupabaseClient, session: Session) => Promise<T>): Promise<T | null> => {
  console.log('🔐 withAuth: Verificando autenticação...');
  const session = await getAuthenticatedSession();
  
  if (!session) {
    console.error('🔐 withAuth: Usuário não autenticado - sessão não encontrada');
    return null;
  }
  
  console.log('🔐 withAuth: Sessão encontrada, usuário:', session.user?.email);
  const supabase = getSupabaseClient();
  
  // Garantir que o token de acesso está definido no cliente
  if (session.access_token) {
    console.log('🔐 withAuth: Definindo sessão no cliente Supabase');
    supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });
  }
  
  try {
    const result = await operation(supabase, session);
    console.log('🔐 withAuth: Operação executada com sucesso');
    return result;
  } catch (error) {
    console.error('🔐 withAuth: Erro na operação:', error);
    throw error;
  }
};

/**
 * Força a atualização da sessão no cliente Supabase
 */
export const refreshSupabaseSession = async () => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.refreshSession();
  
  if (error) {
    console.error('Erro ao atualizar sessão:', error);
    return null;
  }
  
  return data.session;
};