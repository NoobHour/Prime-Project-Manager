const { spawnSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
/** Accepts a local CLI and arguments; runs it with the current Node runtime and propagates failures. */
function run(script, args) {
  const result = spawnSync(
    process.execPath,
    [path.join(root, script), ...args],
    { cwd: root, stdio: 'inherit', windowsHide: true },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
run('node_modules/typescript/bin/tsc', ['-p', 'apps/api/tsconfig.app.json']);
run('node_modules/tsc-alias/dist/bin/index.js', [
  '-p',
  'apps/api/tsconfig.app.json',
]);
if (!process.argv.includes('--api-only'))
  run('node_modules/@angular/cli/bin/ng.js', ['build', 'mgmtapp']);
