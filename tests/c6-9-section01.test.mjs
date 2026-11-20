import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('C6.9 G1 is an isolated seven-pose comparison with real accessible contact routes',()=>{
  const html=read('c6-9-section01.html');
  assert.match(html,/C6\.9-A \/ G1/);
  assert.match(html,/data-pose-slider/);
  assert.match(html,/type="range"/);
  assert.match(html,/href="\.\/index\.html#contacto"/);
  assert.match(html,/data-pose-image/);
  assert.match(html,/NO ES EL VIDEO FINAL/);
  assert.match(html,/02 \/ HARDWARE/);
  assert.doesNotMatch(html,/three\.js|WebGL/);
});
test('C6.9 pose manifest uses unchanged Blender master and limits media',()=>{
  const m=JSON.parse(read('assets/boot/c6-9-g1/manifest.json'));
  assert.equal(m.master_sha256,'1169b695582b76c08c5f4f43020f8b188fad3d14ad2d1c00887f494a85c04ce7');
  assert.equal(m.frame_count,7);
  assert.equal(m.frames.length,7);
  assert.equal(m.frames.reduce((n,f)=>n+f.bytes,0)<350000,true);
  for(const [i,f] of m.frames.entries()){
    assert.equal(f.file,'pose-'+String(i).padStart(2,'0')+'.webp');
    assert.equal(statSync(new URL('../assets/boot/c6-9-g1/'+f.file,import.meta.url)).size,f.bytes);
  }
});
test('Camera probe preserves source and a curved path with start eye above C6.7',()=>{
  const py=read('tools/c6-9-section01-camera-probe.py');
  assert.match(py,/MASTER_SHA = "1169b695/);
  assert.match(py,/\.93, -1\.15, \.94/);
  assert.match(py,/def bezier\(/);
  assert.match(py,/camera\.animation_data_clear\(\)/);
  assert.match(py,/scene\.camera=camera/);
  assert.doesNotMatch(py,/bpy\.ops\.wm\.save_as_mainfile|bpy\.ops\.wm\.save_mainfile/);
});
test('CSS responsive and reduced-motion safe, and JS changes only manual pose selection',()=>{
  const css=read('c6-9-section01.css'),js=read('c6-9-section01.js');
  assert.match(css,/@media\(max-width:900px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(js,/addEventListener\('input'/);
  assert.doesNotMatch(js,/requestAnimationFrame|preventDefault\(/);
});
