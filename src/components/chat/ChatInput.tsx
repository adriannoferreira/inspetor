"use client";
import React, { useEffect, useState, useRef } from 'react';
import { Send, Paperclip, Mic, Smile, X } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import axios from 'axios';
import { isoNow } from '@/lib/utils';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Attachment } from '@/lib/types';
import type { Message, Conversation } from '@/lib/types';
import { toast } from 'sonner';

interface ChatInputProps {
  onSend?: (content: string, attachments: Attachment[]) => void;
  disabled?: boolean;
  agentId?: string;
}

export default function ChatInput({ onSend, disabled = false, agentId }: ChatInputProps) {
  const [text, setText] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setTyping = useChatStore(s => s.setTyping);
  const addMessage = useChatStore(s => s.addMessage);
  const conv = useChatStore(s => s.currentConversation);
  const agent = useChatStore(s => s.currentAgent);
  const setCurrentConversation = useChatStore(s => s.setCurrentConversation);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
      setUserId(data.user?.id ?? null);
    }).catch(() => setUserId(null));
  }, []);

  const uploadFile = async (file: File): Promise<Attachment | null> => {
    if (!userId) return null;
    
    try {
      const supabase = getSupabaseClient();
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;
      
      const { error } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);
      
      if (error) {
        console.error('Erro no upload:', error);
        toast.error('Falha no upload do arquivo');
        return null;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);
      
      const attachment: Attachment = {
        id: crypto.randomUUID(),
        type: file.type.startsWith('image/') ? 'image' : 
              file.type.startsWith('video/') ? 'video' : 
              file.type.startsWith('audio/') ? 'audio' : 'file',
        filename: file.name,
        url: publicUrl,
        size: file.size,
        mime_type: file.type
      };
      
      return attachment;
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro inesperado no upload');
      return null;
    }
  };
  
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    const newAttachments: Attachment[] = [];
    
    for (const file of Array.from(files)) {
      const attachment = await uploadFile(file);
      if (attachment) {
        newAttachments.push(attachment);
      }
    }
    
    setAttachments(prev => [...prev, ...newAttachments]);
    setUploading(false);
    
    // Limpar o input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (newAttachments.length === 0) {
      toast.warning('Nenhum arquivo pôde ser anexado');
    }
  };
  
  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleSend = async () => {
    const content = text.trim();
    if (!content && attachments.length === 0) return;
    if (disabled) return;
    
    setText('');
    const currentAttachments = [...attachments];
    setAttachments([]);

    // Se há uma função onSend personalizada, usar ela
    if (onSend) {
      // Adiciona mensagem do usuário localmente para feedback imediato
      const userMsg: Omit<Message, 'id' | 'created_at'> = {
        conversation_id: conv?.id || 'temp',
        content: content || '[Anexo]',
        is_user: true,
        agent_id: agentId || agent.id,
        attachments: currentAttachments,
      };
      addMessage(userMsg);
      
      try {
        await onSend(content || '[Anexo]', currentAttachments);
      } catch {
        toast.error('Não foi possível enviar sua mensagem');
      }
      return;
    }

    // Fallback para o comportamento original
    if (!agent) return;
    
    // Adiciona mensagem do usuário localmente para feedback imediato
    const userMsg: Omit<Message, 'id' | 'created_at'> = {
      conversation_id: conv?.id || 'temp',
      content: content || '[Anexo]',
      is_user: true,
      attachments: currentAttachments,
    };
    addMessage(userMsg);

    try {
      setTyping(true);
      const res = await axios.post('/api/chat/send', {
        message: content || '[Anexo]',
        agentId: agent.id,
        conversationId: conv?.id,
        userId: userId,
        attachments: currentAttachments,
      });

      const responseData = res.data as { conversationId?: string };

      // Se não havia conversa, define a atual com a retornada pela API
      if (!conv?.id && responseData?.conversationId && userId) {
        const newConv: Conversation = {
          id: responseData.conversationId,
          user_id: userId,
          agent_id: agent.id,
          title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
          created_at: isoNow(),
          updated_at: isoNow(),
        };
        setCurrentConversation(newConv);
      }

    } catch (e) {
      console.error(e);
      toast.error('Falha ao enviar a mensagem');
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="bg-[#202c33] p-2 md:p-4 border-t border-[#313d45]">
      <div className="flex items-end gap-2">
        {/* Input de Arquivo Oculto */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {/* Botão de Anexo */}
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="p-1.5 md:p-2 rounded-full hover:bg-[#313d45] transition-colors flex-shrink-0 disabled:opacity-50"
        >
          <Paperclip size={18} className="text-[#8696a0] md:w-5 md:h-5" />
        </button>
        
        {/* Container do Input */}
        <div className="flex-1 bg-[#2a3942] rounded-lg flex items-center">
        {/* Botão de Emoji */}
         <button className="p-1.5 md:p-2 hover:bg-[#313d45] rounded-l-lg transition-colors">
           <Smile size={18} className="text-[#8696a0] md:w-5 md:h-5" />
         </button>
        
        {/* Input de Texto */}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={`Digite uma mensagem`}
          className="flex-1 bg-transparent text-white placeholder-[#8696a0] py-3 px-2 outline-none text-sm"
        />
      </div>
      
        {/* Botão de Enviar ou Microfone */}
         {text.trim() || attachments.length > 0 ? (
           <button 
             onClick={handleSend} 
             className="p-1.5 md:p-2 bg-[#00a884] hover:bg-[#00a884]/90 rounded-full transition-colors flex-shrink-0"
           >
             <Send size={18} className="text-white md:w-5 md:h-5" />
           </button>
         ) : (
           <button className="p-1.5 md:p-2 rounded-full hover:bg-[#313d45] transition-colors flex-shrink-0">
             <Mic size={18} className="text-[#8696a0] md:w-5 md:h-5" />
           </button>
         )}
      </div>
      
      {/* Preview de Anexos */}
      {attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="relative bg-[#2a3942] rounded-lg p-2 flex items-center gap-2 max-w-xs">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">{attachment.filename}</p>
                <p className="text-[#8696a0] text-xs">
                  {attachment.type} • {(attachment.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={() => removeAttachment(attachment.id)}
                className="p-1 hover:bg-[#313d45] rounded transition-colors flex-shrink-0"
              >
                <X size={14} className="text-[#8696a0]" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Indicador de Upload */}
      {uploading && (
        <div className="mt-2 text-[#8696a0] text-sm">
          Fazendo upload dos arquivos...
        </div>
      )}
    </div>
  );
}