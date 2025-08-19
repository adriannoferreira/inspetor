import { useState, useEffect } from 'react';
import { getSupabaseClient, withAuth } from '@/lib/supabase-client';

export interface Agent {
  id: string;
  name: string;
  description: string;
  avatar_url: string;
  payload: any;
  is_active: boolean;
  agent_type: 'advogado' | 'contador' | 'consultor' | 'geral';
  created_at: string;
  updated_at: string;
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = async () => {
    try {
      console.log('🔍 useAgents: Iniciando busca de agentes...');
      setLoading(true);
      setError(null);
      
      // Tentar buscar agentes diretamente sem withAuth primeiro
      const supabase = getSupabaseClient();
      console.log('🔍 useAgents: Cliente Supabase criado');
      
      const { data, error: fetchError } = await supabase
        .from('agents')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('🔍 useAgents: Erro na consulta:', fetchError);
        setError('Erro ao carregar agentes: ' + fetchError.message);
        return;
      }

      console.log('🔍 useAgents: Agentes encontrados:', data?.length || 0);
      console.log('🔍 useAgents: Dados dos agentes:', data);
      setAgents(data || []);
      
    } catch (err) {
      console.error('🔍 useAgents: Erro ao buscar agentes:', err);
      setError('Erro ao carregar agentes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  return {
    agents,
    loading,
    error,
    refetch: fetchAgents
  };
}