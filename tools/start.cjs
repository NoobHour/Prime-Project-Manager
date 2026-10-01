const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
process.chdir(root);
if (Number(process.versions.node.split('.')[0]) !== 24)
  throw new Error('Use Node.js 24 LTS.');
if (!fs.existsSync('node_modules/@nestjs/core'))
  throw new Error('Install dependencies first: pnpm install --frozen-lockfile');
if (
  !fs.existsSync('dist/apps/mgmtapp/browser/index.html') ||
  !fs.existsSync('dist/api/apps/api/src/main.js')
) {
  const result = spawnSync(process.execPath, ['tools/build.cjs'], {
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
// The Nest entry point serves the compiled frontend using the configured bind address.
require(path.join(root, 'dist/api/apps/api/src/main.js'));
