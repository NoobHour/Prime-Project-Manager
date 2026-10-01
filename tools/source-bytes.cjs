const fs = require('node:fs');
const path = require('node:path');

/** Accepts a source-file path; returns bytes with text CRLF normalized to LF and binary bytes unchanged. */
function sourceBytes(file) {
  const bytes = fs.readFileSync(file);
  const textExtension = /\.(?:ts|js|cjs|json|html|scss|css|md|yml|yaml|svg|txt)$/i;
  const textNames = new Set([
    'LICENSE', 'Dockerfile', '.dockerignore', '.gitignore', '.gitattributes',
    '.env.example', '.prettierrc', 'PUBLIC-GITIGNORE',
  ]);
  if (!textExtension.test(file) && !textNames.has(path.basename(file))) return bytes;
  // Latin-1 round-tripping preserves every byte except CRLF pairs, without recoding existing text.
  return Buffer.from(bytes.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
}

module.exports = { sourceBytes };
