import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase para uso no servidor
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request: NextRequest) {
  console.log('🚀 CONVERSATIONS API GET CALLED!');
  console.log('🚀 Request URL:', request.url);
  
  try {
    console.log('=== API /api/conversations GET iniciada ===', new Date().toISOString());
    console.log('Variáveis de ambiente:');
    console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY length:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length);
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    console.log('Parâmetros recebidos:', { userId, limit, offset });
    console.log('URL da requisição:', request.url);

    if (!userId) {
      console.log('Erro: userId não fornecido');
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar conversas do usuário (sem JOIN por enquanto)
    console.log('Iniciando consulta no Supabase...');
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('id, title, agent_id, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);
      
    console.log('Resultado da consulta Supabase:', { conversations, error });

    if (error) {
      console.error('Erro ao buscar conversas:', error);
      console.error('Detalhes do erro:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: 'Erro interno do servidor', details: error.message },
        { status: 500 }
      );
    }

    // Formatar dados para o frontend
    console.log('Formatando dados para o frontend...');
    const formattedConversations = conversations?.map(conv => ({
      id: conv.id,
      title: conv.title,
      agentId: conv.agent_id,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
      messages: [] // Temporariamente vazio para testar
    })) || [];
    
    console.log('Dados formatados:', { count: formattedConversations.length });

    // Retornar diretamente o array, pois o frontend espera um array
    return NextResponse.json(formattedConversations);

  } catch (error) {
    console.error('Erro na API de conversas (catch):', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'Sem stack trace');
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, agentId } = body;

    if (!userId || !agentId) {
      return NextResponse.json(
        { error: 'userId e agentId são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar conversa existente (evitar .single() para não retornar erro em 0 linhas)
    const { data: existingList, error: searchError } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', userId)
      .eq('agent_id', agentId)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (searchError) {
      console.error('Erro ao buscar conversa:', searchError);
      return NextResponse.json(
        { error: 'Erro ao buscar conversa' },
        { status: 500 }
      );
    }

    const existingConversation = existingList && existingList.length > 0 ? existingList[0] : null;

    if (existingConversation) {
      return NextResponse.json({
        conversationId: existingConversation.id,
        created: false
      });
    }

    // Buscar informações do agente para o título
    const { data: agent } = await supabase
      .from('agents')
      .select('name, agent_type')
      .eq('id', agentId)
      .single();

    // Criar nova conversa
    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        agent_id: agentId,
        agent_type: agent?.agent_type || 'assistant',
        title: `Conversa com ${agent?.name || 'Agente'}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (createError) {
      console.error('Erro ao criar conversa:', createError);
      return NextResponse.json(
        { error: 'Erro ao criar conversa' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      conversationId: newConversation.id,
      created: true
    });

  } catch (error) {
    console.error('Erro na API de conversas (POST):', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}