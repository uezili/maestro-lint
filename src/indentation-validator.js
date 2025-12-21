/**
 * Validador de indentação para arquivos YAML do Maestro
 */

/**
 * Valida a indentação de um arquivo YAML
 * @param {string} text - Conteúdo do arquivo
 * @param {string} filePath - Caminho do arquivo
 * @returns {string[]} Array de erros de indentação encontrados
 */
function validateIndentation(text, filePath = '') {
  const errors = [];
  const lines = text.split('\n');
  const INDENT_SIZE = 2; // Maestro usa 2 espaços de indentação

  lines.forEach((line, idx) => {
    const lineNumber = idx + 1;
    const trimmed = line.trim();

    // Ignora linhas vazias e comentários
    if (trimmed === '' || trimmed.startsWith('#')) {
      return;
    }

    // Detecta uso de TAB
    if (line.includes('\t')) {
      errors.push(`Linha ${lineNumber}: usa TAB em vez de espaços. Use ${INDENT_SIZE} espaços para indentação.`);
      return; // Não valida mais nada nesta linha
    }

    // Calcula número de espaços antes do primeiro caractere
    const leadingSpaces = line.search(/\S/);
    if (leadingSpaces === -1) return; // Linha só com espaços

    // Valida que a indentação é múltiplo de INDENT_SIZE
    if (leadingSpaces % INDENT_SIZE !== 0) {
      errors.push(
        `Linha ${lineNumber}: indentação incorreta (${leadingSpaces} espaços). Deve ser múltiplo de ${INDENT_SIZE}.`
      );
    }

    // Valida indentação de itens de lista (começam com -)
    if (trimmed.startsWith('- ')) {
      const nextLineIdx = idx + 1;
      if (nextLineIdx < lines.length) {
        const nextLine = lines[nextLineIdx];
        const nextTrimmed = nextLine.trim();

        // Se próxima linha não é vazia, comentário, outra lista, ou separador ---
        if (nextTrimmed && !nextTrimmed.startsWith('#') && !nextTrimmed.startsWith('-')) {
          const nextLeadingSpaces = nextLine.search(/\S/);

          // Se a próxima linha tem indentação 0, é uma nova chave raiz, não é propriedade da lista
          if (nextLeadingSpaces === 0) {
            return;
          }

          // Verifica se é uma propriedade aninhada do item de lista (tem ":")
          if (nextTrimmed.includes(':') && nextLeadingSpaces !== -1) {
            // Propriedades de um item de lista devem ter indentação maior que o item
            if (nextLeadingSpaces <= leadingSpaces) {
              errors.push(
                `Linha ${
                  nextLineIdx + 1
                }: propriedade de item de lista deve ter indentação maior que o item (esperado > ${leadingSpaces} espaços, encontrado ${nextLeadingSpaces}).`
              );
            }
          }
        }
      }
    }
  });

  return errors;
}

/**
 * Valida se o YAML pode ser parseado corretamente
 * @param {string} text - Conteúdo do arquivo
 * @param {object} yaml - Instância do js-yaml
 * @returns {string[]} Array de erros de parsing
 */
function validateYamlParsing(text, yaml) {
  const errors = [];
  const docs = text.split('---');

  docs.forEach((docText, idx) => {
    if (docText.trim() === '') return;

    try {
      yaml.load(docText);
    } catch (error) {
      // Extrai informações do erro do js-yaml
      const match = error.message.match(/\((\d+):(\d+)\)/);
      if (match) {
        const line = match[1];
        const col = match[2];
        errors.push(`Documento ${idx + 1}, linha ${line}: ${error.message.split('(')[0].trim()}`);
      } else {
        errors.push(`Documento ${idx + 1}: ${error.message}`);
      }
    }
  });

  return errors;
}

module.exports = {
  validateIndentation,
  validateYamlParsing
};
