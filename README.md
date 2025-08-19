# O Inspetor - Roteador Inteligente de Agentes IA

Um sistema inteligente que roteia conversas para agentes especializados (Advogado, Contador, Consultor) usando Next.js 14, Supabase e N8N.

## 🚀 Funcionalidades

- **Roteamento Inteligente**: Direciona mensagens para agentes especializados
- **Autenticação Segura**: Sistema completo de login/registro com Supabase
- **Chat em Tempo Real**: Interface moderna de chat com histórico
- **Persistência de Dados**: Conversas e mensagens salvas no Supabase
- **Integração N8N**: Processamento de mensagens via webhooks
- **UI Responsiva**: Interface moderna com Tailwind CSS

## 🛠️ Tecnologias

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **Estado**: Zustand
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **Automação**: N8N
- **IA**: OpenAI GPT-4 (via N8N)

## 📋 Pré-requisitos

- Node.js 18+ 
- Conta no Supabase
- Instância do N8N
- Chave da API OpenAI

## 🔧 Instalação

### 1. Clone o repositório
```bash
git clone https://github.com/adriannoferreira/inspetor.git
cd inspetor
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
```bash
cp .env.example .env.local
```

Edite o arquivo `.env.local` com suas configurações:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_supabase

# N8N Webhook Configuration
N8N_WEBHOOK_URL=https://sua-instancia-n8n.com/webhook/chat
N8N_WEBHOOK_SECRET=sua_chave_secreta_webhook

# Next.js Configuration
NEXTAUTH_SECRET=sua_chave_secreta_nextauth
NEXTAUTH_URL=http://localhost:3000
```

### 4. Configure o banco de dados Supabase

1. Acesse seu projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá para **SQL Editor**
3. Execute o script `supabase-schema.sql` para criar as tabelas e políticas RLS

### 5. Configure o N8N

1. Importe o workflow `n8n-workflow.json` na sua instância N8N
2. Configure as credenciais da OpenAI
3. Ajuste as variáveis de ambiente no N8N:
   - `NEXT_APP_URL`: URL da sua aplicação Next.js
   - `N8N_WEBHOOK_SECRET`: Mesma chave configurada no .env.local

### 6. Execute o projeto
```bash
npm run dev
```

Acesse http://localhost:3000

## 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/          # Página de login
│   │   └── register/       # Página de registro
│   ├── api/
│   │   ├── chat/send/      # API para enviar mensagens
│   │   ├── conversations/  # API para listar conversas
│   │   └── webhook/n8n/    # Webhook para receber respostas do N8N
│   ├── dashboard/          # Página principal do chat
│   └── layout.tsx          # Layout raiz
├── components/
│   ├── agents/             # Componentes dos agentes
│   ├── chat/               # Componentes do chat
│   └── ui/                 # Componentes UI reutilizáveis
├── lib/
│   ├── supabase.ts         # Configuração do Supabase
│   ├── types.ts            # Tipos TypeScript
│   └── utils.ts            # Funções utilitárias
├── stores/
│   └── chatStore.ts        # Store Zustand para estado do chat
└── middleware.ts           # Middleware de autenticação
```

## 🎯 Agentes Disponíveis

### 👨‍⚖️ Advogado
- Especialista em direito empresarial e trabalhista
- Respostas baseadas na legislação brasileira
- Cita leis relevantes quando aplicável

### 👨‍💼 Contador
- Especialista em contabilidade empresarial e fiscal
- Respostas técnicas baseadas nas normas contábeis brasileiras
- Menciona regulamentações relevantes

### 👨‍💻 Consultor
- Especialista em estratégia e gestão empresarial
- Foco em resultados e insights acionáveis
- Orientações práticas para desenvolvimento de negócios

### 🤖 Assistente Geral
- Assistente para questões gerais
- Sugere agentes especializados quando apropriado

## 🔐 Segurança

- **Row Level Security (RLS)**: Políticas de segurança no Supabase
- **Autenticação JWT**: Tokens seguros via Supabase Auth
- **Middleware de Proteção**: Rotas protegidas automaticamente
- **Validação de Webhooks**: Chave secreta para validar requisições N8N

## 🚀 Deploy

### Vercel (Recomendado)

1. **Fork o repositório** no GitHub
2. **Conecte ao Vercel**:
   - Acesse [vercel.com](https://vercel.com)
   - Conecte sua conta GitHub
   - Importe o repositório `inspetor`
3. **Configure as variáveis de ambiente**:
   - Copie todas as variáveis do `.env.example`
   - Configure com seus valores reais do Supabase
   - Atualize `NEXTAUTH_URL` para sua URL de produção
4. **Deploy automático** - Vercel fará o build e deploy

### Railway

1. Conecte seu repositório ao Railway
2. Configure as variáveis de ambiente
3. Railway detectará automaticamente o Next.js

### Netlify

1. Conecte seu repositório ao Netlify
2. Configure build command: `npm run build`
3. Configure publish directory: `.next`
4. Configure as variáveis de ambiente

### Configurações Importantes para Produção

- **Supabase**: Adicione sua URL de produção nas "Site URL" permitidas
- **N8N**: Atualize a URL do webhook para o domínio de produção
- **CORS**: Verifique as configurações de CORS nas APIs
- **Autenticação**: Configure os provedores de auth no Supabase para produção

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🆘 Suporte

Se você encontrar algum problema ou tiver dúvidas:

1. Verifique se todas as variáveis de ambiente estão configuradas
2. Confirme se o banco de dados Supabase foi configurado corretamente
3. Teste se o webhook N8N está respondendo
4. Abra uma issue no repositório

## ✨ Funcionalidades Recentes

- [x] **Dashboard de Configurações**: Aba dedicada para configurações de API
- [x] **Documentação Integrada**: Exemplos de payload e instruções de configuração
- [x] **Webhook N8N Melhorado**: Validação de UUID e tratamento de erros
- [x] **Interface de Administração**: Gerenciamento de agentes e configurações
- [x] **Testes de Conectividade**: Botão para testar webhook N8N

## 🔄 Próximas Funcionalidades

- [ ] Notificações em tempo real
- [ ] Upload de arquivos
- [ ] Histórico de conversas com busca
- [ ] Temas personalizáveis
- [ ] Dashboard de analytics
- [ ] Integração com mais plataformas de IA
- [ ] Sistema de backup automático
