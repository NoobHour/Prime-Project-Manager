const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const destination = path.resolve(
  process.argv[2] || path.join(root, '..', 'publish', 'ppm-source'),
);
if (fs.existsSync(destination))
  throw new Error(
    'Export destination already exists. Choose a new empty destination; existing files will not be deleted.',
  );
const selected = new Set();
/** Accepts a project-relative path; selects an existing file within the source project. */
function add(relative) {
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep))
    throw new Error('Source escaped project');
  if (fs.existsSync(file) && fs.lstatSync(file).isSymbolicLink())
    throw new Error('Review symlink before exporting: ' + relative);
  if (fs.existsSync(file) && fs.statSync(file).isFile())
    selected.add(path.relative(root, file));
}
/** Accepts a directory and selection predicate; collects matching source/assets recursively. */
function walk(relative, accept) {
  for (const item of fs.readdirSync(path.join(root, relative), {
    withFileTypes: true,
  })) {
    const name = path.join(relative, item.name);
    if (item.isDirectory()) walk(name, accept);
    else if (accept(name)) add(name);
  }
}
for (const config of [
  'apps/api/tsconfig.app.json',
  'apps/mgmtapp/tsconfig.app.json',
]) {
  const configFile = path.join(root, config);
  const parsed = ts.getParsedCommandLineOfConfigFile(
    configFile,
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new Error(
          ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        );
      },
    },
  );
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  for (const source of program.getSourceFiles()) {
    const relative = path.relative(root, source.fileName);
    if (
      source.isDeclarationFile ||
      relative.startsWith('..') ||
      relative.includes('node_modules')
    )
      continue;
    add(relative);
    // Select only resources explicitly referenced by this TypeScript source.
    for (const match of source.text.matchAll(
      /['"](\.\.?\/[^'"]+\.(?:html|scss|css))['"]/g,
    )) {
      add(path.join(path.dirname(relative), match[1]));
    }
  }
}
// Static assets are deliberately allowlisted; company logos and uploads never enter the export.
for (const asset of [
  '_variables.scss',
  '_bootswatch.scss',
  'theme.css',
  'workspace-mark.svg',
])
  add('apps/mgmtapp/src/assets/' + asset);
for (const file of [
  'angular.json',
  'tsconfig.base.json',
  'apps/api/tsconfig.app.json',
  'apps/mgmtapp/tsconfig.app.json',
  'apps/mgmtapp/src/index.html',
  'apps/mgmtapp/src/styles.scss',
  'proxy.conf.json',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  '.prettierrc',
  '.env.example',
  'Dockerfile',
  '.dockerignore',
  'compose.yaml',
  'compose.demo.yaml',
  'docs/PORTFOLIO-DEMO.md',
  'tools/sandbox.cjs',
  'tools/healthcheck.cjs',
  'tools/docker-smoke.cjs',
  'docs/DOCKER.md',
  'LICENSE',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'THIRD_PARTY_NOTICES.md',
  'tools/check-public.cjs',
  'tools/build.cjs',
  'tools/start.cjs',
  'tools/demo.cjs',
  'tools/prepare-public.cjs',
  'docs/PUBLIC-README.md',
  'docs/PUBLIC-GITIGNORE',
])
  add(file);
walk('test', (name) => name.endsWith('.test.cjs'));
walk('.github', (name) => name.endsWith('.yml'));
const prohibited = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bAKIA[A-Z0-9]{16}\b/,
];
for (const relative of selected) {
  if (/\.(?:ts|cjs|json|yml|md)$/.test(relative)) {
    const text = fs.readFileSync(path.join(root, relative), 'utf8');
    if (prohibited.some((pattern) => pattern.test(text)))
      throw new Error('Potential secret found in ' + relative);
  }
}
fs.mkdirSync(destination, { recursive: true });
const manifest = [];
for (const relative of [...selected].sort()) {
  const bytes = fs.readFileSync(path.join(root, relative));
  const target = path.join(destination, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
  manifest.push({
    path: relative.split(path.sep).join('/'),
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  });
}
fs.copyFileSync(
  path.join(root, 'docs/PUBLIC-README.md'),
  path.join(destination, 'README.md'),
);
fs.copyFileSync(
  path.join(root, 'docs/PUBLIC-GITIGNORE'),
  path.join(destination, '.gitignore'),
);
// Include the rendered entry documents in the same review manifest as their source templates.
for (const name of ['README.md', '.gitignore']) {
  manifest.push({
    path: name,
    sha256: crypto
      .createHash('sha256')
      .update(fs.readFileSync(path.join(destination, name)))
      .digest('hex'),
  });
}
fs.writeFileSync(
  path.join(destination, 'SOURCE-MANIFEST.json'),
  JSON.stringify(manifest, null, 2) + '\n',
);
console.log(
  'Prepared ' + selected.size + ' source/configuration files at ' + destination,
);
console.log(
  'Export includes application source and approved assets only. Databases, credentials, uploads, build output and backups are excluded. Nothing has been published.',
);
