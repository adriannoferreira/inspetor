'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Settings, Save, RefreshCw, Database, Shield, MessageSquare } from 'lucide-react';

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description: string;
  category: string;
  created_at: string;
  updated_at: string;
}

interface SettingForm {
  site_name: string;
  site_description: string;
  max_messages_per_conversation: string;
  enable_user_registration: string;
  default_user_role: string;
  chat_rate_limit: string;
  maintenance_mode: string;
}

export default function SystemSettings() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<SettingForm>({
    site_name: '',
    site_description: '',
    max_messages_per_conversation: '',
    enable_user_registration: '',
    default_user_role: '',
    chat_rate_limit: '',
    maintenance_mode: ''
  });
  const supabase = getSupabaseClient();

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      
      const settingsData = data || [];
      setSettings(settingsData);
      
      // Preencher o formulário com os valores existentes
      const formValues: SettingForm = {
        site_name: '',
        site_description: '',
        max_messages_per_conversation: '',
        enable_user_registration: '',
        default_user_role: '',
        chat_rate_limit: '',
        maintenance_mode: ''
      };
      
      settingsData.forEach((setting: SystemSetting) => {
        if (setting.key in formValues) {
          const key = setting.key as keyof SettingForm;
          formValues[key] = setting.value;
        }
      });
      
      setFormData(formValues);
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const initializeDefaultSettings = async () => {
    const defaultSettings = [
      {
        key: 'site_name',
        value: 'O Inspetor',
        description: 'Nome do site/aplicação',
        category: 'general'
      },
      {
        key: 'site_description',
        value: 'Sistema de chat inteligente com IA',
        description: 'Descrição do site/aplicação',
        category: 'general'
      },
      {
        key: 'max_messages_per_conversation',
        value: '100',
        description: 'Máximo de mensagens por conversa',
        category: 'chat'
      },
      {
        key: 'enable_user_registration',
        value: 'true',
        description: 'Permitir registro de novos usuários',
        category: 'auth'
      },
      {
        key: 'default_user_role',
        value: 'user',
        description: 'Role padrão para novos usuários',
        category: 'auth'
      },
      {
        key: 'chat_rate_limit',
        value: '10',
        description: 'Limite de mensagens por minuto por usuário',
        category: 'chat'
      },
      {
        key: 'maintenance_mode',
        value: 'false',
        description: 'Modo de manutenção ativo',
        category: 'system'
      }
    ];

    try {
      setSaving(true);
      
      for (const setting of defaultSettings) {
        const { error } = await supabase
          .from('system_settings')
          .upsert(setting, { onConflict: 'key' });
        
        if (error) throw error;
      }
      
      await fetchSettings();
      alert('Configurações padrão inicializadas com sucesso!');
    } catch (error) {
      console.error('Erro ao inicializar configurações:', error);
      alert('Erro ao inicializar configurações');
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updates = Object.entries(formData).map(([key, value]) => ({
        key,
        value,
        description: getSettingDescription(key),
        category: getSettingCategory(key)
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('system_settings')
          .upsert(update, { onConflict: 'key' });
        
        if (error) throw error;
      }

      await fetchSettings();
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      site_name: 'Nome do site/aplicação',
      site_description: 'Descrição do site/aplicação',
      max_messages_per_conversation: 'Máximo de mensagens por conversa',
      enable_user_registration: 'Permitir registro de novos usuários',
      default_user_role: 'Role padrão para novos usuários',
      chat_rate_limit: 'Limite de mensagens por minuto por usuário',
      maintenance_mode: 'Modo de manutenção ativo'
    };
    return descriptions[key] || '';
  };

  const getSettingCategory = (key: string): string => {
    const categories: Record<string, string> = {
      site_name: 'general',
      site_description: 'general',
      max_messages_per_conversation: 'chat',
      enable_user_registration: 'auth',
      default_user_role: 'auth',
      chat_rate_limit: 'chat',
      maintenance_mode: 'system'
    };
    return categories[key] || 'general';
  };

  const handleInputChange = (key: keyof SettingForm, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configurações do Sistema</h1>
          <p className="text-gray-600 mt-2">Gerencie as configurações globais da aplicação</p>
        </div>
        {settings.length === 0 && (
          <button
            onClick={initializeDefaultSettings}
            disabled={saving}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Database className="h-4 w-4 mr-2" />
            {saving ? 'Inicializando...' : 'Inicializar Configurações'}
          </button>
        )}
      </div>

      {settings.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Settings className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma configuração encontrada</h3>
          <p className="text-gray-600 mb-6">Inicialize as configurações padrão para começar.</p>
          <button
            onClick={initializeDefaultSettings}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Database className="h-4 w-4 mr-2" />
            {saving ? 'Inicializando...' : 'Inicializar Configurações'}
          </button>
        </div>
      ) : (
        <form onSubmit={saveSettings} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* General Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Configurações Gerais
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome do Site</label>
                <input
                  type="text"
                  value={formData.site_name}
                  onChange={(e) => handleInputChange('site_name', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Descrição do Site</label>
                <textarea
                  value={formData.site_description}
                  onChange={(e) => handleInputChange('site_description', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Chat Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              Configurações de Chat
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Máximo de Mensagens por Conversa</label>
                <input
                  type="number"
                  value={formData.max_messages_per_conversation}
                  onChange={(e) => handleInputChange('max_messages_per_conversation', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Limite de Mensagens por Minuto</label>
                <input
                  type="number"
                  value={formData.chat_rate_limit}
                  onChange={(e) => handleInputChange('chat_rate_limit', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Auth Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Configurações de Autenticação
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Permitir Registro de Usuários</label>
                <select
                  value={formData.enable_user_registration}
                  onChange={(e) => handleInputChange('enable_user_registration', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role Padrão para Novos Usuários</label>
                <select
                  value={formData.default_user_role}
                  onChange={(e) => handleInputChange('default_user_role', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
          </div>

          {/* System Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <RefreshCw className="h-5 w-5 mr-2" />
              Configurações do Sistema
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Modo de Manutenção</label>
                <select
                  value={formData.maintenance_mode}
                  onChange={(e) => handleInputChange('maintenance_mode', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="false">Desativado</option>
                  <option value="true">Ativado</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={fetchSettings}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Recarregar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}