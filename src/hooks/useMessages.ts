import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient, withAuth } from '@/lib/supabase-client';
import { useChatStore } from '@/stores/chatStore';
import { Attachment } from '@/lib/types';

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  role: 'user' | 'assistant';
  agent_id?: string;
  attachments?: Attachment[];
  created_at: string;
}

export function useMessages(conversationId: string | null, userId: string | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addMessage = useChatStore(s => s.addMessage);
  const setTyping = useChatStore(s => s.setTyping);
  const messages = useChatStore(s => s.messages);

  // Carregar mensagens do banco de dados
  const loadMessages = useCallback(async () => {
    if (!conversationId || !userId) return;

    try {
      setLoading(true);
      setError(null);

      const result = await withAuth(async (supabase) => {
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select(`
            id,
            conversation_id,
            content,
            role,
            agent_id,
            attachments,
            created_at
          `)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (messagesError) {
          throw messagesError;
        }

        return messages || [];
      });

      if (result) {
        // Limpar mensagens atuais e adicionar as do banco
        useChatStore.getState().clearChat();
        
        result.forEach((msg: Message) => {
          addMessage({
            conversation_id: msg.conversation_id,
            content: msg.content,
            is_user: msg.role === 'user',
            agent_id: msg.agent_id,
            attachments: msg.attachments || []
          });
        });
      } else {
        setError('Usuário não autenticado');
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
      setError('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  }, [conversationId, userId, addMessage]);

  // Configurar subscription para notificações em tempo real
  useEffect(() => {
    if (!conversationId || !userId) return;

    // Carregar mensagens iniciais
    loadMessages();

    const supabase = getSupabaseClient();

    // Configurar subscription para novas mensagens
    const channel = supabase
      .channel('chat-updates')
      .on(
        'broadcast',
        { event: 'new_message' },
        (payload: { payload: { conversationId: string; message: Message; userId: string } }) => {
          const { conversationId: msgConvId, message, userId: msgUserId } = payload.payload;
          
          // Verificar se a mensagem é para esta conversa e usuário
          if (msgConvId === conversationId && msgUserId === userId) {
            // Adicionar mensagem do agente
            addMessage({
              conversation_id: message.conversation_id,
              content: message.content,
              is_user: false,
              agent_id: message.agent_id,
              attachments: message.attachments || []
            });
            
            // Parar indicador de digitação
            setTyping(false);
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId, addMessage, setTyping, loadMessages]);

  return {
    messages,
    loading,
    error,
    loadMessages,
    refetch: loadMessages
  };
}