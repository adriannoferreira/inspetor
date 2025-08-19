import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug Admin: Iniciando verificação...');
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verificar se o usuário está autenticado
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log('🔍 Debug Admin: Sessão:', session ? 'Encontrada' : 'Não encontrada');
    console.log('🔍 Debug Admin: Erro de sessão:', sessionError);
    
    if (sessionError || !session) {
      return NextResponse.json({ 
        error: 'Não autenticado',
        sessionError: sessionError?.message,
        debug: 'Sessão não encontrada'
      }, { status: 401 });
    }

    console.log('🔍 Debug Admin: Usuário:', session.user.email, session.user.id);

    // Buscar o perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_active, email, full_name')
      .eq('id', session.user.id)
      .single();

    console.log('🔍 Debug Admin: Perfil encontrado:', profile);
    console.log('🔍 Debug Admin: Erro do perfil:', profileError);

    if (profileError) {
      return NextResponse.json({
        error: 'Perfil não encontrado',
        profileError: profileError.message,
        userId: session.user.id,
        userEmail: session.user.email,
        debug: 'Erro ao buscar perfil'
      }, { status: 404 });
    }

    const isAdmin = profile.role === 'admin' && profile.is_active;
    
    console.log('🔍 Debug Admin: É admin?', isAdmin);

    return NextResponse.json({
      success: true,
      isAdmin,
      profile,
      userId: session.user.id,
      userEmail: session.user.email,
      debug: 'Verificação completa'
    });

  } catch (error) {
    console.error('❌ Debug Admin: Erro:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      debug: 'Erro na execução'
    }, { status: 500 });
  }
}