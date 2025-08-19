const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAdmin() {
  try {
    console.log('🔍 Testando verificação de admin...');
    
    // Buscar o usuário pelo email
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, role, is_active')
      .eq('email', 'adrianoferreiracoach@gmail.com');
    
    console.log('📊 Resultado da consulta:');
    console.log('Dados:', profiles);
    console.log('Erro:', error);
    
    if (profiles && profiles.length > 0) {
      const profile = profiles[0];
      console.log('👤 Perfil encontrado:');
      console.log('- ID:', profile.id);
      console.log('- Email:', profile.email);
      console.log('- Role:', profile.role);
      console.log('- Ativo:', profile.is_active);
      console.log('- É admin?', profile.role === 'admin' && profile.is_active);
    } else {
      console.log('❌ Nenhum perfil encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testAdmin();