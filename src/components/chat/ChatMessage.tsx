import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatStore } from '@/stores/chatStore';
import { Check, CheckCheck, Download, FileText, Music, Video, Image } from 'lucide-react';
import { Attachment } from '@/lib/types';

export default function ChatMessage({ 
  content, 
  isUser, 
  timestamp, 
  attachments = [] 
}: { 
  content: string; 
  isUser: boolean; 
  timestamp?: string; 
  attachments?: Attachment[];
}) {
  const agent = useChatStore(s => s.currentAgent);
  
  return (
    <div className={`flex gap-2 mb-4 px-2 md:px-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${agent.bgColor} flex-shrink-0 mt-1`}>
          {React.createElement(agent.icon, { className: agent.color, size: 16 })}
        </div>
      )}
      
      <div className={`max-w-[85%] sm:max-w-xs md:max-w-md lg:max-w-lg relative ${
        isUser 
          ? 'bg-[#005c4b] text-white rounded-tl-lg rounded-tr-lg rounded-bl-lg rounded-br-sm' 
          : 'bg-[#202c33] text-white rounded-tl-sm rounded-tr-lg rounded-bl-lg rounded-br-lg'
      } px-3 py-2 shadow-sm`}>
        {/* Conteúdo da mensagem */}
        {content && content !== '[Anexo]' && (
          <div className="text-sm leading-relaxed">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                code: ({ children }) => (
                  <code className="bg-black/20 px-1 py-0.5 rounded text-xs font-mono">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-black/20 p-2 rounded mt-1 mb-1 text-xs font-mono overflow-x-auto">
                    {children}
                  </pre>
                )
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
        
        {/* Anexos */}
        {attachments && attachments.length > 0 && (
          <div className={`${content && content !== '[Anexo]' ? 'mt-2' : ''} space-y-2`}>
            {attachments.map((attachment) => (
              <AttachmentRenderer key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}
        
        {/* Timestamp e Status */}
        <div className={`flex items-center justify-end gap-1 mt-1 ${isUser ? 'text-[#8696a0]' : 'text-[#8696a0]'}`}>
          {timestamp && (
            <span className="text-[10px] leading-none">
              {new Date(timestamp).toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          )}
          {isUser && (
            <CheckCheck size={12} className="text-[#53bdeb] flex-shrink-0" />
          )}
        </div>
        
        {/* Seta do balão */}
        {isUser ? (
          <div className="absolute -right-1 bottom-0 w-0 h-0 border-l-[8px] border-l-[#005c4b] border-b-[8px] border-b-transparent" />
        ) : (
          <div className="absolute -left-1 bottom-0 w-0 h-0 border-r-[8px] border-r-[#202c33] border-b-[8px] border-b-transparent" />
        )}
      </div>
    </div>
  );
}

// Componente para renderizar anexos
function AttachmentRenderer({ attachment }: { attachment: Attachment }) {
  const getIcon = () => {
    switch (attachment.type) {
      case 'image':
        return <Image size={16} />;
      case 'video':
        return <Video size={16} />;
      case 'audio':
        return <Music size={16} />;
      default:
        return <FileText size={16} />;
    }
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  if (attachment.type === 'image') {
    return (
      <div className="max-w-xs">
        <img 
          src={attachment.url} 
          alt={attachment.filename}
          className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => window.open(attachment.url, '_blank')}
        />
        <div className="mt-1 text-xs text-[#8696a0] flex items-center gap-1">
          <Image size={12} />
          <span>{attachment.filename}</span>
          <span>•</span>
          <span>{formatFileSize(attachment.size)}</span>
        </div>
      </div>
    );
  }
  
  if (attachment.type === 'video') {
    return (
      <div className="max-w-xs">
        <video 
          controls 
          className="rounded-lg max-w-full h-auto"
          preload="metadata"
        >
          <source src={attachment.url} type={attachment.mime_type} />
          Seu navegador não suporta o elemento de vídeo.
        </video>
        <div className="mt-1 text-xs text-[#8696a0] flex items-center gap-1">
          <Video size={12} />
          <span>{attachment.filename}</span>
          <span>•</span>
          <span>{formatFileSize(attachment.size)}</span>
        </div>
      </div>
    );
  }
  
  if (attachment.type === 'audio') {
    return (
      <div className="max-w-xs">
        <audio 
          controls 
          className="w-full"
          preload="metadata"
        >
          <source src={attachment.url} type={attachment.mime_type} />
          Seu navegador não suporta o elemento de áudio.
        </audio>
        <div className="mt-1 text-xs text-[#8696a0] flex items-center gap-1">
          <Music size={12} />
          <span>{attachment.filename}</span>
          <span>•</span>
          <span>{formatFileSize(attachment.size)}</span>
        </div>
      </div>
    );
  }
  
  // Arquivo genérico
  return (
    <div className="bg-black/10 rounded-lg p-3 max-w-xs">
      <div className="flex items-center gap-2">
        <div className="text-[#8696a0]">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{attachment.filename}</p>
          <p className="text-xs text-[#8696a0]">
            {formatFileSize(attachment.size)} • {attachment.mime_type}
          </p>
        </div>
        <a 
          href={attachment.url} 
          download={attachment.filename}
          className="text-[#8696a0] hover:text-white transition-colors p-1"
          title="Baixar arquivo"
        >
          <Download size={16} />
        </a>
      </div>
    </div>
  );
}