import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    console.log('🔧 Teste de login para:', email);
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Tentar fazer login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (authError) {
      console.error('🔧 Erro de autenticação:', authError);
      return NextResponse.json({ 
        success: false, 
        error: authError.message,
        code: authError.status
      }, { status: 400 });
    }
    
    console.log('🔧 Login bem-sucedido:', {
      user: authData.user?.email,
      session: !!authData.session
    });
    
    // Verificar se o usuário tem perfil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    
    if (profileError) {
      console.error('🔧 Erro ao buscar perfil:', profileError);
      return NextResponse.json({ 
        success: false, 
        error: 'Perfil não encontrado',
        details: profileError
      }, { status: 404 });
    }
    
    console.log('🔧 Perfil encontrado:', profile);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Login realizado com sucesso',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        profile: profile
      },
      session: {
        access_token: authData.session?.access_token ? 'presente' : 'ausente',
        refresh_token: authData.session?.refresh_token ? 'presente' : 'ausente'
      }
    });
    
  } catch (error) {
    console.error('🔧 Erro inesperado no teste de login:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro inesperado',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}