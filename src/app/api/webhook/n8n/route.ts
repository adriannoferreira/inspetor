import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isoNow } from '@/lib/utils';

// Configuração do Supabase para uso no servidor
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Chave secreta para validar webhooks (opcional, mas recomendado)
const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Validação opcional do webhook secret
    if (WEBHOOK_SECRET) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
        return NextResponse.json(
          { error: 'Não autorizado' },
          { status: 401 }
        );
      }
    }

    const { 
      conversationId, 
      response, 
      agentId, 
      userId, 
      messageId 
    } = await request.json();

    // Validação dos dados obrigatórios
    if (!conversationId || !response) {
      return NextResponse.json(
        { error: 'Dados obrigatórios: conversationId, response' },
        { status: 400 }
      );
    }

    // Verificar se a conversa existe
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .single();

    if (conversationError || !conversation) {
      console.error('Conversa não encontrada:', conversationError);
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
      );
    }

    // Salvar resposta do agente
    const { data: newMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        content: response,
        role: 'assistant',
        agent_id: agentId,
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

    // Atualizar timestamp da conversa
    await supabase
      .from('conversations')
      .update({ updated_at: isoNow() })
      .eq('id', conversationId);

    // Enviar notificação em tempo real via Supabase Realtime
    try {
      // É necessário assinar o canal antes de enviar um broadcast
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
          conversationId,
          message: newMessage,
          agentId,
          userId: conversation.user_id
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
      message: 'Resposta salva com sucesso'
    });

  } catch (error) {
    console.error('Erro no webhook N8N:', error);
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
    message: 'Webhook N8N está funcionando',
    timestamp: isoNow()
  });
}