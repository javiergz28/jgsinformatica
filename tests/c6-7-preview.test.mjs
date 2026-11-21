import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const root=new URL('../',import.meta.url).pathname;
const read=p=>readFileSync(join(root,p),'utf8');

test('C6.7 is an independent labeled preview with four following chapter concepts',()=>{
 const html=read('c6-7-preview.html');
 assert.match(html,/<html lang="es">/);
 assert.match(html,/meta name="robots" content="noindex,nofollow"/);
 assert.match(html,/data-film-canvas data-frame-count="160" width="1080" height="1080"/);
 for(const name of ['hardware-preview','connect-preview','intelligence-preview','contact-preview']){
   assert.match(html,new RegExp('id="'+name+'"'));
 }
 assert.equal([...html.matchAll(/PREVIEW CONCEPTUAL/g)].length,4);
 assert.match(html,/href="\.\/index\.html#contacto"/);
 assert.match(read('index.html'),/href="\.\/c6-7-preview\.html"/);
 assert.match(read('index.html'),/href="\.\/c6-11-preview\.html"/);
});

test('C6.7 is reversible, smooth, non-blocking and accessible with mobile guardrails',()=>{
 const js=read('c6-7-preview.js'),css=read('c6-7-preview.css');
 assert.match(js,/total!==160/);
 assert.match(js,/prefers-reduced-motion: reduce/);
 assert.match(js,/navigator\.connection\?\.saveData/);
 assert.match(js,/requestAnimationFrame/);
 assert.match(js,/framePosition/);
 assert.match(js,/const blend=match===base&&cache\.has\(next\)/);
 assert.match(js,/IntersectionObserver/);
 assert.doesNotMatch(js,/preventDefault\(/);
 assert.match(css,/mask-composite:intersect/);
 assert.match(css,/@media\(max-width:540px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('C6.7 uses canonical Blender master without saving or fabricating hardware',()=>{
 const py=read('tools/c6-7-cinematic-prototype.py');
 assert.match(py,/1169b695582b76c08c5f4f43020f8b188fad3d14ad2d1c00887f494a85c04ce7/);
 assert.match(py,/JG C6\.7 \| probe camera \(never saved\)/);
 assert.match(py,/\.085,-\.177,\.502/);
 assert.match(py,/CYCLES/);
 assert.doesNotMatch(py,/bpy\.ops\.wm\.save/);
 assert.match(read('tools/c6-7-curate-history.py'),/--apply/);
});

test('C6.7 160 1080px WebP render files are complete and checksum-verified',()=>{
 const manifest=JSON.parse(read('assets/boot/c6-7/manifest.json'));
 assert.equal(manifest.frames_total,160);
 assert.equal(manifest.width,1080);assert.equal(manifest.height,1080);
 assert.equal(manifest.frames.length,160);
 assert.equal(manifest.film_transparent,true);
 assert.equal(manifest.source_scene_sha256,'1169b695582b76c08c5f4f43020f8b188fad3d14ad2d1c00887f494a85c04ce7');
 let total=0;
 for(const [i,fr] of manifest.frames.entries()){
  const expected='core01-'+String(i).padStart(3,'0')+'.webp';
  assert.equal(fr.file,expected);assert.equal(fr.index,i);
  const path=join(root,'assets/boot/c6-7',expected);
  assert(existsSync(path),'missing '+path);
  const buffer=readFileSync(path);
  assert.equal(buffer.length,fr.bytes);
  assert.equal(buffer.toString('ascii',0,4),'RIFF');
  assert.equal(buffer.toString('ascii',8,12),'WEBP');
  assert.equal(createHash('sha256').update(buffer).digest('hex'),fr.sha256);
  total+=buffer.length;
 }
 assert.equal(total,manifest.total_webp_bytes);
 assert(total<15_000_000,'web payload budget exceeded');
 assert(manifest.frames[0].alpha_zero_count>500_000,'opening lacks transparent background');
});

test('Pages keeps C6.7 baseline alongside current C6.11 without touching LIVE',()=>{
 const ci=read('.github/workflows/ci.yml');
 assert.match(ci,/node --check c6-7-preview\.js/);
 assert.match(ci,/cp index\.html styles\.css script\.js c6-7-preview\.html/);
 assert.match(ci,/cp assets\/boot\/c6-7\/\*\.webp assets\/boot\/c6-7\/manifest\.json _site\/assets\/boot\/c6-7\//);
 assert.match(ci,/if: github\.ref == 'refs\/heads\/main'/);
});
