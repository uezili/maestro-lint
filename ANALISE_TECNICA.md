# Análise técnica do projeto `maestro-lint`

## 1) Visão geral

O projeto é um linter em Node.js (CommonJS) para validar arquivos YAML de testes Maestro.

Fluxo principal:
1. `maestro-linter.js` recebe caminho/flags da CLI.
2. `FilesManager` resolve arquivos a validar (`fast-glob`).
3. `LintEngine` aplica parsing YAML + validações especializadas.
4. `ResultsPresenter` imprime resultados por arquivo e resumo final.

Pontos positivos:
- Boa separação de responsabilidades por validador (`src/validators/*`).
- Regras configuráveis por severidade via `linter.config.json` (`ConfigManager`).
- Mensagens centralizadas (`src/messages.js`) e estrutura de severidade (`ValidationError`).

---

## 2) Riscos e possíveis bugs identificados

### 2.1 Alta prioridade

1. **`appId` exigido para todos os arquivos (incluindo subflows)**  
   - Arquivo: `src/LintEngine.js` (trecho que verifica `if (!text.includes('appId:'))`).  
   - Risco: arquivos em `/subflows/` normalmente não exigem `appId`, mas atualmente podem ser marcados com erro indevido.

2. **Detecção de `appId` por busca textual (`includes`) pode gerar falso positivo**  
   - Arquivo: `src/LintEngine.js`.  
   - Exemplo: comentário contendo `appId:` pode “passar” na validação sem a propriedade real no header.

3. **Erro de parse em qualquer arquivo pode degradar diagnóstico de comandos**  
   - Arquivo: `src/LintEngine.js` + `src/YamlError.js`.  
   - Risco: fallback por regex tenta recuperar erros, mas pode reportar mensagens menos precisas e com possíveis duplicidades.

### 2.2 Média prioridade

4. **Heurística de linha por `findLineNumber` usa `includes` e pode apontar linha errada**  
   - Arquivo: `src/helpers.js`.  
   - Risco: quando há termos repetidos, comentários ou contexto parcial, a linha reportada pode não ser a correta.

5. **Validação de caminho sem normalização de cenários avançados**  
   - Arquivo: `src/validators/FilePathValidator.js`.  
   - Risco: aceita caminhos relativos fora do workspace esperado (ex.: `../../..`) e não diferencia claramente “fora do projeto” vs “arquivo inexistente”.

6. **Regex de propriedades pode gerar classificação incorreta em casos de YAML complexo**  
   - Arquivo: `src/LintEngine.js` (`_validatePropertiesPattern`).  
   - Risco: parser por regex em texto cru pode confundir blocos e estruturas legítimas.

7. **Performance potencial em arquivos grandes**  
   - Arquivos: `src/LintEngine.js`, `src/helpers.js`.  
   - Risco: múltiplos `split('\n')`, `substring` e cálculo de Levenshtein em loops aumentam custo para arquivos extensos.

### 2.3 Baixa prioridade

8. **Inconsistência de estilo detectada no próprio repositório**  
   - Evidência: `npm run eslint` falha no baseline atual (curly braces, trailing spaces, args não usados).  
   - Risco: dificulta manutenção e revisão.

9. **Configuração carregada uma vez por instância**  
   - Arquivo: `src/ConfigManager.js`.  
   - Risco: em uso de longa duração (não CLI curta), alterações no `linter.config.json` exigem `reload()` explícito.

---

## 3) Melhorias recomendadas (ordem sugerida)

1. **Corrigir regra de `appId` para considerar contexto**
   - Validar `appId` apenas no header parseado (`headerDoc.appId`) e aplicar a regra somente quando não for subflow.

2. **Trocar validações por regex “soltas” por validação semântica quando possível**
   - Aproveitar objeto parseado do YAML para reduzir falso positivo/negativo.

3. **Melhorar precisão de linha**
   - Evoluir `findLineNumber` para matching por estrutura/chave YAML ao invés de `includes` textual.

4. **Fortalecer validação de paths**
   - Identificar e sinalizar separadamente caminhos fora da raiz do projeto (quando aplicável à regra de negócio).

5. **Criar suíte de testes automatizada (unit + integração)**
   - Hoje existem arquivos exemplo em `workspace/tests`, mas sem runner de testes automatizado.
   - Cobrir especialmente:
     - regras de header/subflow,
     - path resolution,
     - when/nested objects,
     - cenários de parsing inválido.

6. **Normalizar baseline de lint interno**
   - Ajustar erros existentes de ESLint para garantir qualidade contínua.

---

## 4) Oportunidades de robustez e DX

- **Saída opcional em JSON** (flag CLI) para integração com CI/CD.
- **Códigos de saída mais granulares** (ex.: erro de execução vs erro de validação).
- **Modo estrito/configurável por perfil** (times diferentes podem querer severidades distintas).
- **Documentar matriz de regras** (categoria, descrição, severidade padrão, exemplos válidos/inválidos).

---

## 5) Resumo executivo

O projeto tem uma base modular boa e clara, com arquitetura adequada para evolução. As principais melhorias devem focar em:
- aumentar **precisão semântica** das validações (menos regex textual),
- reduzir **falsos positivos** (`appId`, line mapping),
- elevar **confiabilidade operacional** com testes automatizados e baseline de lint limpo.

Esses pontos trazem ganho imediato de confiança no linter sem exigir refatorações extensas.
