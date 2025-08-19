"use client";
import React from 'react';
import { useChatStore } from '@/stores/chatStore';
import { ChevronDown } from 'lucide-react';

export default function AgentSelector() {
  const current = useChatStore(s => s.currentAgent);
  const agents = useChatStore(s => s.agents);
  const setCurrentAgent = useChatStore(s => s.setCurrentAgent);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 p-2 bg-[#2a3942] rounded-lg hover:bg-[#313d45] transition-colors">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${current.bgColor} overflow-hidden`}>
          {current.avatar_url ? (
            <img 
              src={current.avatar_url} 
              alt={current.name}
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            React.createElement(current.icon, { className: current.color, size: 16 })
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{current.name}</p>
          <p className="text-[#8696a0] text-xs truncate">{current.description}</p>
        </div>
        <ChevronDown size={16} className="text-[#8696a0] flex-shrink-0" />
      </div>
      
      <select
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        value={current.id}
        onChange={(e) => {
          const agent = agents.find(a => a.id === e.target.value) || agents[0];
          if (agent) {
            setCurrentAgent(agent);
          }
        }}
      >
        {agents.map(a => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
    </div>
  );
}