import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    console.log('🔧 Criando usuário de teste...');
    
    // Criar novo usuário
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'testuser@example.com',
      password: 'teste123',
      options: {
        emailRedirectTo: undefined // Não enviar email de confirmação
      }
    });
    
    if (authError) {
      console.error('🔧 Erro ao criar usuário:', authError);
      return NextResponse.json({ 
        success: false, 
        error: authError.message,
        code: authError.status
      }, { status: 400 });
    }
    
    console.log('🔧 Usuário criado:', {
      user: authData.user?.email,
      id: authData.user?.id
    });
    
    // Criar perfil para o usuário
    if (authData.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          full_name: 'Usuário de Teste',
          avatar_url: null,
          role: 'user',
          is_active: true
        })
        .select()
        .single();
      
      if (profileError) {
        console.error('🔧 Erro ao criar perfil:', profileError);
        return NextResponse.json({ 
          success: false, 
          error: 'Usuário criado mas erro ao criar perfil',
          details: profileError
        }, { status: 400 });
      }
      
      console.log('🔧 Perfil criado:', profile);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Usuário de teste criado com sucesso',
      user: {
        id: authData.user?.id,
        email: authData.user?.email
      }
    });
    
  } catch (error) {
    console.error('🔧 Erro inesperado ao criar usuário:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro inesperado',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}