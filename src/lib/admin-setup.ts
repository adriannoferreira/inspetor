import { getSupabaseClient } from '@/lib/supabase-client';

export interface AdminSetupResult {
  success: boolean;
  message: string;
  adminExists?: boolean;
}

/**
 * Verifica se já existe um usuário admin no sistema
 */
export async function checkAdminExists(): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.rpc('admin_exists');
    if (error) {
      console.error('Erro ao verificar admin existente:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Erro ao verificar admin existente:', error);
    return false;
  }
}

/**
 * Cria o primeiro usuário admin do sistema
 */
export async function createDefaultAdmin(
  email: string,
  password: string,
  fullName: string
): Promise<AdminSetupResult> {
  try {
    const supabase = getSupabaseClient();
    
    // Verificar se já existe um admin
    const adminExists = await checkAdminExists();
    if (adminExists) {
      return {
        success: false,
        message: 'Já existe um administrador no sistema.',
        adminExists: true
      };
    }
    
    // Criar o usuário admin
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          is_admin_setup: true
        }
      }
    });
    
    if (authError) {
      return {
        success: false,
        message: `Erro ao criar usuário: ${authError.message}`
      };
    }
    
    if (!authData.user) {
      return {
        success: false,
        message: 'Erro ao criar usuário: dados do usuário não retornados.'
      };
    }
    
    // Aguardar um pouco para o trigger criar o perfil
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Atualizar o perfil para admin
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        role: 'admin',
        is_active: true,
        full_name: fullName
      })
      .eq('id', authData.user.id);
    
    if (updateError) {
      console.error('Erro ao atualizar perfil para admin:', updateError);
      return {
        success: false,
        message: `Erro ao configurar permissões de admin: ${updateError.message}`
      };
    }
    
    // Configurar configurações padrão do sistema
    await setupDefaultSystemSettings();
    
    return {
      success: true,
      message: 'Administrador criado com sucesso! Verifique seu email para confirmar a conta.'
    };
    
  } catch {
    console.error('Erro ao criar admin padrão');
    return {
      success: false,
      message: 'Erro interno ao criar administrador.'
    };
  }
}

/**
 * Configura as configurações padrão do sistema
 */
export async function setupDefaultSystemSettings(): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    
    const defaultSettings = [
      { key: 'site_name', value: 'O Inspetor' },
      { key: 'site_description', value: 'Sistema de Chat Inteligente' },
      { key: 'max_messages_per_conversation', value: '100' },
      { key: 'enable_user_registration', value: 'true' },
      { key: 'default_user_role', value: 'user' },
      { key: 'maintenance_mode', value: 'false' },
      { key: 'max_conversations_per_user', value: '10' },
      { key: 'session_timeout_minutes', value: '60' }
    ];
    
    for (const setting of defaultSettings) {
      // Verificar se a configuração já existe
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', setting.key)
        .single();
      
      if (!existing) {
        // Inserir apenas se não existir
        await supabase
          .from('system_settings')
          .insert({
            key: setting.key,
            value: setting.value,
            description: getSettingDescription(setting.key)
          });
      }
    }
  } catch (error) {
    console.error('Erro ao configurar configurações padrão:', error);
  }
}

/**
 * Retorna a descrição de uma configuração
 */
function getSettingDescription(key: string): string {
  const descriptions: { [key: string]: string } = {
    'site_name': 'Nome do site exibido na interface',
    'site_description': 'Descrição do site para SEO e interface',
    'max_messages_per_conversation': 'Número máximo de mensagens por conversa',
    'enable_user_registration': 'Permitir registro de novos usuários',
    'default_user_role': 'Role padrão para novos usuários',
    'maintenance_mode': 'Modo de manutenção do sistema',
    'max_conversations_per_user': 'Número máximo de conversas por usuário',
    'session_timeout_minutes': 'Tempo limite da sessão em minutos'
  };
  
  return descriptions[key] || 'Configuração do sistema';
}

/**
 * Verifica se o sistema precisa de configuração inicial
 */
export async function needsInitialSetup(): Promise<boolean> {
  try {
    const adminExists = await checkAdminExists();
    return !adminExists;
  } catch (error) {
    console.error('Erro ao verificar necessidade de setup inicial:', error);
    return true; // Em caso de erro, assumir que precisa de setup
  }
}

/**
 * Força a criação de configurações padrão (para uso em desenvolvimento)
 */
export async function forceSetupDefaultSettings(): Promise<AdminSetupResult> {
  try {
    await setupDefaultSystemSettings();
    return {
      success: true,
      message: 'Configurações padrão criadas com sucesso.'
    };
  } catch {
    return {
      success: false,
      message: 'Erro ao criar configurações padrão.'
    };
  }
}