# Configuração do Webhook N8N para O Inspetor

## Problema Identificado

O erro `500 (Internal Server Error)` com a mensagem `"Workflow could not be started!"` indica que o webhook do N8N não está configurado corretamente.

## Solução

### 1. Verificar o Workflow no N8N

1. **Acesse seu N8N**: Vá para o painel do N8N
2. **Verifique se o workflow existe**: Procure pelo workflow que deveria ser acionado pelo webhook
3. **Verifique se o workflow está ativo**: O workflow deve estar com status "Active"

### 2. Configurar o Webhook Node no N8N

1. **Crie um novo workflow** (se não existir)
2. **Adicione um Webhook Node**:
   - Método: `POST`
   - Path: `/webhook/inspetor` (ou o path que você configurou)
   - Response Mode: `Respond to Webhook`

### 3. Estrutura do Payload Esperado

O sistema envia o seguinte payload para o webhook:

```json
{
  "type": "test",
  "message": "Teste de conexão do webhook",
  "agentId": "geral",
  "conversationId": "test-conversation-123",
  "userId": "test-user-123",
  "timestamp": "2025-01-18T10:00:00.000Z",
  "source": "O Inspetor - Configurações",
  "attachments": []
}
```

### 4. Exemplo de Workflow N8N

```json
{
  "nodes": [
    {
      "parameters": {
        "path": "inspetor",
        "responseMode": "responseNode",
        "options": {}
      },
      "id": "webhook-node",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [240, 300]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ { \"success\": true, \"message\": \"Webhook recebido com sucesso\", \"data\": $json } }}"
      },
      "id": "respond-node",
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [460, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Respond to Webhook",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

**⚠️ IMPORTANTE**: Certifique-se de que:
- O **Response Mode** está configurado como `"responseNode"`
- O **typeVersion** do Webhook é `2` (versão mais recente)
- O node **"Respond to Webhook"** está conectado ao Webhook

### 5. Verificações Importantes

1. **URL do Webhook**: Certifique-se de que a URL está correta:
   - Formato: `https://seu-n8n.com/webhook/inspetor`
   - O path deve corresponder ao configurado no Webhook Node

2. **Workflow Ativo**: O workflow deve estar ativo (botão de toggle ligado)

3. **Permissões**: Verifique se o N8N tem permissões para executar o workflow

### 6. Teste Manual

Para testar se o webhook está funcionando:

1. **No N8N**: Use a função "Listen for Test Event" no Webhook Node
2. **No Inspetor**: Clique no botão "Testar Webhook" nas configurações
3. **Verifique os logs**: Tanto no N8N quanto no console do navegador

### 7. Troubleshooting

- **Erro 500**: Workflow não está ativo ou não existe
- **Erro 404**: URL do webhook incorreta
- **Erro 401**: Token de segurança incorreto (se configurado)
- **"Webhook node not correctly configured"**: Configuração incorreta do Response Mode

#### Erro Específico: "Webhook node not correctly configured"

**Problema**: `Set the "Respond" parameter to "Using Respond to Webhook Node" or remove the Respond to Webhook node`

**Solução**:
1. **No Webhook Node**, vá para as configurações
2. **Localize o parâmetro "Response Mode"**
3. **Altere para "Using Respond to Webhook Node"**
4. **Adicione um node "Respond to Webhook"** conectado ao Webhook Node
5. **OU remova qualquer node "Respond to Webhook"** existente se não precisar de resposta

**Configuração Correta**:
- Response Mode: `Using Respond to Webhook Node`
- Conecte um node "Respond to Webhook" após o Webhook Node
- Configure a resposta no node "Respond to Webhook"

### 8. Configuração de Segurança (Opcional)

Se você configurou um token de segurança:

1. **No N8N**: Configure o Webhook Node para verificar o header `Authorization`
2. **No Inspetor**: Configure o "Token de Segurança" nas configurações

## Próximos Passos

1. Verifique a configuração do N8N seguindo este guia
2. Ative o workflow no N8N
3. Teste novamente o webhook no Inspetor
4. Se o problema persistir, verifique os logs do N8N para mais detalhes