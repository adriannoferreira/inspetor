'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient, withAuth } from '@/lib/supabase-client';
import { Users, MessageSquare, Settings, TrendingUp, Activity } from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalConversations: number;
  totalMessages: number;
  activeUsers: number;
}

interface RecentActivity {
  id: string;
  type: 'user_registered' | 'conversation_created' | 'message_sent';
  user_email: string;
  created_at: string;
  details?: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalConversations: 0,
    totalMessages: 0,
    activeUsers: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result = await withAuth(async (supabase, session) => {
          // Buscar estatísticas
          const [usersResult, conversationsResult, messagesResult, activeUsersResult] = await Promise.all([
            supabase.from('profiles').select('id', { count: 'exact', head: true }),
            supabase.from('conversations').select('id', { count: 'exact', head: true }),
            supabase.from('messages').select('id', { count: 'exact', head: true }),
            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
          ]);

          return {
            totalUsers: usersResult.count || 0,
            totalConversations: conversationsResult.count || 0,
            totalMessages: messagesResult.count || 0,
            activeUsers: activeUsersResult.count || 0,
          };
        });

        if (result) {
          setStats(result);
        }

        // Buscar atividade recente
        const activityResult = await withAuth(async (supabase, session) => {
          const { data: recentConversations } = await supabase
            .from('conversations')
            .select(`
              id,
              created_at,
              agent_type,
              profiles!conversations_user_id_fkey(email)
            `)
            .order('created_at', { ascending: false })
            .limit(5);
          
          return recentConversations;
        });

        const recentConversations = activityResult;

        const activity: RecentActivity[] = [];
        
        if (recentConversations) {
          recentConversations.forEach((conv: { id: string; user_id: string; title?: string | null; created_at: string; }) => {
            activity.push({
              id: conv.id,
              type: 'conversation_created',
              user_email: conv.profiles?.email || 'Usuário desconhecido',
              created_at: conv.created_at,
              details: `Conversa com agente ${conv.agent_type}`,
            });
          });
        }

        setRecentActivity(activity.slice(0, 10));
      } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'user_registered':
        return <Users className="h-4 w-4 text-green-600" />;
      case 'conversation_created':
        return <MessageSquare className="h-4 w-4 text-blue-600" />;
      case 'message_sent':
        return <Activity className="h-4 w-4 text-purple-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActivityText = (activity: RecentActivity) => {
    switch (activity.type) {
      case 'user_registered':
        return 'se registrou no sistema';
      case 'conversation_created':
        return 'iniciou uma nova conversa';
      case 'message_sent':
        return 'enviou uma mensagem';
      default:
        return 'realizou uma ação';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total de Usuários</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Usuários Ativos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <MessageSquare className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Conversas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalConversations}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Mensagens</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalMessages}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Atividade Recente</h2>
        </div>
        <div className="p-6">
          {recentActivity.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhuma atividade recente encontrada.</p>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.user_email}</span>
                      {' '}{getActivityText(activity)}
                      {activity.details && (
                        <span className="text-gray-600"> - {activity.details}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(activity.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Ações Rápidas</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/dashboard/users"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Users className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900">Gerenciar Usuários</h3>
                <p className="text-sm text-gray-600">Visualizar e editar usuários</p>
              </div>
            </a>

            <a
              href="/dashboard/settings"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Settings className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900">Configurações</h3>
                <p className="text-sm text-gray-600">Ajustar configurações do sistema</p>
              </div>
            </a>

            <a
              href="/chat"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <MessageSquare className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900">Testar Chat</h3>
                <p className="text-sm text-gray-600">Acessar como usuário normal</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}