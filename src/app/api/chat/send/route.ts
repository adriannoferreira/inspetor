import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isoNow } from '@/lib/utils';

// URL do webhook N8N
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL!;

export async function POST(request: NextRequest) {
  try {
    // Configurar Supabase com service role key (servidor)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Configuração do Supabase (server) incompleta');
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta' },
        { status: 500 }
      );
    }

    // NOTA: Se houver erro "Invalid API key", verifique se a SUPABASE_SERVICE_ROLE_KEY 
    // no .env.local está correta e não expirou. Pode ser necessário regenerá-la no painel do Supabase.
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestBody = await request.json();
    const { message, agentId, conversationId, userId, attachments = [] } = requestBody;

    // Validação dos dados obrigatórios
    if ((!message || message.trim() === '') && (!attachments || attachments.length === 0)) {
      return NextResponse.json(
        { error: 'É necessário fornecer uma mensagem ou anexos' },
        { status: 400 }
      );
    }

    if (!agentId || !userId) {
      return NextResponse.json(
        { error: 'Dados obrigatórios: agentId, userId' },
        { status: 400 }
      );
    }

    // Buscar informações do agente
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('agent_type, name, payload')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      console.error('Erro ao buscar agente:', agentError);
      return NextResponse.json(
        { error: 'Agente não encontrado' },
        { status: 404 }
      );
    }

    // Criar ou obter conversa
    let currentConversationId = conversationId;

    if (!currentConversationId) {
      // Criar nova conversa
      const { data: newConversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          agent_id: agentId,
          agent_type: agent.agent_type,
          title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
          created_at: isoNow(),
          updated_at: isoNow()
        })
        .select()
        .single();

      if (conversationError) {
        console.error('Erro ao criar conversa:', conversationError);
        return NextResponse.json(
          { error: 'Erro ao criar conversa' },
          { status: 500 }
        );
      }

      currentConversationId = newConversation.id;
    }

    // Salvar mensagem do usuário
    const { data: userMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: currentConversationId,
        content: message || '[Anexo]',
        role: 'user',
        agent_id: agentId,
        attachments: attachments,
        created_at: isoNow()
      })
      .select()
      .single();

    if (messageError) {
      console.error('Erro ao salvar mensagem:', messageError);
      return NextResponse.json(
        { error: 'Erro ao salvar mensagem' },
        { status: 500 }
      );
    }

    // Buscar informações do usuário para incluir o nome
    const { data: userData } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .maybeSingle();

    // Extrair nome completo ou primeiro nome com fallback
    let userName = 'Usuário';
    if (userData?.full_name && userData.full_name.trim().length > 0) {
      userName = userData.full_name.trim(); // Nome completo
    } else if (userData?.email) {
      const localPart = userData.email.split('@')[0];
      userName = localPart.charAt(0).toUpperCase() + localPart.slice(1);
    }

    // Determinar tipos de anexos
    const attachmentTypes = attachments && attachments.length > 0
      ? [...new Set(attachments.map((att: any) => att.type))]
      : [];

    // Enviar para N8N webhook
    const agentName = (agent.name && agent.name.trim().length > 0) ? agent.name.trim() : 'Agente';
    const webhookPayload = {
      user_name: userName, // envia nome do usuário
      sender_type: 'User',
      message: message || '[Anexo]',
      agent_name: agentName,
      conversation_id: currentConversationId,
      attachments,
      attachments_type: attachmentTypes.join(', '),
      timestamp: isoNow()
    };

    let webhookResult: any = null;
    // Permite retornar a mensagem salva do assistente para o cliente atualizar a UI
    let savedAgentMessage: any = null;
    try {
      const webhookResponse = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      });

      if (!webhookResponse.ok) {
        const errText = await webhookResponse.text();
        console.error('Erro no webhook N8N:', webhookResponse.status, errText);
        return NextResponse.json(
          { error: 'Erro ao processar mensagem no N8N', status: webhookResponse.status, details: errText },
          { status: 500 }
        );
      }

      const text = await webhookResponse.text();
      try {
        webhookResult = JSON.parse(text);
      } catch {
        webhookResult = { response: text };
      }
    } catch (hookErr) {
      console.error('Falha ao chamar webhook N8N:', hookErr);
      return NextResponse.json(
        { error: 'Falha na chamada ao webhook do N8N', details: hookErr instanceof Error ? hookErr.message : String(hookErr) },
        { status: 500 }
      );
    }

    // Salvar resposta do agente (se existir texto)
    if (webhookResult?.response) {
      const { data: agentMessage, error: responseError } = await supabase
        .from('messages')
        .insert({
          conversation_id: currentConversationId,
          content: webhookResult.response,
          role: 'assistant',
          agent_id: agentId,
          attachments: [],
          created_at: isoNow()
        })
        .select()
        .single();

      if (responseError) {
        console.error('Erro ao salvar resposta:', responseError);
      } else if (agentMessage) {
        // Guardar para retorno ao cliente
        savedAgentMessage = agentMessage;
        // Enviar notificação em tempo real
        try {
          const channel = supabase.channel('chat-updates');

          await new Promise<void>((resolve, reject) => {
            let settled = false;
            const timeout = setTimeout(() => {
              if (!settled) {
                settled = true;
                console.warn('Timeout ao tentar assinar o canal Realtime');
                resolve();
              }
            }, 1500);

            channel.subscribe((status) => {
              if (status === 'SUBSCRIBED' && !settled) {
                settled = true;
                clearTimeout(timeout);
                resolve();
              } else if (status === 'CHANNEL_ERROR' && !settled) {
                settled = true;
                clearTimeout(timeout);
                reject(new Error('Erro ao assinar o canal Realtime'));
              }
            });
          });

          const sendResult = await channel.send({
            type: 'broadcast',
            event: 'new_message',
            payload: {
              conversationId: currentConversationId,
              message: agentMessage,
              agentId,
              userId
            }
          });

          if (sendResult !== 'ok') {
            console.warn('Falha ao enviar broadcast Realtime:', sendResult);
          }

          await channel.unsubscribe();
        } catch (notificationError) {
          console.error('Erro ao enviar notificação:', notificationError);
        }
      }
    }

    // Atualizar timestamp da conversa
    await supabase
      .from('conversations')
      .update({ updated_at: isoNow() })
      .eq('id', currentConversationId);

    return NextResponse.json({
      success: true,
      conversationId: currentConversationId,
      response: webhookResult?.response ?? null,
      agentMessage: savedAgentMessage
    });

  } catch (error) {
    console.error('Erro na API de chat:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}