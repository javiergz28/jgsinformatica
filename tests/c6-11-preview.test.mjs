import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync} from 'node:fs';import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));const sha=b=>createHash('sha256').update(b).digest('hex');
test('450 unique native camera positions and Blender renders, no old sequence references',()=>{
 const m=JSON.parse(read('assets/boot/c6-11/manifest.json'));assert.equal(m.frames_total,450);assert.equal(m.reused_historical_frames,0);assert.equal(m.synthetic_interpolated_frames,0);
 assert.equal(new Set(m.frames.map(f=>f.source_png_sha256)).size,450);assert.equal(new Set(m.frames.map(f=>JSON.stringify(f.camera.eye))).size,450);
 assert.deepEqual(m.curve.solid_collisions,[]);assert(m.curve.min_solid_clearance[1]>.03);assert.equal(m.curve.camera_objects.length,1);assert.deepEqual(m.curve.old_camera_actions,[]);
 for(const v of ['desktop','mobile']){
  let bytes=0;assert.equal(readdirSync(new URL('../assets/boot/c6-11/'+v,import.meta.url)).length,450);
  for(const [i,f] of m.frames.entries()){
   assert.equal(i,f.index);assert.equal(f.blender_frame,i+1);const r=f.renditions[v],b=read('assets/boot/c6-11/'+r.file);assert.equal(b.length,r.bytes);assert.equal(sha(b),r.sha256);bytes+=b.length;
  }assert.equal(bytes,m.bytes[v]);assert(bytes<(v==='desktop'?32:20)*1024*1024);
 }
 const j=read('c6-11-preview.js').toString();assert.doesNotMatch(j,/c6-7|c6-10|globalAlpha|preventDefault/);assert.match(j,/chapterFor\(shown\)/);
});
test('V3.1 branding, static access, responsive layout and production isolation',()=>{
 assert.equal(sha(read('assets/brand/jg-nextgen-flat.svg')),'b8453d08181b9e21d6486d2f91e336f8b2bf8a2164bc7277c9851804380dece2');
 assert.equal(sha(read('assets/brand/jg-nextgen-favicon32.png')),'612bf6e73ec71d5debe9e0b400abc7c9d33e849318634573c241be84fd5510c2');
 const html=read('c6-11-preview.html').toString();assert.match(html,/noindex,nofollow/);assert.match(html,/href="\.\/index.html#contacto"/);assert.match(html,/<picture/);assert.equal((html.match(/data-chapter-panel=/g)||[]).length,5);
 const css=read('c6-11-preview.css').toString();assert.match(css,/prefers-reduced-motion/);assert.match(css,/@media\(max-width:850px\)/);assert.doesNotMatch(css,/@import/);
 const j=read('c6-11-preview.js').toString();assert.match(j,/saveData/);assert.match(j,/createImageBitmap/);
});
test('DEV deploy packages the complete new sequence and removes the rejected preview',()=>{
 const workflow=read('.github/workflows/ci.yml').toString(),index=read('index.html').toString();
 assert.match(workflow,/c6-11-player.mjs/);assert.match(workflow,/assets\/boot\/c6-11\/desktop/);assert.match(workflow,/assets\/boot\/c6-11\/mobile/);
 assert.match(index,/c6-11-preview.html/);assert.doesNotMatch(index,/c6-10-preview.html/);assert.doesNotMatch(workflow,/c6-10/);
 assert.match(index,/c6-7-preview.html/); // Explicit comparison control, never imported by C6.11.
});
