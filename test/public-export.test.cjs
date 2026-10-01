const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'),
  os = require('node:os'),
  path = require('node:path'),
  crypto = require('node:crypto');
const { checkPublic } = require('../tools/check-public.cjs');
const { sourceBytes } = require('../tools/source-bytes.cjs');

/** Accepts no input; verifies cross-platform text hashes agree while substantive edits and binary changes remain detectable. */
test('manifest tolerates CRLF checkouts but rejects substantive edits', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ppm-line-ending-check-'));
  try {
    const file = path.join(root, 'app.ts');
    const text = 'export const first = 1;\nexport const second = 2;\n';
    fs.writeFileSync(file, text);
    fs.writeFileSync(path.join(root, 'SOURCE-MANIFEST.json'), JSON.stringify([
      { path: 'app.ts', sha256: crypto.createHash('sha256').update(sourceBytes(file)).digest('hex') },
    ]));
    assert.equal(checkPublic(root), 1);
    fs.writeFileSync(file, text.replace(/\n/g, '\r\n'));
    assert.equal(checkPublic(root), 1);
    fs.writeFileSync(file, text.replace('second = 2', 'second = 3'));
    assert.throws(() => checkPublic(root), /Source changed/);

    const dockerfile = path.join(root, 'Dockerfile');
    fs.writeFileSync(dockerfile, 'FROM node:24\r\n');
    assert.deepEqual(sourceBytes(dockerfile), Buffer.from('FROM node:24\n'));

    const binary = path.join(root, 'sample.png');
    const bytes = Buffer.from([137, 80, 0, 13, 10, 255]);
    fs.writeFileSync(binary, bytes);
    assert.deepEqual(sourceBytes(binary), bytes);
  } finally {
    assert.ok(root.startsWith(path.join(os.tmpdir(), 'ppm-line-ending-check-')));
    fs.rmSync(root, { recursive: true, force: true });
  }
});
/** Accepts a temporary source export; verifies drift and private-file checks without touching project data. */
test('public-source gate rejects unexpected files, secrets and manifest drift', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mgmt-export-check-'));
  try {
    const source = 'export const value = 1;';
    fs.writeFileSync(path.join(root, 'app.ts'), source);
    fs.writeFileSync(
      path.join(root, 'SOURCE-MANIFEST.json'),
      JSON.stringify([
        {
          path: 'app.ts',
          sha256: crypto.createHash('sha256').update(source).digest('hex'),
        },
      ]),
    );
    assert.equal(checkPublic(root), 1);
    fs.writeFileSync(path.join(root, '.env'), 'PRIVATE=true');
    assert.throws(() => checkPublic(root), /Unreviewed file|Private artifact/);
    fs.unlinkSync(path.join(root, '.env'));
    fs.writeFileSync(path.join(root, 'app.ts'), 'changed');
    assert.throws(() => checkPublic(root), /Source changed/);
    fs.writeFileSync(path.join(root, 'app.ts'), 'gh' + 'p_' + 'a'.repeat(36));
    assert.throws(() => checkPublic(root), /Potential secret/);
  } finally {
    assert.ok(root.startsWith(path.join(os.tmpdir(), 'mgmt-export-check-')));
    fs.rmSync(root, { recursive: true, force: true });
  }
});

/** Accepts no input; verifies adding a picture to the manifest cannot bypass the media allowlist. */
test('public-source gate rejects pictures even when listed in the manifest', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ppm-media-check-'));
  try {
    const image = Buffer.from([137, 80, 78, 71]);
    fs.writeFileSync(path.join(directory, 'personal.png'), image);
    fs.writeFileSync(
      path.join(directory, 'SOURCE-MANIFEST.json'),
      JSON.stringify([
        {
          path: 'personal.png',
          sha256: crypto.createHash('sha256').update(image).digest('hex'),
        },
      ]),
    );
    assert.throws(() => checkPublic(directory), /Unapproved media/);
  } finally {
    assert.ok(directory.startsWith(path.join(os.tmpdir(), 'ppm-media-check-')));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
