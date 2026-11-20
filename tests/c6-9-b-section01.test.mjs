import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('C6.9-B is isolated with 25 frames and preserves all published comparisons',()=>{
  const html=read('c6-9-b-section01.html');
  assert.match(html,/data-frame-count="25"/);
  assert.match(html,/class="reel" data-reel/);
  assert.match(html,/c6-9-b-section01\.js/);
  assert.match(html,/G1\.1/);
  assert.match(read('index.html'),/c6-9-b-section01\.html/);
  assert.match(read('index.html'),/c6-9-section01\.html/);
  assert.match(read('index.html'),/c6-7-preview\.html/);
});

test('B1.1 reused canonical master and frames are complete, not clipped',()=>{
  const m=JSON.parse(read('assets/boot/c6-9-b/manifest.json'));
  assert.equal(m.master_sha256,'1169b695582b76c08c5f4f43020f8b188fad3d14ad2d1c00887f494a85c04ce7');
  assert.equal(m.count,25);
  assert.equal(m.frames.length,25);
  assert.ok(m.frames.reduce((n,f)=>n+f.bytes,0)<900000);
  for(const [i,f] of m.frames.entries()){
    assert.equal(f.file,'pose-'+String(i).padStart(2,'0')+'.webp');
    assert.equal(statSync(new URL('../assets/boot/c6-9-b/'+f.file,import.meta.url)).size,f.bytes);
    assert.ok(f.bbox[0]>2&&f.bbox[1]>2&&f.bbox[2]<698&&f.bbox[3]<698, 'clipped pose '+i);
  }
  assert.ok((m.frames[0].bbox[2]-m.frames[0].bbox[0])/m.size >= .60, 'opening PC has at least 60% visible alpha width');
});

test('C6.9-B curve is read-only Bezier with no external post-hero zoom',()=>{
  const py=read('tools/c6-9-b-closer-curved-camera.py');
  assert.match(py,/def bezier\(/);
  assert.match(py,/EYES =/);
  assert.match(py,/LENSES = \(63\., 62\., 59\., 55\.\)/);
  assert.match(py,/\(\.87, -1\.055, \.95\)/);
  assert.match(py,/hashlib\.sha256\(src\.read_bytes\(\)\)/);
  assert.doesNotMatch(py,/bpy\.ops\.wm\.save/);
});

test('G1.1 Canvas keeps poster and respects accessibility and data saving',()=>{
  const js=read('c6-9-b-section01.js'),css=read('c6-9-b-section01.css');
  assert.match(js,/prefers-reduced-motion: reduce/);
  assert.match(js,/navigator\.connection\?\.saveData/);
  assert.match(js,/requestAnimationFrame\(update\)/);
  assert.match(js,/if\(match<0\)return/);
  assert.doesNotMatch(js,/preventDefault/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/body\.film-static/);
});
