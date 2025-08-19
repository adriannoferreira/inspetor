import { LucideIcon } from 'lucide-react';

export interface Agent {
  id: string;
  name: string;
  description: string;
  avatar_url: string;
  system_prompt: string;
  payload: Record<string, unknown>;
  is_active: boolean;
  agent_type: 'advogado' | 'contador' | 'consultor' | 'geral';
  created_at: string;
  updated_at: string;
  // UI-specific fields
  icon?: LucideIcon;
  color?: string;
  bgColor?: string;
}

export interface Attachment {
  id: string;
  type: 'image' | 'file' | 'audio' | 'video';
  filename: string;
  url: string;
  size: number;
  mime_type: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  is_user: boolean;
  agent_id?: string;
  created_at: string;
  attachments?: Attachment[];
}

export interface Conversation {
  id: string;
  user_id: string;
  agent_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatState {
  messages: Message[];
  currentConversation: Conversation | null;
  isTyping: boolean;
  currentAgent: Agent;
}

export interface N8NWebhookPayload {
  user_id?: string;
  user_name?: string;
  sender_type?: 'User' | 'Assistant' | string;
  message: string;
  agent_id: string;
  conversation_id?: string;
  attachments?: Attachment[];
  timestamp: string;
}

export interface N8NWebhookResponse {
  response: string;
  agent_id: string;
  conversation_id: string;
  timestamp: string;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
}