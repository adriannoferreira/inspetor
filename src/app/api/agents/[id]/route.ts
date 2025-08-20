import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getClient();
    const { id } = await params;

    const { data: agent, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar agente:', error);
      return NextResponse.json(
        { error: 'Agente não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getClient();
    const { id } = await params;
    
    const body = await request.json();
    const { name, description, avatar_url, payload, is_active } = body;

    // Validação básica
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Nome do agente é obrigatório' },
        { status: 400 }
      );
    }

    const { data: agent, error } = await supabase
      .from('agents')
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        avatar_url: avatar_url?.trim() || null,
        payload: payload || {},
        is_active: is_active !== undefined ? is_active : true
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar agente:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar agente' },
        { status: 500 }
      );
    }

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getClient();
    const { id } = await params;

    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar agente:', error);
      return NextResponse.json(
        { error: 'Erro ao deletar agente' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Agente deletado com sucesso' });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}