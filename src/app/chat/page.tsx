'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useChatStore, convertDatabaseAgentToStoreAgent } from '@/stores/chatStore';
import ChatMessage from '@/components/chat/ChatMessage';
import ChatInput from '@/components/chat/ChatInput';
import AgentSelector from '@/components/agents/AgentSelector';
import { getSupabaseClient, withAuth } from '@/lib/supabase-client';
import { RefreshCw, MoreVertical, Trash2, Download, MessageSquare, Search, Phone, Video, Menu, X, ArrowLeft, Settings, LogOut } from 'lucide-react';
import { useAgents } from '@/hooks/useAgents';
import { useAdmin } from '@/hooks/useAdmin';
import { useRouter } from 'next/navigation';
import { useMessages } from '@/hooks/useMessages';


export default function ChatPage() {
  console.log('🎯 ChatPage: Componente renderizado');
  
  const isTyping = useChatStore(s => s.isTyping);
  const agent = useChatStore(s => s.currentAgent);
  const agents = useChatStore(s => s.agents);
  const setCurrentAgent = useChatStore(s => s.setCurrentAgent);
  const setAgents = useChatStore(s => s.setAgents);
  const clearChat = useChatStore(s => s.clearChat);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [user, setUser] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const { agents: dbAgents, loading: agentsLoading } = useAgents();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const router = useRouter();
  const [showAdminButton, setShowAdminButton] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Hook para carregar mensagens e configurar realtime
  const { messages, loading: messagesLoading, error: messagesError, loadMessages } = useMessages(
    currentConversationId,
    user?.id
  );
  const addMessage = useChatStore(s => s.addMessage);

  // Debug do status de admin
  useEffect(() => {
    console.log('🔍 Debug Admin Status:', {
      adminLoading,
      isAdmin,
      user: user ? { id: user.id, email: user.email } : null,
      showAdminButton
    });
  }, [adminLoading, isAdmin, user, showAdminButton]);

  // Controlar visibilidade do botão admin de forma mais estável
  useEffect(() => {
    if (!adminLoading && isAdmin && user) {
      setShowAdminButton(true);
    } else if (!adminLoading && (!isAdmin || !user)) {
      setShowAdminButton(false);
    }
  }, [adminLoading, isAdmin, user]);

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showDropdown]);

  useEffect(() => {
    setIsMounted(true);
    const supabase = getSupabaseClient();

    // Verificar sessão ativa e obter usuário
    const getUser = async () => {
      try {
        // Primeiro, tentar obter a sessão atual
        let { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erro ao obter sessão:', error);
        }
        
        // Se não há sessão, tentar fazer refresh
        if (!session) {
          console.log('Tentando fazer refresh da sessão...');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshData.session) {
            session = refreshData.session;
            console.log('Sessão recuperada com sucesso');
          }
        }
        
        if (session?.user) {
          setUser(session.user);
          console.log('Usuário autenticado:', session.user.email);
        } else {
          // Se ainda não há sessão, tentar obter usuário diretamente
          const { data, error: userError } = await supabase.auth.getUser();
          if (userError) {
            console.error('Erro ao obter usuário:', userError);
            return;
          }
          if (data.user) {
            setUser(data.user);
            console.log('Usuário obtido diretamente:', data.user.email);
          }
        }
      } catch (error) {
        console.error('Erro na autenticação:', error);
      }
    };
    
    getUser();
  }, []);

  // Carregar agentes do banco de dados
  useEffect(() => {
    if (dbAgents.length > 0) {
      const storeAgents = dbAgents.map(convertDatabaseAgentToStoreAgent);
      setAgents(storeAgents);
      
      // Se não há agente selecionado ou o agente atual é o padrão, selecionar o primeiro
      if (!agent || agent.id === 'default') {
        setCurrentAgent(storeAgents[0]);
      }
    }
  }, [dbAgents, setAgents, setCurrentAgent, agent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const agentMessages = selectedAgent ? (messages?.filter(m => m.agent_id === selectedAgent.id) || []) : [];
  const [isLoading, setIsLoading] = useState(false);
  
  // Função para criar ou buscar conversa
  const getOrCreateConversation = async (agentId: string): Promise<string | null> => {
    if (!user?.id) {
      console.error('Usuário não autenticado');
      return null;
    }

    try {
      // Usar a API interna em vez de requisições diretas ao Supabase
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          agentId: agentId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na API de conversas:', response.status, errorText);
        return null;
      }

      const data = await response.json();
      return data.conversationId || data.id;
    } catch (error) {
      console.error('Erro na função getOrCreateConversation:', error);
      return null;
    }
  };
  
  // Função para carregar todas as mensagens do usuário
  const loadAllUserMessages = async () => {
    if (!user?.id) return;
    
    try {
      // Buscar todas as conversas do usuário
      const response = await fetch(`/api/conversations?userId=${user.id}&limit=50`);
      if (!response.ok) {
        console.error('Erro ao buscar conversas:', response.status);
        return;
      }
      
      const conversations = await response.json();
      console.log('Conversas encontradas:', conversations.length);
      
      // Limpar mensagens atuais
      useChatStore.getState().clearChat();
      
      // Carregar mensagens de cada conversa
      for (const conv of conversations) {
        if (conv.messages && conv.messages.length > 0) {
          conv.messages.forEach((msg: any) => {
            addMessage({
              id: msg.id,
              conversation_id: conv.id,
              content: msg.content,
              is_user: msg.role === 'user',
              agent_id: conv.agent_id,
              attachments: msg.attachments || [],
              created_at: msg.created_at
            });
          });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens do usuário:', error);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      
      // Limpar o store do chat
      useChatStore.getState().clearChat();
      
      // Redirecionar para login
      router.push('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };
  
  // Carregar todas as mensagens quando o usuário é autenticado
  useEffect(() => {
    if (user?.id) {
      loadAllUserMessages();
    }
  }, [user?.id]);

  // Efeito para carregar conversa quando agente é selecionado
  useEffect(() => {
    if (selectedAgent && user?.id) {
      getOrCreateConversation(selectedAgent.id).then(conversationId => {
        if (conversationId) {
          setCurrentConversationId(conversationId);
        }
      });
    } else {
      setCurrentConversationId(null);
    }
  }, [selectedAgent, user?.id]);

  const handleSendMessage = async (content: string, attachments: any[] = []) => {
    if (!selectedAgent || (!content.trim() && attachments.length === 0) || !currentConversationId || !user?.id) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          agentId: selectedAgent.id,
          conversationId: currentConversationId,
          userId: user.id,
          attachments
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro na resposta:', errorData);
        throw new Error(errorData.error || 'Erro ao enviar mensagem');
      }
      
      const result = await response.json();
      console.log('Mensagem enviada com sucesso:', result);

      // Fallback: se a API já retornou a mensagem do agente salva, adicionar imediatamente
      if (result?.agentMessage) {
        addMessage({
          id: result.agentMessage.id,
          conversation_id: currentConversationId,
          content: result.agentMessage.content,
          is_user: false,
          agent_id: result.agentMessage.agent_id,
          attachments: result.agentMessage.attachments || [],
          created_at: result.agentMessage.created_at
        });
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#111b21]">
        <div className="text-center bg-[#202c33] p-8 rounded-lg border border-[#313d45] max-w-md">
          <h2 className="text-xl font-semibold mb-4 text-white">Sessão expirada</h2>
          <p className="text-[#8696a0] mb-6">Sua sessão expirou. Faça login novamente para continuar.</p>
          <div className="space-y-3">
            <button 
              onClick={() => router.push('/login')}
              className="bg-[#00a884] text-white px-6 py-3 rounded-lg hover:bg-[#00a884]/90 transition-colors w-full font-medium"
            >
              Fazer Login
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="bg-[#313d45] text-[#8696a0] px-6 py-3 rounded-lg hover:bg-[#3e4a52] transition-colors w-full"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Se não há agente selecionado, mostra a lista de contatos
  if (!selectedAgent) {
    return (
      <div className="h-screen bg-[#111b21] flex flex-col">
        {/* Header */}
        <div className="bg-[#202c33] p-4 border-b border-[#313d45]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-xl font-medium">Chats</h2>
            <div className="flex items-center gap-2">
            {showAdminButton && (
              <button 
                onClick={() => router.push('/dashboard')}
                className="p-2 rounded-full hover:bg-[#313d45] transition-colors"
                title="Dashboard Admin"
              >
                <Settings size={20} className="text-[#8696a0] hover:text-white" />
              </button>
            )}
            <div className="relative">
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className="p-2 rounded-full hover:bg-[#313d45] transition-colors"
              >
                <MoreVertical size={20} className="text-[#8696a0]" />
              </button>
              
              {showDropdown && (
                <div className="absolute right-0 top-12 bg-[#2a3942] rounded-lg shadow-lg border border-[#313d45] py-2 min-w-[150px] z-50">
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-[#8696a0] hover:bg-[#313d45] hover:text-white transition-colors flex items-center gap-2"
                  >
                    <LogOut size={16} />
                    Sair do Sistema
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>



          {/* Barra de Pesquisa */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8696a0]" size={16} />
            <input
              type="text"
              placeholder="Pesquisar conversas..."
              className="w-full bg-[#2a3942] text-white pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00a884]"
            />
          </div>
        </div>

        {/* Lista de Contatos */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">

            {agents
              .map((a) => {
                const msgs = messages?.filter(m => m.agent_id === a.id) || [];
                const last = msgs.length > 0 ? msgs[msgs.length - 1] : undefined;
                const lastTime = last?.created_at ? new Date(last.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
                const preview = last?.content ? (last.content.length > 50 ? last.content.substring(0, 50) + '...' : last.content) : '';
                console.log(`Agent ${a.name}: ${msgs.length} messages`);
                return { agent: a, lastMessage: last, lastTime, preview };
              })
              .sort((a, b) => {
                // Ordenar por última mensagem (mais recente primeiro), agentes sem mensagens vão para o final
                if (!a.lastMessage && !b.lastMessage) return 0;
                if (!a.lastMessage) return 1;
                if (!b.lastMessage) return -1;
                return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
              })
              .map(({ agent: a, lastTime, preview }) => (
                <button
                  key={a.id}
                  onClick={() => { setSelectedAgent(a); setCurrentAgent(a); }}
                  className="w-full text-left bg-transparent rounded-lg p-4 mb-2 hover:bg-[#313d45] transition-colors border-b border-[#313d45] last:border-b-0"
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-14 w-14 rounded-full flex items-center justify-center ${a.bgColor} overflow-hidden`}>
                      {a.avatar_url ? (
                        <img 
                          src={a.avatar_url} 
                          alt={a.name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        React.createElement(a.icon, { className: a.color, size: 28 })
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-white font-medium truncate text-lg">{a.name}</h3>
                        <span className="text-[#8696a0] text-sm">{lastTime}</span>
                      </div>
                      <p className="text-[#8696a0] text-sm truncate">{preview}</p>
                      <p className="text-[#8696a0] text-xs mt-1 truncate">{a.description}</p>
                    </div>
                  </div>
                </button>
              ))
            }
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#111b21] flex flex-col">
      {/* Header do Chat */}
      <div className="bg-[#202c33] p-4 border-b border-[#313d45]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSelectedAgent(null)}
              className="p-2 rounded-full hover:bg-[#313d45] transition-colors"
            >
              <ArrowLeft size={20} className="text-[#8696a0]" />
            </button>
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${selectedAgent.bgColor} overflow-hidden`}>
              {selectedAgent.avatar_url ? (
                <img 
                  src={selectedAgent.avatar_url} 
                  alt={selectedAgent.name}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                React.createElement(selectedAgent.icon, { className: selectedAgent.color, size: 20 })
              )}
            </div>
            <div>
              <h1 className="text-white font-medium">{selectedAgent.name}</h1>
              <p className="text-[#8696a0] text-sm">
                {isTyping ? 'digitando...' : 'online'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {showAdminButton && (
              <button 
                onClick={() => router.push('/dashboard')}
                className="p-2 rounded-full hover:bg-[#313d45] transition-colors"
                title="Dashboard Admin"
              >
                <Settings size={20} className="text-[#8696a0] hover:text-white" />
              </button>
            )}
            <button className="p-2 rounded-full hover:bg-[#313d45] transition-colors">
              <Phone size={20} className="text-[#8696a0]" />
            </button>
            <button className="p-2 rounded-full hover:bg-[#313d45] transition-colors">
              <Video size={20} className="text-[#8696a0]" />
            </button>
            <button className="p-2 rounded-full hover:bg-[#313d45] transition-colors">
              <MoreVertical size={20} className="text-[#8696a0]" />
            </button>
          </div>
        </div>
      </div>

      {/* Área de Mensagens */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-2"
        style={{
          backgroundColor: '#0b141a'
        }}
      >
        {agentMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className={`h-20 w-20 rounded-full flex items-center justify-center ${selectedAgent.bgColor} mb-4 overflow-hidden`}>
              {selectedAgent.avatar_url ? (
                <img 
                  src={selectedAgent.avatar_url} 
                  alt={selectedAgent.name}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                React.createElement(selectedAgent.icon, { className: selectedAgent.color, size: 32 })
              )}
            </div>
            <h3 className="text-xl font-medium text-white mb-2">
              Olá! Sou o {selectedAgent.name}
            </h3>
            <p className="text-[#8696a0] max-w-md">
              {selectedAgent.description}. Como posso ajudar você hoje?
            </p>
            </div>
          ) : (
            <>
              {agentMessages.map((msg, index) => (
                <ChatMessage 
                  key={`${msg.id}-${index}`}
                  content={msg.content}
                  isUser={msg.is_user}
                  timestamp={msg.created_at}
                  attachments={msg.attachments || []}
                />
              ))}
              
              {isTyping && (
                <div className="flex gap-3 justify-start">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${selectedAgent.bgColor}`}>
                    {React.createElement(selectedAgent.icon, { className: selectedAgent.color, size: 18 })}
                  </div>
                  <div className="bg-[#202c33] rounded-lg px-3 py-2 text-sm max-w-xs">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-[#8696a0] rounded-full animate-bounce" style={{animationDelay: '-0.3s'}}></div>
                      <div className="w-2 h-2 bg-[#8696a0] rounded-full animate-bounce" style={{animationDelay: '-0.15s'}}></div>
                      <div className="w-2 h-2 bg-[#8696a0] rounded-full animate-bounce"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
      </div>

      {/* Área de Input */}
      <div className="bg-[#202c33] p-4">
        <div className="flex items-center gap-2 mb-2">
          {agentMessages.length > 0 && (
            <button 
              onClick={clearChat}
              className="flex items-center gap-1 px-2 py-1 text-xs text-[#8696a0] hover:text-red-400 transition-colors"
            >
              <Trash2 size={12} />
              Limpar Chat
            </button>
          )}
        </div>
        <ChatInput 
          onSend={handleSendMessage} 
          disabled={isLoading} 
          agentId={selectedAgent.id}
        />
      </div>
    </div>
  );
}