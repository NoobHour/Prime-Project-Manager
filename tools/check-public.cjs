const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
/** Accepts a repository root; checks its source manifest and rejects private artifacts or recognizable secrets. Returns checked source count. */
function checkPublic(root) {
  root = path.resolve(root);
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, 'SOURCE-MANIFEST.json'), 'utf8'),
  );
  const expected = new Set(manifest.map((entry) => entry.path));
  if (expected.size !== manifest.length)
    throw new Error('Duplicate manifest path');
  // This is the only intentional image in the source distribution. Demo images are generated at runtime.
  const approvedImages = new Set([
    'apps/mgmtapp/src/assets/workspace-mark.svg',
  ]);
  const generated = new Set([
    'README.md',
    '.gitignore',
    'SOURCE-MANIFEST.json',
  ]);
  const ignored = new Set([
    'node_modules',
    'dist',
    '.angular',
    '.git',
    'coverage',
  ]);
  /** Accepts a relative directory; verifies every publishable file without printing secret contents. Returns nothing. */
  function walk(relative) {
    for (const entry of fs.readdirSync(path.join(root, relative), {
      withFileTypes: true,
    })) {
      const name = path.posix.join(relative, entry.name);
      if (entry.isSymbolicLink())
        throw new Error('Symlink requires review: ' + name);
      if (entry.isDirectory()) {
        if (relative || !ignored.has(entry.name)) walk(name);
        continue;
      }
      if (!expected.has(name) && !generated.has(name))
        throw new Error('Unreviewed file: ' + name);
      if (
        /\.(?:png|jpe?g|gif|webp|avif|bmp|tiff?|ico|svg|pdf|mp[34]|mov|wav)$/i.test(
          name,
        ) &&
        !approvedImages.has(name)
      )
        throw new Error('Unapproved media: ' + name);
      if (
        /\.(?:sqlite(?:-.*)?|db|pem|key|pfx|zip|log)$/i.test(name) ||
        (/(?:^|\/)(?:session-key|\.seeded|\.prime-demo|\.env(?:\..*)?)$/.test(
          name,
        ) &&
          !name.endsWith('/.env.example') &&
          name !== '.env.example')
      )
        throw new Error('Private artifact: ' + name);
      const content = fs.readFileSync(path.join(root, name), 'utf8');
      if (
        /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{30,}\b|\bAKIA[A-Z0-9]{16}\b|\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}\b/.test(
          content,
        )
      )
        throw new Error('Potential secret: ' + name);
      if (/logo_MR_OL_|view-customer\.componentold|prestyle copy/.test(name))
        throw new Error('Legacy artifact: ' + name);
    }
  }
  walk('');
  for (const entry of manifest) {
    const target = path.resolve(root, entry.path);
    if (!target.startsWith(root + path.sep))
      throw new Error('Manifest path escaped root');
    const digest = crypto
      .createHash('sha256')
      .update(fs.readFileSync(target))
      .digest('hex');
    if (digest !== entry.sha256)
      throw new Error('Source changed since review: ' + entry.path);
  }
  return manifest.length;
}
if (require.main === module) {
  console.log(
    'Public source check passed: ' +
      checkPublic(process.argv[2] || process.cwd()) +
      ' files. This pattern scan is not a comprehensive secret audit.',
  );
}
module.exports = { checkPublic };
