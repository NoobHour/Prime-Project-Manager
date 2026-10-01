const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  richText,
} = require('../dist/api/libs/shared/api/validations/src/lib/input.js');
/** Accepts hostile editor HTML fixtures; verifies that executable attributes/URLs/embeds cannot enter saved rich text. */
test('rich text strips hostile export markup while retaining supported formatting', () => {
  const unsafe =
    '<p onclick="alert(1)"><strong>Safe text</strong><img src=x onerror=alert(1)><svg onload=alert(1)></svg><a href="javascript:alert(1)">link</a><iframe srcdoc="bad"></iframe><span style="background:url(javascript:alert(1))">note</span><script>alert(1)</script></p>';
  const result = richText(unsafe);
  assert.match(result, /<strong>Safe text<\/strong>/);
  assert.doesNotMatch(
    result,
    /onclick|onerror|onload|javascript:|iframe|<script|<svg|<img|style=/i,
  );
  assert.match(
    richText('<a href="https://example.test/help">Help</a>'),
    /href="https:\/\/example.test\/help"/,
  );
});
