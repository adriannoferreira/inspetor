const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://hxbrquassfucvvewqqji.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4YnJxdWFzc2Z1Y3Z2ZXdxcWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNzg4NTksImV4cCI6MjA3MDg1NDg1OX0.oY4rg2HQV2D5D7z2Te7ly6R4eJkY16MKDvOVq3QDypo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuth() {
  console.log('Testando autenticação...');
  
  try {
    // Tentar fazer login
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'adrianoferreiracoach@gmail.com',
      password: 'sua-senha-aqui' // Substitua pela senha correta
    });
    
    if (loginError) {
      console.error('Erro no login:', loginError.message);
      return;
    }
    
    console.log('Login bem-sucedido:', loginData.user.email);
    
    // Testar busca de conversas
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', '09085acb-9652-4861-b28c-bfb6cad486db')
      .eq('agent_id', 'f453bc05-ecb4-403a-a055-98e45dc77fb9');
    
    if (convError) {
      console.error('Erro ao buscar conversas:', convError);
    } else {
      console.log('Conversas encontradas:', conversations);
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

testAuth();