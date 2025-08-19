import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GraduationCap, Search, FileCheck, User } from 'lucide-react';
import { Agent, Message, Conversation, ChatState } from '@/lib/types';
import { Agent as DatabaseAgent } from '@/hooks/useAgents';

// Função para converter agente do banco para o formato do store
export const convertDatabaseAgentToStoreAgent = (dbAgent: DatabaseAgent): Agent => {
  // Mapear ícones baseado no nome ou usar um padrão
  const getIconAndColors = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('educador') || lowerName.includes('trânsito')) {
      return {
        icon: GraduationCap,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
      };
    }
    if (lowerName.includes('perito')) {
      return {
        icon: Search,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
      };
    }
    if (lowerName.includes('revisor') || lowerName.includes('lpst')) {
      return {
        icon: FileCheck,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
      };
    }
    // Padrão para outros agentes
    return {
      icon: User,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    };
  };

  const iconConfig = getIconAndColors(dbAgent.name);
  
  return {
    id: dbAgent.id,
    name: dbAgent.name,
    description: dbAgent.description,
    avatar_url: dbAgent.avatar_url,
    ...iconConfig,
  };
};

// Agente padrão para fallback
export const DEFAULT_AGENT: Agent = {
  id: 'default',
  name: 'Assistente',
  description: 'Assistente padrão',
  icon: User,
  color: 'text-gray-600',
  bgColor: 'bg-gray-50',
};

interface ChatStoreState extends ChatState {
  agents: Agent[];
  addMessage: (message: Omit<Message, 'id' | 'created_at'>) => void;
  setTyping: (isTyping: boolean) => void;
  setCurrentAgent: (agent: Agent) => void;
  setAgents: (agents: Agent[]) => void;
  clearChat: () => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
}

export const useChatStore = create<ChatStoreState>()(
  persist(
    (set, get) => ({
      messages: [],
      currentConversation: null,
      isTyping: false,
      agents: [],
      currentAgent: DEFAULT_AGENT,

      addMessage: (message) => set((state) => {
        // Se a mensagem já tem ID (vem do banco), usar como está
        const newMessage = message.id ? message : {
          ...message,
          id: Math.random().toString(36),
          created_at: new Date().toISOString(),
        };
        
        // Evitar duplicatas baseado no ID
        const messageExists = state.messages.some(m => m.id === newMessage.id);
        if (messageExists) {
          return state;
        }
        
        return {
          messages: [...state.messages, newMessage]
        };
      }),

      setTyping: (isTyping) => set({ isTyping }),

      setCurrentAgent: (agent) => set({ currentAgent: agent }),

      setAgents: (agents) => set({ agents }),

      clearChat: () => set({ 
        messages: [], 
        currentConversation: null, 
        isTyping: false 
      }),

      setCurrentConversation: (conversation) => set({ currentConversation: conversation }),
    }),
    {
      name: 'inspetor-chat',
      // Bump version to trigger migration behavior if needed
      version: 2,
      // Nunca persista currentAgent pois ele contém uma função (icon), que não é serializável
      partialize: (state) => ({ 
        messages: state.messages,
        currentConversation: state.currentConversation
      }),
      // Remove currentAgent persistido de versões antigas e corrige objetos inválidos
      migrate: (persistedState: any, currentVersion: number) => {
        try {
          const { currentAgent: _drop, ...rest } = persistedState || {};
          return rest;
        } catch {
          return persistedState;
        }
      },
      // Sanitiza estados antigos que persistiram currentAgent com icon inválido
      merge: (persistedState: any, currentState: any) => {
        const state: ChatStoreState = { ...currentState, ...persistedState };
        if (!state.currentAgent || typeof (state.currentAgent as any).icon !== 'function') {
          state.currentAgent = AGENTS[0];
        }
        return state;
      },
    }
  )
);