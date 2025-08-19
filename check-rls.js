const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProfile() {
  console.log('🔍 Verificando perfil com service role...');

  try {
    // Tentar buscar o perfil diretamente com service role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'adrianoferreiracoach@gmail.com')
      .single();

    console.log('👤 Perfil encontrado:', profile);
    if (profileError) {
      console.log('❌ Erro ao buscar perfil:', profileError);
    }

    // Tentar buscar todos os perfis para ver se a tabela está acessível
    const { data: allProfiles, error: allError } = await supabase
      .from('profiles')
      .select('id, email, role, is_active')
      .limit(5);

    console.log('📊 Primeiros 5 perfis:', allProfiles);
    if (allError) {
      console.log('❌ Erro ao buscar todos os perfis:', allError);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkProfile();