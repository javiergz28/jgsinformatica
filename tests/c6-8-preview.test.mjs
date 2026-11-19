import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = p => readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('C6.8 is a separate reversible experiment using existing C6.7 assets',()=>{
  const html=read('c6-8-preview.html'),js=read('c6-8-preview.js');
  assert.match(html,/DEV-009 \/ PERFORMANCE STUDY/);
  assert.match(html,/c6-8-preview.js/);
  assert.match(html,/data-frame-count="160"/);
  assert.match(js,/assets\/boot\/c6-7\/core01-/);
  assert.match(read('index.html'),/href="\.\/c6-7-preview\.html"/);
  assert.match(read('index.html'),/href="\.\/c6-8-preview\.html"/);
});

test('C6.8 bounds queue, decoded cache and prioritizes actual scroll destination',()=>{
  const js=read('c6-8-preview.js');
  assert.match(js,/MAX_PARALLEL=small\?2:4,MAX_DECODED=small\?7:16/);
  assert.match(js,/PREFETCH_RADIUS=small\?4:6/);
  assert.match(js,/retained=queue.filter/);
  assert.match(js,/pending.delete\(n\)/);
  assert.match(js,/const requested=Math.round\(target\*\(total-1\)\)/);
  assert.match(js,/queueAround\(requested\)/);
  assert.match(js,/prefers-reduced-motion: reduce/);
  assert.match(js,/navigator.connection\?\.saveData/);
  assert.doesNotMatch(js,/preventDefault\(/);
});

test('C6.8 deployment pipeline includes its isolated HTML and JS only',()=>{
  const ci=read('.github/workflows/ci.yml');
  assert.match(ci,/node --check c6-8-preview\.js/);
  assert.match(ci,/c6-8-preview\.html c6-8-preview\.js _site/);
  assert.doesNotMatch(read('c6-8-preview.html'),/c6-8-preview.css/);
});

test('C6.8-B audit measures visible frame latency, fallback duration and HTTP failures',()=>{
  const audit=read('tools/c6-8-performance-audit.cjs');
  assert.match(audit,/firstNearMs/);
  assert.match(audit,/hiddenMs/);
  assert.match(audit,/visibleFarMs/);
  assert.match(audit,/recoveries/);
  assert.match(audit,/httpFailures/);
  assert.match(audit,/assert\.equal\(httpFailures\.length,0/);
});
