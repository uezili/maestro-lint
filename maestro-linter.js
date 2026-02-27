const lintEngine = require('./src/LintEngine');
const filesManager = require('./src/FilesManager');
const resultsPresenter = require('./src/ResultsPresenter');
// const configManager = require('./src/ConfigManager');

async function main() {
  resultsPresenter.displayInfo('🔍 Executando Maestro Linter...');

  const specificPath = process.argv[2];
  const includeAllYaml = process.argv.includes('--all-yaml');

  if (!filesManager.isValidPath(specificPath)) {
    resultsPresenter.displayError('Caminho não informado. Use: node maestro-linter.js <arquivo_ou_pasta>');
    process.exitCode = 1;
    return;
  }

  let files;
  try {
    files = await filesManager.getFilesToLint(specificPath, includeAllYaml);
  } catch (error) {
    resultsPresenter.displayError(error.message);
    process.exitCode = 1;
    return;
  }

  if (files.length === 0) {
    resultsPresenter.displayInfo('⚠️  Nenhum arquivo de teste encontrado.');
    return;
  }

  resultsPresenter.displayPathInfo(specificPath);

  let passed = 0;
  let failed = 0;
  const stats = {
    errors: 0,
    warnings: 0,
    infos: 0
  };

  for (const file of files) {
    const errors = lintEngine.lint(file);

    errors.forEach(error => {
      if (error.severity === 'error') stats.errors++;
      else if (error.severity === 'warning') stats.warnings++;
      else if (error.severity === 'info') stats.infos++;
    });

    if (resultsPresenter.displayFileResult(file, errors)) {
      passed++;
    } else {
      failed++;
    }
  }

  const isSuccess = resultsPresenter.displayResults(passed, failed, files.length, stats);
  process.exitCode = isSuccess ? 0 : 1;
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
