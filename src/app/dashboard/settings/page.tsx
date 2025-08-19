'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Settings, Save, RefreshCw, Webhook, Database, Shield, Bell, Users, Code, Plus, Edit, Trash2, Upload, Key, Copy, CheckCircle, ExternalLink } from 'lucide-react';

interface SystemSetting {
  key: string;
  value: string;
  description: string;
}

interface SettingsForm {
  n8n_webhook_url: string;
  n8n_webhook_secret: string;
  system_name: string;
  maintenance_mode: boolean;
  max_conversations_per_user: string;
  session_timeout_minutes: string;
  enable_user_registration: boolean;
  require_email_verification: boolean;
  notification_email: string;
  enable_activity_logs: boolean;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  avatar_url: string;
  system_prompt: string;
  payload: any;
  is_active: boolean;
  agent_type: 'advogado' | 'contador' | 'consultor' | 'geral';
  created_at: string;
  updated_at: string;
}

type TabType = 'system' | 'agents' | 'payloads' | 'api';

export default function SystemSettings() {
  const [activeTab, setActiveTab] = useState<TabType>('system');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsForm>({
    n8n_webhook_url: '',
    n8n_webhook_secret: '',
    system_name: 'O Inspetor',
    maintenance_mode: false,
    max_conversations_per_user: '50',
    session_timeout_minutes: '60',
    enable_user_registration: true,
    require_email_verification: false,
    notification_email: '',
    enable_activity_logs: true,
  });
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showPayloadModal, setShowPayloadModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Partial<Agent> | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  
  const supabase = getSupabaseClient();

  useEffect(() => {
    fetchSettings();
    fetchAgents();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('*');

      if (error) {
        console.error('Erro ao buscar configurações:', error);
        return;
      }

      const settingsObj: any = { ...settings };
      data?.forEach((setting: SystemSetting) => {
        try {
          // Parse do valor JSONB
          const parsedValue = JSON.parse(setting.value);
          settingsObj[setting.key] = parsedValue;
        } catch (error) {
          // Fallback para valores que não são JSON válidos
          settingsObj[setting.key] = setting.value;
        }
      });
      
      setSettings(settingsObj);
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar agentes:', error);
        return;
      }

      setAgents(data || []);
    } catch (error) {
      console.error('Erro ao buscar agentes:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        key,
        value: JSON.stringify(value),
        description: getSettingDescription(key)
      }));

      const { error: deleteError } = await supabase
        .from('system_settings')
        .delete()
        .neq('key', 'non_existent_key');

      if (deleteError) {
        console.error('Erro ao deletar configurações:', deleteError);
        alert('Erro ao salvar configurações');
        return;
      }

      const { error: insertError } = await supabase
        .from('system_settings')
        .insert(settingsArray);

      if (insertError) {
        console.error('Erro ao inserir configurações:', insertError);
        alert('Erro ao salvar configurações');
        return;
      }

      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const saveAgent = async () => {
    if (!editingAgent?.name) {
      alert('Nome do agente é obrigatório');
      return;
    }

    try {
      setSaving(true);
      
      if (editingAgent.id) {
        // Atualizar agente existente
        const { error } = await supabase
          .from('agents')
          .update({
            name: editingAgent.name,
            description: editingAgent.description || '',
            avatar_url: editingAgent.avatar_url || '',
            system_prompt: editingAgent.system_prompt || '',
            payload: editingAgent.payload || {},
            is_active: editingAgent.is_active ?? true,
            agent_type: editingAgent.agent_type || 'geral'
          })
          .eq('id', editingAgent.id);

        if (error) {
          console.error('Erro ao atualizar agente:', error);
          alert('Erro ao salvar agente');
          return;
        }
      } else {
        // Criar novo agente
        const { error } = await supabase
          .from('agents')
          .insert({
            name: editingAgent.name,
            description: editingAgent.description || '',
            avatar_url: editingAgent.avatar_url || '',
            system_prompt: editingAgent.system_prompt || '',
            payload: editingAgent.payload || {},
            is_active: editingAgent.is_active ?? true,
            agent_type: editingAgent.agent_type || 'geral'
          });

        if (error) {
          console.error('Erro ao criar agente:', error);
          alert('Erro ao criar agente');
          return;
        }
      }

      alert('Agente salvo com sucesso!');
      setShowAgentModal(false);
      setEditingAgent(null);
      fetchAgents();
    } catch (error) {
      console.error('Erro ao salvar agente:', error);
      alert('Erro ao salvar agente');
    } finally {
      setSaving(false);
    }
  };

  const deleteAgent = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este agente?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar agente:', error);
        alert('Erro ao deletar agente');
        return;
      }

      alert('Agente deletado com sucesso!');
      fetchAgents();
    } catch (error) {
      console.error('Erro ao deletar agente:', error);
      alert('Erro ao deletar agente');
    }
  };

  const updateAgentPayload = async () => {
    if (!selectedAgent) return;

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('agents')
        .update({ payload: selectedAgent.payload })
        .eq('id', selectedAgent.id);

      if (error) {
        console.error('Erro ao atualizar payload:', error);
        alert('Erro ao salvar payload');
        return;
      }

      alert('Payload atualizado com sucesso!');
      setShowPayloadModal(false);
      fetchAgents();
    } catch (error) {
      console.error('Erro ao atualizar payload:', error);
      alert('Erro ao salvar payload');
    } finally {
      setSaving(false);
    }
  };

  const testWebhook = async () => {
    if (!settings.n8n_webhook_url) {
      alert('Por favor, configure a URL do webhook primeiro');
      return;
    }

    try {
      setTestingWebhook(true);
      
      const testPayload = {
        type: 'test',
        message: 'Teste de conexão do webhook',
        agentId: 'geral',
        conversationId: 'test-conversation-' + Date.now(),
        userId: 'test-user-' + Date.now(),
        timestamp: new Date().toISOString(),
        source: 'O Inspetor - Configurações',
        attachments: [],
        sender_type: 'User'
      };

      console.log('Testando webhook com payload:', testPayload);
      console.log('URL do webhook:', settings.n8n_webhook_url);

      const response = await fetch(settings.n8n_webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(settings.n8n_webhook_secret && {
            'Authorization': `Bearer ${settings.n8n_webhook_secret}`
          })
        },
        body: JSON.stringify(testPayload)
      });

      console.log('Resposta do webhook:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (response.ok) {
        const responseData = await response.text();
        console.log('Dados da resposta:', responseData);
        alert('✅ Webhook testado com sucesso! Conexão estabelecida.');
      } else {
        const errorData = await response.text().catch(() => 'Sem dados de erro');
        console.error('Erro do webhook:', errorData);
        alert(`❌ Erro no webhook: ${response.status} - ${response.statusText}\n\nDetalhes: ${errorData}`);
      }
    } catch (error) {
      console.error('Erro ao testar webhook:', error);
      alert(`❌ Erro ao conectar com o webhook: ${error.message}\n\nVerifique a URL e tente novamente.`);
    } finally {
      setTestingWebhook(false);
    }
  };

  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      n8n_webhook_url: 'URL do webhook do n8n para integração',
      n8n_webhook_secret: 'Token de segurança para autenticação do webhook',
      system_name: 'Nome do sistema exibido na interface',
      maintenance_mode: 'Ativar modo de manutenção',
      max_conversations_per_user: 'Máximo de conversas por usuário',
      session_timeout_minutes: 'Tempo limite da sessão em minutos',
      enable_user_registration: 'Permitir registro de novos usuários',
      require_email_verification: 'Exigir verificação de email',
      notification_email: 'Email para notificações do sistema',
      enable_activity_logs: 'Habilitar logs de atividade'
    };
    return descriptions[key] || 'Configuração do sistema';
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
      alert('Erro ao copiar para a área de transferência');
    }
  };



  const handleInputChange = (key: keyof SettingsForm, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const openAgentModal = (agent?: Agent) => {
    if (agent) {
      setEditingAgent(agent);
    } else {
      setEditingAgent({
        name: '',
        description: '',
        avatar_url: '',
        system_prompt: '',
        payload: {},
        is_active: true
      });
    }
    setShowAgentModal(true);
  };

  const openPayloadModal = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowPayloadModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `agents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Erro ao fazer upload:', uploadError);
        alert('Erro ao fazer upload da imagem');
        return;
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setEditingAgent(prev => ({ ...prev, avatar_url: data.publicUrl }));
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload da imagem');
    } finally {
      setUploadingImage(false);
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
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('system')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'system'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Settings className="h-4 w-4 inline mr-2" />
            Sistema
          </button>
          <button
            onClick={() => setActiveTab('agents')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'agents'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Agentes
          </button>
          <button
            onClick={() => setActiveTab('payloads')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'payloads'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Code className="h-4 w-4 inline mr-2" />
            Payloads
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'api'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Key className="h-4 w-4 inline mr-2" />
            API
          </button>
        </nav>
      </div>

      {/* System Tab */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4" />
              ) : (
                <Save className="-ml-1 mr-2 h-4 w-4" />
              )}
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>

          {/* Webhook Settings */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <Webhook className="h-5 w-5 text-purple-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Integração n8n</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL do Webhook
                </label>
                <input
                  type="url"
                  value={settings.n8n_webhook_url}
                  onChange={(e) => handleInputChange('n8n_webhook_url', e.target.value)}
                  placeholder="https://seu-n8n.com/webhook/seu-webhook-id"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL do webhook do n8n para receber eventos do sistema
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Token de Segurança (Opcional)
                </label>
                <input
                  type="password"
                  value={settings.n8n_webhook_secret}
                  onChange={(e) => handleInputChange('n8n_webhook_secret', e.target.value)}
                  placeholder="Token para autenticação"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Token opcional para autenticação do webhook
                </p>
              </div>
              
              <div className="pt-4">
                <button
                  onClick={testWebhook}
                  disabled={testingWebhook || !settings.n8n_webhook_url}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {testingWebhook ? (
                    <RefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  ) : (
                    <Webhook className="-ml-1 mr-2 h-4 w-4" />
                  )}
                  {testingWebhook ? 'Testando...' : 'Testar Webhook'}
                </button>
              </div>
            </div>
          </div>

          {/* System Settings */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <Settings className="h-5 w-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Configurações Gerais</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Sistema
                  </label>
                  <input
                    type="text"
                    value={settings.system_name}
                    onChange={(e) => handleInputChange('system_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Máx. Conversas por Usuário
                  </label>
                  <input
                    type="number"
                    value={settings.max_conversations_per_user}
                    onChange={(e) => handleInputChange('max_conversations_per_user', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timeout da Sessão (minutos)
                  </label>
                  <input
                    type="number"
                    value={settings.session_timeout_minutes}
                    onChange={(e) => handleInputChange('session_timeout_minutes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email para Notificações
                  </label>
                  <input
                    type="email"
                    value={settings.notification_email}
                    onChange={(e) => handleInputChange('notification_email', e.target.value)}
                    placeholder="admin@exemplo.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="space-y-3 pt-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="maintenance_mode"
                    checked={settings.maintenance_mode}
                    onChange={(e) => handleInputChange('maintenance_mode', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="maintenance_mode" className="ml-2 block text-sm text-gray-900">
                    Modo de Manutenção
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enable_user_registration"
                    checked={settings.enable_user_registration}
                    onChange={(e) => handleInputChange('enable_user_registration', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enable_user_registration" className="ml-2 block text-sm text-gray-900">
                    Permitir Registro de Usuários
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="require_email_verification"
                    checked={settings.require_email_verification}
                    onChange={(e) => handleInputChange('require_email_verification', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="require_email_verification" className="ml-2 block text-sm text-gray-900">
                    Exigir Verificação de Email
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enable_activity_logs"
                    checked={settings.enable_activity_logs}
                    onChange={(e) => handleInputChange('enable_activity_logs', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enable_activity_logs" className="ml-2 block text-sm text-gray-900">
                    Habilitar Logs de Atividade
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Database Info */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <Database className="h-5 w-5 text-green-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Informações do Sistema</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Database className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">Banco de Dados</p>
                  <p className="text-xs text-gray-500">Supabase PostgreSQL</p>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Shield className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">Autenticação</p>
                  <p className="text-xs text-gray-500">Supabase Auth</p>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Webhook className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">Integração</p>
                  <p className="text-xs text-gray-500">n8n Webhook</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agents Tab */}
      {activeTab === 'agents' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Gerenciar Agentes</h2>
            <button
              onClick={() => openAgentModal()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="-ml-1 mr-2 h-4 w-4" />
              Novo Agente
            </button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Criado em
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {agents.map((agent) => (
                    <tr key={agent.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {agent.avatar_url ? (
                              <img className="h-10 w-10 rounded-full" src={agent.avatar_url} alt={agent.name} />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <Users className="h-5 w-5 text-gray-600" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">{agent.description || 'Sem descrição'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          agent.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {agent.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(agent.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => openPayloadModal(agent)}
                            className="text-purple-600 hover:text-purple-900"
                            title="Editar Payload"
                          >
                            <Code className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openAgentModal(agent)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteAgent(agent.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Deletar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {agents.length === 0 && (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum agente encontrado</h3>
                <p className="mt-1 text-sm text-gray-500">Comece criando um novo agente.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payloads Tab */}
      {activeTab === 'payloads' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Payloads dos Agentes</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <div key={agent.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  {agent.avatar_url ? (
                    <img className="h-8 w-8 rounded-full mr-3" src={agent.avatar_url} alt={agent.name} />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                      <Users className="h-4 w-4 text-gray-600" />
                    </div>
                  )}
                  <h3 className="text-lg font-medium text-gray-900">{agent.name}</h3>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Payload atual:</p>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto max-h-32">
                    {JSON.stringify(agent.payload, null, 2)}
                  </pre>
                </div>
                
                <button
                  onClick={() => openPayloadModal(agent)}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <Code className="-ml-1 mr-2 h-4 w-4" />
                  Editar Payload
                </button>
              </div>
            ))}
          </div>
          
          {agents.length === 0 && (
            <div className="text-center py-12">
              <Code className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum agente encontrado</h3>
              <p className="mt-1 text-sm text-gray-500">Crie agentes na aba "Agentes" para gerenciar seus payloads.</p>
            </div>
          )}
        </div>
      )}

      {/* Agent Modal */}
      {showAgentModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingAgent?.id ? 'Editar Agente' : 'Novo Agente'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={editingAgent?.name || ''}
                    onChange={(e) => setEditingAgent(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome do agente"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={editingAgent?.description || ''}
                    onChange={(e) => setEditingAgent(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Descrição do agente"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Foto do Agente
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {uploadingImage && (
                    <div className="mt-2 flex items-center text-sm text-blue-600">
                      <Upload className="animate-spin h-4 w-4 mr-2" />
                      Fazendo upload...
                    </div>
                  )}
                  {editingAgent?.avatar_url && (
                    <div className="mt-2">
                      <img 
                        src={editingAgent.avatar_url} 
                        alt="Preview" 
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo do Agente *
                  </label>
                  <select
                    value={editingAgent?.agent_type || 'geral'}
                    onChange={(e) => setEditingAgent(prev => ({ ...prev, agent_type: e.target.value as 'advogado' | 'contador' | 'consultor' | 'geral' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="geral">Geral</option>
                    <option value="advogado">Advogado</option>
                    <option value="contador">Contador</option>
                    <option value="consultor">Consultor</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="agent_is_active"
                    checked={editingAgent?.is_active ?? true}
                    onChange={(e) => setEditingAgent(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="agent_is_active" className="ml-2 block text-sm text-gray-900">
                    Agente ativo
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAgentModal(false);
                    setEditingAgent(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveAgent}
                  disabled={saving}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payload Modal */}
      {showPayloadModal && selectedAgent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-3/4 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Editar Payload - {selectedAgent.name}
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payload JSON
                </label>
                <textarea
                  value={JSON.stringify(selectedAgent.payload, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setSelectedAgent(prev => ({ ...prev!, payload: parsed }));
                    } catch (error) {
                      // Ignore invalid JSON while typing
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={20}
                  placeholder='{ "key": "value" }'
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formato JSON válido. Este payload será enviado durante as conversas com este agente.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowPayloadModal(false);
                    setSelectedAgent(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancelar
                </button>
                <button
                  onClick={updateAgentPayload}
                  disabled={saving}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar Payload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Tab */}
      {activeTab === 'api' && (
        <div className="space-y-6">
          {/* API Configuration */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <Key className="h-5 w-5 text-green-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Configurações de API</h2>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                URLs e tokens necessários para integração com N8N e outros serviços
              </p>
            </div>
            <div className="p-6 space-y-6">
              
              {/* Webhook URLs */}
              <div className="space-y-4">
                <h3 className="text-md font-medium text-gray-900 flex items-center">
                  <Webhook className="h-4 w-4 mr-2 text-purple-600" />
                  URLs de Webhook
                </h3>
                
                {/* Webhook de Entrada (N8N para Inspetor) */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Webhook de Entrada (N8N → Inspetor)
                    </label>
                    <button
                      onClick={() => copyToClipboard('http://localhost:3000/api/webhook/n8n', 'webhook-entrada')}
                      className="flex items-center text-xs text-blue-600 hover:text-blue-800"
                    >
                      {copiedField === 'webhook-entrada' ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      {copiedField === 'webhook-entrada' ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <div className="bg-white p-3 rounded border font-mono text-sm text-gray-800">
                    http://localhost:3000/api/webhook/n8n
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Use esta URL no N8N para enviar mensagens para o Inspetor
                  </p>
                </div>

                {/* Webhook de Resposta (Inspetor para N8N) */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Webhook de Resposta (Inspetor → N8N)
                    </label>
                    <button
                      onClick={() => copyToClipboard('http://localhost:3000/api/webhook/n8n-response', 'webhook-resposta')}
                      className="flex items-center text-xs text-blue-600 hover:text-blue-800"
                    >
                      {copiedField === 'webhook-resposta' ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      {copiedField === 'webhook-resposta' ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <div className="bg-white p-3 rounded border font-mono text-sm text-gray-800">
                    http://localhost:3000/api/webhook/n8n-response
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Configure esta URL no N8N para receber respostas do Inspetor
                  </p>
                </div>
              </div>

              {/* Authentication Tokens */}
              <div className="space-y-4">
                <h3 className="text-md font-medium text-gray-900 flex items-center">
                  <Shield className="h-4 w-4 mr-2 text-red-600" />
                  Tokens de Autenticação
                </h3>
                
                {/* Token do Webhook N8N */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Token do Webhook N8N
                    </label>
                    <button
                      onClick={() => copyToClipboard(settings.n8n_webhook_secret || 'your-webhook-secret', 'n8n-token')}
                      className="flex items-center text-xs text-blue-600 hover:text-blue-800"
                    >
                      {copiedField === 'n8n-token' ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      {copiedField === 'n8n-token' ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <div className="bg-white p-3 rounded border font-mono text-sm text-gray-800">
                    {settings.n8n_webhook_secret || 'your-webhook-secret'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Use este token como Bearer Token no cabeçalho Authorization do N8N
                  </p>
                </div>
              </div>

              {/* Payload Examples */}
              <div className="space-y-4">
                <h3 className="text-md font-medium text-gray-900 flex items-center">
                  <Code className="h-4 w-4 mr-2 text-blue-600" />
                  Exemplos de Payload
                </h3>
                
                {/* Payload de Entrada */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Payload de Entrada (N8N → Inspetor)
                    </label>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify({
                        message: "Sua mensagem aqui",
                        agentId: "geral",
                        conversationId: "uuid-da-conversa",
                        userId: "uuid-do-usuario",
                        attachments: [],
                        sender_type: "User"
                      }, null, 2), 'payload-entrada')}
                      className="flex items-center text-xs text-blue-600 hover:text-blue-800"
                    >
                      {copiedField === 'payload-entrada' ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      {copiedField === 'payload-entrada' ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <pre className="bg-white p-3 rounded border text-xs text-gray-800 overflow-x-auto">
{JSON.stringify({
  message: "Sua mensagem aqui",
  agentId: "geral",
  conversationId: "uuid-da-conversa",
  userId: "uuid-do-usuario",
  attachments: [],
  sender_type: "User"
}, null, 2)}
                  </pre>
                </div>

                {/* Payload de Resposta */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Payload de Resposta (Inspetor → N8N)
                    </label>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify({
                        conversation_id: "uuid-da-conversa",
                        agent_response: "Resposta do agente",
                        agent_name: "Inspetor"
                      }, null, 2), 'payload-resposta')}
                      className="flex items-center text-xs text-blue-600 hover:text-blue-800"
                    >
                      {copiedField === 'payload-resposta' ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      {copiedField === 'payload-resposta' ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <pre className="bg-white p-3 rounded border text-xs text-gray-800 overflow-x-auto">
{JSON.stringify({
  conversation_id: "uuid-da-conversa",
  agent_response: "Resposta do agente",
  agent_name: "Inspetor"
}, null, 2)}
                  </pre>
                  <p className="text-xs text-gray-500 mt-1">
                    ⚠️ <strong>Importante:</strong> O payload deve ser um objeto, não um array
                  </p>
                </div>
              </div>

              {/* Configuration Instructions */}
              <div className="space-y-4">
                <h3 className="text-md font-medium text-gray-900 flex items-center">
                  <ExternalLink className="h-4 w-4 mr-2 text-orange-600" />
                  Instruções de Configuração
                </h3>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Configuração do N8N - HTTP Request Node</h4>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• <strong>Método:</strong> POST</li>
                    <li>• <strong>URL:</strong> http://localhost:3000/api/webhook/n8n-response</li>
                    <li>• <strong>Authentication:</strong> Send Headers</li>
                    <li>• <strong>Header Name:</strong> Authorization</li>
                    <li>• <strong>Header Value:</strong> Bearer {settings.n8n_webhook_secret || 'your-webhook-secret'}</li>
                    <li>• <strong>Body Content Type:</strong> JSON</li>
                    <li>• <strong>Body:</strong> Use o payload de resposta acima</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-yellow-900 mb-2">⚠️ Pontos Importantes</h4>
                  <ul className="text-xs text-yellow-800 space-y-1">
                    <li>• O <code>conversation_id</code> deve ser um UUID válido</li>
                    <li>• O campo <code>agent_name</code> é obrigatório</li>
                    <li>• O payload deve ser um objeto, não um array</li>
                    <li>• Use IPv4 (localhost ou 127.0.0.1) em vez de IPv6</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}