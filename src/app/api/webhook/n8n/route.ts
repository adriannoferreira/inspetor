import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { N8NWebhookPayload } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const payload: N8NWebhookPayload = await request.json();
    console.log('📨 Webhook N8N recebido:', payload);

    // Validar payload
    if (!payload.user_id || !payload.agent_id || !payload.message) {
      console.error('❌ Payload inválido:', payload);
      return NextResponse.json(
        { error: 'Payload inválido. user_id, agent_id e message são obrigatórios.' },
        { status: 400 }
      );
    }

    // Usar a instância do Supabase

    // Verificar se o usuário existe
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', payload.user_id)
      .single();

    if (userError || !user) {
      console.error('❌ Usuário não encontrado:', payload.user_id);
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se o agente existe
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name')
      .eq('id', payload.agent_id)
      .single();

    if (agentError || !agent) {
      console.error('❌ Agente não encontrado:', payload.agent_id);
      return NextResponse.json(
        { error: 'Agente não encontrado' },
        { status: 404 }
      );
    }

    // Criar ou buscar conversa existente
    let conversationId = payload.conversation_id;
    
    if (!conversationId) {
      // Buscar conversa existente entre usuário e agente
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', payload.user_id)
        .eq('agent_id', payload.agent_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingConversation) {
        conversationId = existingConversation.id;
      } else {
        // Criar nova conversa
        const { data: newConversation, error: conversationError } = await supabase
          .from('conversations')
          .insert({
            user_id: payload.user_id,
            agent_id: payload.agent_id,
            title: `Conversa com ${agent.name}`
          })
          .select('id')
          .single();

        if (conversationError || !newConversation) {
          console.error('❌ Erro ao criar conversa:', conversationError);
          return NextResponse.json(
            { error: 'Erro ao criar conversa' },
            { status: 500 }
          );
        }

        conversationId = newConversation.id;
      }
    }

    // Salvar mensagem do usuário
    const { data: userMessage, error: userMessageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        content: payload.message,
        role: 'user',
        user_id: payload.user_id,
        agent_id: payload.agent_id,
        attachments: payload.attachments || []
      })
      .select('*')
      .single();

    if (userMessageError) {
      console.error('❌ Erro ao salvar mensagem do usuário:', userMessageError);
      return NextResponse.json(
        { error: 'Erro ao salvar mensagem' },
        { status: 500 }
      );
    }

    console.log('✅ Mensagem do usuário salva:', userMessage.id);

    // Preparar dados para envio ao N8N
    const n8nPayload = {
      user_id: payload.user_id,
      agent_id: payload.agent_id,
      conversation_id: conversationId,
      message: payload.message,
      attachments: payload.attachments || [],
      timestamp: new Date().toISOString()
    };

    // Enviar para N8N se webhook_url estiver disponível
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const n8nResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(n8nPayload)
        });

        if (!n8nResponse.ok) {
          console.error('❌ Erro ao enviar para N8N:', n8nResponse.status);
        } else {
          console.log('✅ Payload enviado para N8N com sucesso');
        }
      } catch (n8nError) {
        console.error('❌ Erro na requisição para N8N:', n8nError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processado com sucesso',
      data: {
        conversation_id: conversationId,
        user_message_id: userMessage.id
      }
    });

  } catch (error) {
    console.error('❌ Erro no webhook N8N:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}