# 📁 Estrutura do Projeto Refatorado

## Arquitetura Modular

O projeto foi refatorado para seguir princípios SOLID e de separação de responsabilidades.

```
maestro-lint/
├── src/
│   ├── constants.js        # Constantes e configurações
│   ├── helpers.js          # Funções auxiliares (line number, platform validation, etc)
│   └── validators.js       # Funções de validação de YAML
├── maestro-linter.js       # Orquestrador principal
├── package.json
└── README.md
```

## Responsabilidades

### `src/constants.js`

Contém todas as constantes e configurações do linter:

- `TAG_ONE_OF` - Tags válidas (smoke, functional)
- `VALID_PROPERTIES` - Propriedades válidas no cabeçalho
- `VALID_COMMANDS` - Comandos Maestro válidos
- `WHEN_PROPERTIES` - Propriedades válidas em 'when'
- `VALID_PLATFORMS` - Plataformas válidas (android, ios, web)
- `COMMAND_PROPERTIES` - Schema de propriedades para cada comando

**Benefício:** Fácil atualizar configurações sem tocar na lógica

### `src/helpers.js`

Funções auxiliares reutilizáveis:

- `getLineInfo(lineNumber)` - Formata informação de linha
- `isValidPlatform(platform)` - Valida plataformas
- `extractFlowPath(step)` - Extrai caminho de flow
- `findLineNumber(text, searchTerm, context, occurrence)` - Encontra linha exata

**Benefício:** Funções puras e testáveis, sem dependências de validação

### `src/validators.js`

Funções de validação específicas:

- `validateCommandProperties()` - Valida propriedades de um comando
- `validateWhenProperty()` - Valida estrutura 'when'
- `validateCommands()` - Valida array de comandos

**Benefício:** Lógica de validação isolada e reutilizável

### `maestro-linter.js`

Orquestrador principal:

- `lintFile(filePath)` - Valida um arquivo YAML
- `getFilesToLint(specificPath)` - Obtém lista de arquivos
- `displayFileResult()` - Exibe resultado de um arquivo
- `displayResults()` - Exibe resumo final
- `main()` - Função principal

**Benefício:** Código limpo, focado em orquestração e I/O

## Fluxo de Execução

```
main()
  ↓
getFilesToLint(specificPath) → lista de arquivos
  ↓
Para cada arquivo:
  lintFile(file)
    ↓
    → parseYAML
    → validateProperties (utiliza constants)
    → validateTags (utiliza constants)
    → validateName (utiliza constants)
    → validateOnFlowStart (utiliza helpers)
    → validateOnFlowComplete (utiliza helpers)
    → validateCommands (utiliza validators)
      ├→ validateCommandProperties
      └→ validateWhenProperty (utiliza validators e helpers)
  ↓
displayFileResult()
  ↓
displayResults()
```

## Benefícios da Refatoração

### 1. **Separação de Responsabilidades**

- Constants → Dados
- Helpers → Utilitários
- Validators → Lógica de validação
- Linter principal → Orquestração

### 2. **Testabilidade**

- Cada módulo pode ser testado independentemente
- Funções puras sem efeitos colaterais
- Fácil mockar dependências

### 3. **Manutenibilidade**

- Adicionar novo comando? Atualize apenas `constants.js`
- Adicionar nova validação? Crie função em `validators.js`
- Adicionar novo helper? Vá para `helpers.js`

### 4. **Reutilização**

- Helpers podem ser usados em outros projetos
- Validators podem ser reutilizados
- Constants centrlizadas

### 5. **Escalabilidade**

- Fácil adicionar novas plataformas
- Fácil adicionar novos comandos
- Fácil adicionar novas validações

## Como Usar

```bash
# Validar todos os testes
npm run lint

# Validar pasta específica
npm run lint:file ../workspace/tests/cartoes

# Validar arquivo específico
npm run lint:file ../workspace/tests/cartoes/cartoes-home-smoke-test.yaml
```

## Próximas Melhorias Sugeridas

- [ ] Adicionar testes unitários para cada módulo
- [ ] Criar arquivo de configuração `.linterrc.json`
- [ ] Adicionar suporte a plugins/extensões
- [ ] Adicionar relatórios em JSON/HTML
- [ ] Adicionar ignore patterns (`.linterignore`)
