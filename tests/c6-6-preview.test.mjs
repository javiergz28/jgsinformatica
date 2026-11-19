import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, statSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const root=new URL('../',import.meta.url).pathname;
const read=(path)=>readFileSync(join(root,path),'utf8');
const manifest=JSON.parse(read('assets/boot/c6-6/manifest.json'));

test('C6.6 isolated storyboard and reduced-motion narrative stay accessible',()=>{
 const html=read('c6-6-preview.html'),css=read('c6-6-preview.css'),js=read('c6-6-preview.js');
 assert.match(html,/<html lang="es">/);
 assert.match(html,/data-film-canvas data-frame-count="96"/);
 assert.match(html,/href="#revision"/);
 assert.match(html,/href="\.\/index.html#contacto"/);
 assert.match(js,/prefers-reduced-motion: reduce/);
 assert.match(js,/navigator.connection\?\.saveData/);
 assert.match(js,/scrollProgress\(\)/);
 assert.match(js,/requestAnimationFrame/);
 assert.match(css,/mask-composite:intersect/);
 assert.doesNotMatch(js,/preventDefault\(/);
 assert.match(read('index.html'),/href="\.\/c6-6-preview.html"/);
});
test('C6.6 comes only from approved canonical scene and corrected camera target',()=>{
 const script=read('tools/c6-6-cinematic-prototype.py');
 assert.match(script,/1169b695582b76c08c5f4f43020f8b188fad3d14ad2d1c00887f494a85c04ce7/);
 assert.match(script,/unanimated render camera/);
 assert.match(script,/sc\.camera=camera/);
 assert.match(script,/\.085,-\.177,\.502/);
 assert.doesNotMatch(script,/bpy\.ops\.wm\.save/);
 assert.match(manifest.source_scene_sha256,/^1169b695582b76c08c5f4f43020f8b188fad3d14ad2d1c00887f494a85c04ce7$/);
});
test('C6.6 has 96 unique high-resolution, checksum-verified WebP sequence files',()=>{
 assert.equal(manifest.frames_total,96);
 assert.equal(manifest.frames.length,96);
 assert.equal(manifest.width,960);assert.equal(manifest.height,960);
 assert.equal(manifest.format,'image/webp');
 assert.equal(manifest.film_transparent,true);
 const names=new Set();let total=0;
 for(const [index,item] of manifest.frames.entries()){
  assert.equal(item.index,index);
  assert.equal(item.file, 'core01-'+String(index).padStart(3,'0')+'.webp');
  names.add(item.file);
  const file=join(root,'assets/boot/c6-6',item.file);
  assert(existsSync(file),file);
  const bytes=readFileSync(file);
  assert.equal(bytes.length,item.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
  total+=bytes.length;
 }
 assert.equal(names.size,96);
 assert.equal(manifest.total_webp_bytes,total);
 assert(total<20_000_000,'prototype is unexpectedly heavy: '+total);
 assert(manifest.frames[0].alpha_zero_count>100_000,'first image lost transparent backdrop');
});
test('C6.6 preview is isolated in DEV Pages workflow',()=>{
 const workflow=read('.github/workflows/ci.yml');
 assert.match(workflow,/node --check c6-6-preview\.js/);
 assert.match(workflow,/cp index\.html styles\.css script\.js c6-6-preview\.html/);
 assert.match(workflow,/cp assets\/boot\/c6-6\/\*\.webp assets\/boot\/c6-6\/manifest\.json _site\/assets\/boot\/c6-6\//);
});
