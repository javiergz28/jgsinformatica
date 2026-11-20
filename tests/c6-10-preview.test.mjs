import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const bytes=name=>readFileSync(new URL('../'+name,import.meta.url));
const sha=name=>createHash('sha256').update(bytes(name)).digest('hex');
test('C6.10 is a cinematic five-chapter story from assembled PC to original nucleus',()=>{
 const h=read('c6-10-preview.html'),j=read('c6-10-preview.js');
 const titles=['La tecnología','Cada detalle','Un impulso','Más allá','El corazón'];
 for(const title of titles) assert(h.includes(title),'Missing chapter: '+title);
 assert.equal((h.match(/data-chapter-panel="/g)||[]).length,5);
 assert.match(h,/data-film-canvas data-frame-count="160"/);
 assert.match(h,/assets\/boot\/c6-10-intro\/core01-000.webp/);
 assert.match(h,/assets\/brand\/jg-nextgen-flat.svg/);
 assert.match(h,/assets\/brand\/jg-nextgen-favicon32.png/);
 assert.match(j,/frameURL=i=>i<=bridgeEnd/);
 assert.match(j,/assets\/boot\/c6-7\/core01-/);
 assert.match(j,/chapterEnds=\[\.17,\.38,\.65,\.81,1\.01\]/);
 assert.match(j,/queueAround\(desired\)/);
 assert.match(j,/\['INICIO \/ 00'/);
 assert.doesNotMatch(j,/preventDefault\(/);
});
test('C6.10 bridges 61 original Cycles frames to original 99 nucleus frames',()=>{
 const m=JSON.parse(read('assets/boot/c6-10-intro/manifest.json'));
 assert.equal(m.source_master_sha256,'1169b695582b76c08c5f4f43020f8b188fad3d14ad2d1c00887f494a85c04ce7');
 assert.equal(m.bridge_end,60);
 assert.equal(m.frames.length,61);
 assert.equal(m.total_story_frames,160);
 assert.deepEqual(m.reused_original_first,61);
 assert.deepEqual(m.reused_original_last,159);
 assert.ok(Math.max(...m.handoff_reference_RGB_mean_delta)<2);
 let total=0;
 for(const [i,frame] of m.frames.entries()){
   assert.equal(frame.index,i);
   assert.equal(frame.file,'core01-'+String(i).padStart(3,'0')+'.webp');
   const name='assets/boot/c6-10-intro/'+frame.file;
   const b=bytes(name);
   assert.equal(statSync(new URL('../'+name,import.meta.url)).size,frame.bytes);
   assert.equal(sha(name),frame.sha256);
   assert.equal(b.subarray(0,4).toString(),'RIFF');
   total+=frame.bytes;
 }
 assert.equal(total,m.new_webp_bytes);
 const c67=JSON.parse(read('assets/boot/c6-7/manifest.json'));
 assert.equal(c67.frames_total,160);
});
test('Brand V3.1 uses exact Drive originals, with accessible fallback',()=>{
 const h=read('c6-10-preview.html');
 assert.match(h,/aria-label="Volver a JG Next Gen DEV"/);
 assert.match(h,/src="\.\/assets\/brand\/jg-nextgen-flat.svg"/);
 assert.equal(sha('assets/brand/jg-nextgen-flat.svg'),'b8453d08181b9e21d6486d2f91e336f8b2bf8a2164bc7277c9851804380dece2');
 assert.equal(sha('assets/brand/jg-nextgen-favicon32.png'),'612bf6e73ec71d5debe9e0b400abc7c9d33e849318634573c241be84fd5510c2');
 const css=read('c6-10-preview.css'),js=read('c6-10-preview.js');
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(js,/navigator\.connection\?\.saveData/);
 assert.match(js,/document\.body\.classList\.add\('film-static'\)/);
});
test('Pages publishes only current cinematic and C6.7 reference preview',()=>{
 const site=read('index.html'),workflow=read('.github/workflows/ci.yml');
 assert.match(site,/c6-10-preview\.html/);
 assert.match(site,/c6-7-preview\.html/);
 for(const ob of ['c6-6-preview.html','c6-9-section01.html','c6-9-b-section01.html']){
   assert.doesNotMatch(site,new RegExp(ob.replace(/\./g,'\\.')));
   assert.doesNotMatch(workflow,new RegExp(ob.replace(/\./g,'\\.')));
 }
 assert.match(workflow,/node --check c6-10-preview\.js/);
 assert.match(workflow,/cp assets\/boot\/c6-10-intro\/\*\.webp assets\/boot\/c6-10-intro\/manifest\.json/);
 assert.match(workflow,/assets\/brand\/jg-nextgen-flat\.svg/);
});
