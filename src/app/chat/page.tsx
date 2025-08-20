'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase-client';
import { useChatStore } from '@/stores/chatStore';
import ChatInput from '@/components/chat/ChatInput';
import ChatMessage from '@/components/chat/ChatMessage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Settings, LogOut, Trash2 } from 'lucide-react';
import { useMessages } from '@/hooks/useMessages';
import { useAgents, Agent } from '@/hooks/useAgents';
import { Message, User, Attachment } from '@/lib/types';

export default function ChatPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [user, setUser] = useState<User | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  
  const {
    currentAgent,
    setCurrentAgent,
    messages,
    addMessage,
    clearChat
  } = useChatStore();
  
  const { agents, loading: agentsLoading } = useAgents();
  const { loadMessages } = useMessages(null, null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        router.push('/login');
        return;
      }
      
      setUser(user as User);
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  };

  // Função removida - loadMessages não aceita parâmetros extras

  const handleSendMessage = async (content: string, attachments: Attachment[] = []) => {
    if (!user || !currentAgent || isSending) return;
    
    setIsSending(true);
    
    try {
      const userMessage: Message = {
        id: Date.now().toString(),
        conversation_id: '',
        content,
        is_user: true,
        created_at: new Date().toISOString(),
        agent_id: currentAgent.id,
        attachments
      };
      
      addMessage(userMessage);
      
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          agent_id: currentAgent.id,
          attachments
        }),
      });
      
      if (!response.ok) {
        throw new Error('Falha ao enviar mensagem');
      }
      
      const data = await response.json();
      
      if (data.message) {
        const assistantMessage: Message = {
          id: data.message.id || (Date.now() + 1).toString(),
          conversation_id: '',
          content: data.message.content,
          is_user: false,
          created_at: data.message.timestamp || new Date().toISOString(),
          agent_id: currentAgent.id
        };
        
        addMessage(assistantMessage);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleClearMessages = () => {
    clearChat();
  };

  const handleAgentSelect = (agent: Agent) => {
    setCurrentAgent(agent);
    setSelectedAgent(agent);
    setShowAgentSelector(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">Chat</h1>
            {currentAgent && (
              <Badge variant="secondary" className="flex items-center space-x-2">
                <span>{currentAgent.name}</span>
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAgentSelector(!showAgentSelector)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Agentes
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearMessages}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      {/* Agent Selector */}
      {showAgentSelector && (
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Selecionar Agente:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {agents.map((agent: Agent) => (
                <Card 
                  key={agent.id} 
                  className={`cursor-pointer transition-colors ${
                    currentAgent?.id === agent.id 
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleAgentSelect(agent)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{agent.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {agent.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message: Message) => (
            <ChatMessage 
              key={message.id} 
              content={message.content} 
              isUser={message.is_user} 
              timestamp={message.created_at} 
              attachments={message.attachments} 
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <ChatInput
            onSend={handleSendMessage}
            disabled={!currentAgent || isSending}
            agentId={currentAgent?.id}
          />
        </div>
      </div>
    </div>
  );
}