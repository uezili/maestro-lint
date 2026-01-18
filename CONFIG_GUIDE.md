# 🎨 Sistema de Configuração Customizável - Guia Completo

## 📚 O que foi implementado?

O Maestro Linter agora suporta configuração totalmente customizável através de arquivos JSON. Você pode habilitar/desabilitar regras e customizar mensagens e parâmetros.

## 🗂️ Arquivos Criados

### 1. `config.lint.json` - Configuração Padrão
Arquivo de configuração principal com as regras padrão.

### 2. `config.lint.example.json` - Exemplo de Customização
Exemplo mostrando como customizar regras (desabilita setup/teardown, adiciona tag "regression").

### 3. `src/configLoader.js` - Carregador de Configuração
Módulo responsável por:
- Carregar arquivo de configuração
- Mesclar com configuração padrão
- Fornecer funções auxiliares (`isRuleEnabled`, `getRuleConfig`)

### 4. `src/constants.js` - Constantes Dinâmicas
Modificado para suportar constantes baseadas em configuração através da função `getConstants()`.

## 🎯 Regras Configuráveis

| Regra | Pode Habilitar/Desabilitar | Personalizações Disponíveis |
|-------|---------------------------|----------------------------|
| `requiredTags` | ✅ | Tags permitidas, mensagem customizada |
| `validProperties` | ✅ | Lista de propriedades válidas |
| `requiredAppId` | ✅ | Mensagem customizada |
| `requiredSetup` | ✅ | Arquivo esperado, mensagem customizada |
| `requiredTeardown` | ✅ | Arquivo esperado, mensagem customizada |
| `validateCommands` | ✅ | - |
| `validateFilePaths` | ✅ | - |

## 💡 Exemplos de Uso

### Exemplo 1: Desabilitar validação de setup/teardown

```json
{
  "rules": {
    "requiredSetup": {
      "enabled": false
    },
    "requiredTeardown": {
      "enabled": false
    }
  }
}
```

### Exemplo 2: Adicionar nova tag válida

```json
{
  "rules": {
    "requiredTags": {
      "enabled": true,
      "allowedTags": ["smoke", "functional", "regression", "integration"],
      "message": "Use uma tag válida: smoke, functional, regression ou integration"
    }
  }
}
```

### Exemplo 3: Permitir propriedade "name" no cabeçalho

```json
{
  "rules": {
    "validProperties": {
      "enabled": true,
      "properties": ["appId", "tags", "onFlowStart", "onFlowComplete", "env", "name"]
    }
  }
}
```

### Exemplo 4: Customizar mensagens de erro

```json
{
  "rules": {
    "requiredAppId": {
      "enabled": true,
      "message": "🚨 ERRO: O campo appId é obrigatório em todos os testes!"
    }
  }
}
```

## 📍 Locais de Busca

O linter procura configuração nesta ordem:

1. Parâmetro fornecido (futuro)
2. `./config.lint.json` (diretório atual)
3. `./.maestro-lint.json` (diretório atual)
4. Configuração padrão embutida

## 🧪 Como Testar

### Teste 1: Com configuração padrão
```bash
# Remove config customizada
rm config.lint.json

# Executa com configuração padrão (todas as regras habilitadas)
node maestro-linter.js workspace/tests/tests/test-simple.yaml
```

### Teste 2: Com configuração customizada
```bash
# Copia exemplo que desabilita setup/teardown
cp config.lint.example.json config.lint.json

# Executa com configuração customizada
node maestro-linter.js workspace/tests/tests/test-simple.yaml
```

### Teste 3: Verificar configuração carregada
```bash
node -e "const c = require('./src/configLoader'); console.log(JSON.stringify(c.loadConfig(), null, 2))"
```

## 🔧 Como Adicionar Nova Regra

1. **Adicionar regra ao config.lint.json**:
```json
{
  "rules": {
    "minhaNovaRegra": {
      "enabled": true,
      "parametro1": "valor",
      "message": "Mensagem de erro"
    }
  }
}
```

2. **Implementar validação no maestro-linter.js**:
```javascript
if (isRuleEnabled(config, 'minhaNovaRegra')) {
  const ruleConfig = getRuleConfig(config, 'minhaNovaRegra');
  const parametro = ruleConfig?.parametro1;
  
  // Sua lógica de validação
  if (/* condição */) {
    errors.push(ruleConfig?.message || 'Erro padrão');
  }
}
```

## 📊 Benefícios

✅ **Flexibilidade**: Cada time pode configurar suas próprias regras  
✅ **Sem código**: Mudanças não requerem alteração de código  
✅ **Compatibilidade**: Configuração antiga continua funcionando  
✅ **Mensagens personalizadas**: Erros mais claros e específicos  
✅ **Iteração rápida**: Habilitar/desabilitar regras instantaneamente  

## 🚀 Próximos Passos

- [ ] Adicionar validação de schema do config.lint.json
- [ ] Permitir carregar config via parâmetro CLI (`--config=path`)
- [ ] Adicionar mais regras configuráveis
- [ ] Criar wizard para gerar configuração interativa
- [ ] Adicionar suporte a perfis (dev, prod, ci)
