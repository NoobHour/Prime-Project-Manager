const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
process.chdir(root);
if (process.env.NODE_ENV === 'production')
  throw new Error('Demo mode is disabled in production.');
const directory = path.resolve(
  process.env.MGMT_DEMO_DATA_DIR ||
    path.join(process.env.LOCALAPPDATA || os.homedir(), 'PrimeMgmtDemo'),
);
const liveDirectory = path.resolve(
  process.env.LOCALAPPDATA || os.homedir(),
  'PrimeMgmtOriginal',
);
if (directory.toLowerCase() === liveDirectory.toLowerCase())
  throw new Error('The demo must use a separate database.');
const marker = path.join(directory, '.prime-demo');
if (
  fs.existsSync(path.join(directory, 'prime.sqlite')) &&
  !fs.existsSync(marker)
)
  throw new Error('Refusing to seed an unmarked existing database.');
fs.mkdirSync(directory, { recursive: true });
if (!fs.existsSync(marker))
  fs.writeFileSync(marker, 'prime-demo-v1', { flag: 'wx' });
process.env.MGMT_DATA_DIR = directory;
process.env.MGMT_DEMO = 'true';
process.env.MGMT_PORT = process.env.MGMT_DEMO_PORT || '3335';
process.env.MGMT_ORIGIN = 'http://localhost:' + process.env.MGMT_PORT;
if (!fs.existsSync('dist/api/apps/api/src/demo-seed.js'))
  throw new Error('Run node tools/build.cjs before starting the demo.');
const seeded = spawnSync(
  process.execPath,
  ['dist/api/apps/api/src/demo-seed.js'],
  { stdio: 'inherit', windowsHide: true, env: process.env },
);
if (seeded.status !== 0) process.exit(seeded.status || 1);
console.log('Demo sign-in: demo.admin@example.test / Prime-Demo-2026!');
if (!process.argv.includes('--seed-only'))
  require(path.join(root, 'dist/api/apps/api/src/main.js'));
