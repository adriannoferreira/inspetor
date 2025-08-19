import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 API test-admin-simple: Iniciando teste');
    
    // Criar cliente Supabase com cookies
    const supabase = createServerComponentClient({ cookies });
    
    // Obter sessão do usuário
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ API test-admin-simple: Erro ao obter sessão:', sessionError.message);
      return NextResponse.json({
        isAdmin: false,
        user: null,
        message: 'Erro ao obter sessão',
        error: sessionError.message
      });
    }
    
    if (!session?.user) {
      console.log('❌ API test-admin-simple: Usuário não autenticado');
      return NextResponse.json({
        isAdmin: false,
        user: null,
        message: 'Usuário não autenticado'
      });
    }
    
    const user = session.user;
    const isAdmin = user.email === 'adrianoferreiracoach@gmail.com';
    
    console.log('✅ API test-admin-simple: Usuário autenticado:', {
      email: user.email,
      id: user.id,
      isAdmin
    });
    
    return NextResponse.json({
      isAdmin,
      user: {
        email: user.email,
        id: user.id
      },
      message: isAdmin ? 'Usuário é administrador' : 'Usuário não é administrador'
    });
    
  } catch (error) {
    console.error('💥 API test-admin-simple: Erro inesperado:', error);
    return NextResponse.json({
      isAdmin: false,
      user: null,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}