import {
  generateCatalog,
  importCanary,
  rebuildCatalog,
  validateCatalog,
} from './commands/contentCommands.ts';

const [command, flag] = process.argv.slice(2);

try {
  switch (command) {
    case 'rebuild':
      rebuildCatalog();
      break;
    case 'validate':
      validateCatalog();
      break;
    case 'import-canary':
      importCanary(undefined, flag === '--check');
      break;
    case 'generate':
      generateCatalog(undefined, flag === '--check');
      break;
    default:
      console.error(
        'Usage: node tools/content-catalog/cli.ts <rebuild|validate|import-canary|generate> [--check]',
      );
      process.exitCode = 2;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
