import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verificar se o usuário está autenticado
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ 
        error: 'Não autenticado',
        sessionError: sessionError?.message 
      }, { status: 401 });
    }

    console.log('🔍 Testando admin para usuário:', session.user.email);

    // Buscar o perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_active, email, full_name')
      .eq('id', session.user.id)
      .single();

    console.log('📊 Dados do perfil:', profile);
    console.log('❌ Erro do perfil:', profileError);

    if (profileError) {
      return NextResponse.json({
        error: 'Perfil não encontrado',
        profileError: profileError.message,
        userId: session.user.id,
        userEmail: session.user.email
      }, { status: 404 });
    }

    const isAdmin = profile.role === 'admin' && profile.is_active;

    return NextResponse.json({
      success: true,
      isAdmin,
      profile,
      userId: session.user.id,
      userEmail: session.user.email
    });

  } catch (error) {
    console.error('❌ Erro no teste de admin:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}