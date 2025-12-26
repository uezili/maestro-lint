/**
 * Validador de indentação para arquivos YAML do Maestro
 */

/**
 * Valida a indentação de um arquivo YAML
 * @param {string} text - Conteúdo do arquivo
 * @returns {string[]} Array de erros de indentação encontrados
 */
function validateIndentation(text) {
  const errors = [];
  const lines = text.split('\n');
  const INDENT_SIZE = 2;
  const PROPERTY_DELTA = 4; // Propriedades abaixo de "- comando:" devem ter +4 espaços

  // Encontra a linha do separador ---
  let separatorLineIdx = -1;
  lines.forEach((line, idx) => {
    if (line.trim() === '---') {
      separatorLineIdx = idx;
    }
  });

  let prevIsCommandListItem = false; // Ex.: "- tapOn:" na seção de comandos
  let commandsBlockIndent = -1; // Armazena o nível de indentação do bloco "commands:"

  lines.forEach((line, idx) => {
    const lineNumber = idx + 1;
    const trimmed = line.trim();
    const isInCommandsSection = separatorLineIdx !== -1 && idx > separatorLineIdx;

    // Ignora linhas vazias e comentários
    if (trimmed === '' || trimmed.startsWith('#')) {
      return;
    }

    // Ignora o separador ---
    if (trimmed === '---') {
      return;
    }

    // Detecta uso de TAB
    if (line.includes('\t')) {
      errors.push(`Linha ${lineNumber}: não use TABs na indentação; utilize espaços (múltiplos de 2).`);
      return;
    }

    // Calcula número de espaços antes do primeiro caractere
    const leadingSpaces = line.search(/\S/);
    if (leadingSpaces === -1) {
      return; // Linha só com espaços
    }

    // Valida que a indentação é múltiplo de INDENT_SIZE
    if (leadingSpaces % INDENT_SIZE !== 0) {
      const contentPreview = trimmed.substring(0, 30);
      errors.push(
        `Linha ${lineNumber}: indentação incorreta (${leadingSpaces} espaços em "${contentPreview}${trimmed.length > 30 ? '...' : ''}").`
      );
    }

    // Detecta se estamos entrando em um bloco "commands:"
    if (trimmed === 'commands:' || trimmed.endsWith(':') && trimmed.includes('commands')) {
      commandsBlockIndent = leadingSpaces;
    }

    // Reseta o bloco commands se voltarmos para um nível de indentação menor
    if (commandsBlockIndent !== -1 && leadingSpaces <= commandsBlockIndent && !trimmed.startsWith('commands:')) {
      commandsBlockIndent = -1;
    }

    let emitted = false;

    // ============ REGRAS ESPECÍFICAS PARA SEÇÃO DE COMANDOS (após ---) ============
    if (isInCommandsSection && trimmed.startsWith('- ')) {
      const opensMapping = /^- +[A-Za-z0-9_-]+:/.test(trimmed);

      // Itens de comando devem estar no nível raiz (0 espaços) OU dentro de um bloco "commands:" com indentação > commandsBlockIndent
      const isInsideCommandsBlock = commandsBlockIndent !== -1 && leadingSpaces > commandsBlockIndent;
      
      if (opensMapping && leadingSpaces !== 0 && !isInsideCommandsBlock) {
        errors.push(
          `Linha ${lineNumber}: comando deve estar no nível raiz. Remova ${leadingSpaces} espaço${leadingSpaces > 1 ? 's' : ''}.`
        );
        emitted = true;
      }

      prevIsCommandListItem = opensMapping;
      prevLeadingSpaces = leadingSpaces;
    } else if (isInCommandsSection && trimmed.includes(':') && prevIsCommandListItem) {
      // Propriedades de comando devem ter exatamente +4 espaços
      const expected = PROPERTY_DELTA; // prevLeadingSpaces é sempre 0 em seção de comandos
      if (leadingSpaces !== expected) {
        if (leadingSpaces > expected) {
          const extra = leadingSpaces - expected;
          errors.push(
            `Linha ${lineNumber}: propriedade de comando com espaços a mais. Remova ${extra} espaço${extra > 1 ? 's' : ''}.`
          );
        } else {
          const missing = expected - leadingSpaces;
          errors.push(
            `Linha ${lineNumber}: propriedade de comando com indentação insuficiente. Falta${missing !== 1 ? 'm' : ''} ${missing} espaço${missing > 1 ? 's' : ''}.`
          );
        }
        emitted = true;
      }
      prevIsCommandListItem = false;
    } else {
      // Reseta contexto de comando quando sai da estrutura
      if (isInCommandsSection && !trimmed.startsWith('- ') && !trimmed.includes(':')) {
        prevIsCommandListItem = false;
      }
    }
  });

  return errors;
}

module.exports = {
  validateIndentation
};