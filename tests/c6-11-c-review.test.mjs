import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url));
const text=(p)=>read(p).toString('utf8');
const sum=(p)=>createHash('sha256').update(read(p)).digest('hex');
test('C6.11-C is visibly experimental and retains C6.11 baseline + C6.7 rollback',()=>{
 const h=text('c6-11-c-review.html'),index=text('index.html');
 assert.match(h,/NO APROBADO/);
 assert.match(h,/todavía no es la animación definitiva de 450 fotogramas/);
 assert.equal((h.match(/data-chapter-panel/g)||[]).length,0);
 for(const name of ['c6-11-preview.html','c6-11-c-review.html','c6-7-preview.html'])assert.match(index,new RegExp(name.replaceAll('.','\\.')));
});
test('Every cinematic G1 panoramic still is a real source-backed WebP, not duplicated',()=>{
 const m=JSON.parse(text('assets/boot/c6-11-c-study/manifest.json'));
 assert.equal(m.count,7);
 assert.equal(m.frames.length,7);
 assert.equal(m.solid_collision_count,0);
 assert.equal(m.source_master_sha256,'6522cbb38d303554fb9c25b13975bfa2c728d5ce1908b9e9dc3b1b403fa6f7d2');
 assert.equal(m.camera_descent_m,0.48);
 assert.ok(m.glass_crossing_frames.some(f=>f>=394&&f<=399));
 assert.match(m.render_format,/1920x1080/);
 assert.match(m.status??m.stage,/NOT user-approved/);
 const ids=[0,100,180,240,300,360,449];
 assert.deepEqual(m.frames.map(x=>x.index),ids);
 const shas=new Set();
 for(const f of m.frames){
  const path='assets/boot/c6-11-c-study/'+f.file;
  assert.equal(read(path).length,f.bytes);
  assert.equal(statSync(new URL('../'+path,import.meta.url)).size,f.bytes);
  assert.equal(sum(path),f.sha256);
  shas.add(f.sha256);
 }
 assert.equal(shas.size,7);
});
test('DEV workflow ships the review without touching LIVE or replacing 450 old frames',()=>{
 const ci=text('.github/workflows/ci.yml');
 assert.match(ci,/c6-11-c-review\.html/);
 assert.match(ci,/assets\/boot\/c6-11-c-study\/\*\.webp/);
 assert.match(ci,/c6-11-preview\.html/);
 assert.match(ci,/assets\/boot\/c6-11\/desktop/);
 const probe=text('tools/c6-11-c-cinematic-probe.py');
 assert.doesNotMatch(probe,/save_as_mainfile|save_mainfile/);
});
