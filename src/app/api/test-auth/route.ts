import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // Teste básico de conexão com Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    console.log('🔧 Teste de autenticação - URL:', supabaseUrl);
    console.log('🔧 Teste de autenticação - Service Key presente:', !!supabaseServiceKey);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Teste simples: buscar um usuário específico
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, email, role')
      .limit(1);
    
    if (error) {
      console.error('🔧 Erro no teste de autenticação:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error 
      }, { status: 500 });
    }
    
    console.log('🔧 Teste de autenticação - sucesso:', users);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Conexão com Supabase funcionando',
      users: users?.length || 0
    });
    
  } catch (error) {
    console.error('🔧 Erro inesperado no teste:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro inesperado',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}