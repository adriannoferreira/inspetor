"use client";
import React from 'react';
import Image from 'next/image';
import { Agent } from '@/lib/types';

interface AgentSelectorProps {
  agents: Agent[];
  selectedAgent: Agent | null;
  onSelectAgent: (agent: Agent) => void;
}



export default function AgentSelector({ agents, selectedAgent, onSelectAgent }: AgentSelectorProps) {
  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Selecionar Agente:</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedAgent?.id === agent.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => onSelectAgent(agent)}
          >
            <div className="flex items-center space-x-3">
              {agent.avatar_url ? (
                <Image
                  src={agent.avatar_url}
                  alt={`Avatar do agente ${agent.name}`}
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-sm font-medium">
                    {agent.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {agent.name}
                </h4>
                <p className="text-xs text-gray-500 truncate">
                  {agent.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}