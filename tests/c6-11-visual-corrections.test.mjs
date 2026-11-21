import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('C6.11 visual feedback: remove entire bottom progress bar',()=>{
 const html=read('c6-11-preview.html');
 assert.doesNotMatch(html,/class="track"|data-progress-fill|class="progress-section"/);
 const js=read('c6-11-preview.js');
 assert.doesNotMatch(js,/data-progress-fill|data-phase|data-frame-label/);
 assert.match(html,/DESLIZÁ PARA RECORRER/);
});
test('No self-approval and copy remains visible on chapter changes',()=>{
 const html=read('c6-11-preview.html');
 assert.match(html,/QA VISUAL PENDIENTE/);
 const css=read('c6-11-preview.css');
 assert.match(css,/\.chapter-panel\.is-current\{opacity:1!important;visibility:visible!important/);
 assert.match(css,/\.chapter\{min-height:360px/);
 assert.match(css,/\.chapter:before/);
 assert.match(css,/@media\(max-width:850px\)/);
});
test('New cinematic experiment never alters master and is not a shipped 450-frame promise',()=>{
 const py=read('tools/c6-11-c-cinematic-probe.py');
 assert.match(py,/experiment-not-approved/);
 assert.match(py,/C6\.11-C visual gate/);
 assert.match(py,/bpy\.data\.objects\["C6\.11 \| fresh continuous camera"\]/);
 assert.doesNotMatch(py,/save_as_mainfile|save_mainfile/);
});
