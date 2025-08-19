import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar agentes:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar agentes' },
        { status: 500 }
      );
    }

    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    
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
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        avatar_url: avatar_url?.trim() || null,
        payload: payload || {},
        is_active: is_active !== undefined ? is_active : true
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar agente:', error);
      return NextResponse.json(
        { error: 'Erro ao criar agente' },
        { status: 500 }
      );
    }

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}