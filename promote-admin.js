const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Usar service role para ter permissões

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function promoteToAdmin() {
  try {
    console.log('🔍 Promovendo usuário a admin...');
    
    const email = 'adrianoferreiracoach@gmail.com';
    
    // Primeiro, buscar o usuário na tabela auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Erro ao buscar usuários:', authError);
      return;
    }
    
    const user = authUsers.users.find(u => u.email === email);
    
    if (!user) {
      console.error('❌ Usuário não encontrado na tabela auth.users');
      return;
    }
    
    console.log('👤 Usuário encontrado:', user.id, user.email);
    
    // Verificar se já existe perfil
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Erro ao verificar perfil:', profileError);
      return;
    }
    
    if (existingProfile) {
      console.log('📊 Perfil existente encontrado:', existingProfile);
      
      // Atualizar perfil existente
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'admin',
          is_active: true,
          email: user.email,
          full_name: user.user_metadata?.full_name || 'Admin'
        })
        .eq('id', user.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Erro ao atualizar perfil:', updateError);
        return;
      }
      
      console.log('✅ Perfil atualizado para admin:', updatedProfile);
    } else {
      console.log('📝 Criando novo perfil...');
      
      // Criar novo perfil
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          role: 'admin',
          is_active: true,
          full_name: user.user_metadata?.full_name || 'Admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('❌ Erro ao criar perfil:', insertError);
        return;
      }
      
      console.log('✅ Novo perfil de admin criado:', newProfile);
    }
    
    console.log('🎉 Usuário promovido a admin com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

promoteToAdmin();