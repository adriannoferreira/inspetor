import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isoNow } from '@/lib/utils';
import type { Attachment } from '@/lib/types';

// Configuração do Supabase para uso no servidor
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Chave secreta para validar webhooks (opcional, mas recomendado)
const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;

// Interface para o payload de resposta do N8N
interface N8NResponsePayload {
  conversation_id: string;
  agent_response: string;
  agent_name: string;
  user_name?: string;
  timestamp?: string;
  attachments?: Attachment[];
  attachments_type?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verificar webhook secret
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorização necessário' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    if (WEBHOOK_SECRET && token !== WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Token de autorização inválido' },
        { status: 401 }
      );
    }

    const payload: N8NResponsePayload = await request.json();
    
    console.log('Payload recebido do N8N:', JSON.stringify(payload, null, 2));

    // Extrair dados do payload
    const { 
      conversation_id, 
      agent_response, 
      agent_name,
      // user_name, // não utilizado
      // timestamp, // não utilizado diretamente
      attachments = []
    } = payload;

    // Validação dos dados obrigatórios
    if (!conversation_id || !agent_response) {
      return NextResponse.json(
        { error: 'Dados obrigatórios: conversation_id, agent_response' },
        { status: 400 }
      );
    }

    // Verificar se a conversa existe
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id, user_id, agent_id')
      .eq('id', conversation_id)
      .single();

    if (conversationError || !conversation) {
      console.error('Conversa não encontrada:', conversationError);
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
      );
    }

    // Buscar informações do agente se agent_name foi fornecido
    let agentId = conversation.agent_id;
    if (agent_name && !agentId) {
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('name', agent_name)
        .single();
      
      if (agent) {
        agentId = agent.id;
      }
    }

    // Salvar resposta do agente
    const { data: newMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation_id,
        content: agent_response,
        role: 'assistant',
        agent_id: agentId,
        created_at: isoNow(),
        attachments: attachments.length > 0 ? attachments : null
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

    // Atualizar timestamp da conversa
    await supabase
      .from('conversations')
      .update({ updated_at: isoNow() })
      .eq('id', conversation_id);

    // Enviar notificação em tempo real via Supabase Realtime
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
          conversationId: conversation_id,
          message: newMessage,
          agentId: agentId,
          userId: conversation.user_id,
          agentName: agent_name
        }
      });

      if (sendResult !== 'ok') {
        console.warn('Falha ao enviar broadcast Realtime:', sendResult);
      }

      await channel.unsubscribe();
    } catch (realtimeError) {
      console.warn('Erro ao enviar notificação em tempo real:', realtimeError);
      // Não falha a operação se o realtime falhar
    }

    return NextResponse.json({
      success: true,
      messageId: newMessage.id,
      message: 'Resposta do agente salva com sucesso',
      conversationId: conversation_id,
      agentName: agent_name
    });

  } catch (error) {
    console.error('Erro no webhook de resposta N8N:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Método GET para verificar se o webhook está funcionando
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Webhook de resposta N8N está funcionando',
    timestamp: isoNow(),
    expectedPayload: {
      conversation_id: 'string (obrigatório)',
      agent_response: 'string (obrigatório)',
      agent_name: 'string (opcional)',
      user_name: 'string (opcional)',
      timestamp: 'string ISO (opcional)',
      attachments: 'array (opcional)',
      attachments_type: 'string (opcional)'
    }
  });
}