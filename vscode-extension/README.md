# 🎯 Maestro Lint - VSCode Extension

Extensão VSCode para validação em tempo real de arquivos de teste Maestro (YAML).

## ✨ Recursos

- 🔴 **Diagnósticos em tempo real** — erros aparecem no painel PROBLEMS e inline no código
- 🔧 **Quick Fix** — correções automáticas para erros de case-sensitivity e typos
- ⚙️ **Configurável** — respeita o `linter.config.json` do projeto
- 🔄 **Validação ao digitar** — feedback instantâneo com debounce configurável
- 📁 **Validação de workspace** — valide todos os arquivos de uma vez

## 📋 Validações

| Tipo | Descrição | Severidade Padrão |
|------|-----------|-------------------|
| Case-Sensitivity | `onFlowstart` → `onFlowStart` | ❌ Error |
| Comando Inválido | Comando não reconhecido + sugestão | ❌ Error |
| Propriedade Inválida | Propriedade não válida para o comando | ❌ Error |
| Indentação When | Indentação incorreta em blocos when | ⚠️ Warning |
| Arquivo Não Encontrado | Path de runFlow/runScript inexistente | ❌ Error |
| Valor Vazio | Comando com valor vazio | ⚠️ Warning |
| addMedia | Extensão/path inválido | ❌ Error |
| setPermissions | Permissão/valor inválido | ❌ Error |

## 🚀 Como Usar

1. Instale a extensão
2. Abra um projeto com arquivos `.yaml` de teste Maestro
3. Os diagnósticos aparecem automaticamente no painel **PROBLEMS**
4. Use `Ctrl+.` para ver **Quick Fixes** disponíveis

## ⚙️ Configurações

| Configuração | Padrão | Descrição |
|---|---|---|
| `maestroLint.enable` | `true` | Habilita/desabilita o linter |
| `maestroLint.configPath` | `linter.config.json` | Caminho para o arquivo de config |
| `maestroLint.validateOnSave` | `true` | Validar ao salvar |
| `maestroLint.validateOnType` | `true` | Validar em tempo real |
| `maestroLint.debounceDelay` | `500` | Delay em ms para validação on-type |
| `maestroLint.filePattern` | `**/*.yaml` | Glob pattern dos arquivos |

## 🛠️ Comandos

- **Maestro Lint: Validar Arquivo Atual** — Valida o arquivo ativo
- **Maestro Lint: Validar Todo o Workspace** — Valida todos os YAML do projeto
- **Maestro Lint: Reiniciar Linter** — Recarrega configuração e revalida
- **Maestro Lint: Mostrar Output** — Abre o canal de output

## 🏗️ Build & Desenvolvimento

```bash
cd vscode-extension
npm install
npm run compile    # Compila TypeScript
npm run watch      # Watch mode
npm run package    # Gera .vsix
```

### Testar localmente

1. Abra a pasta `vscode-extension` no VSCode
2. Pressione `F5` para abrir uma instância de debug
3. Na instância de debug, abra um projeto com arquivos Maestro YAML

## 📄 Licença

MIT
