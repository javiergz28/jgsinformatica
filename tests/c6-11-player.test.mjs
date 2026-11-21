import test from 'node:test';
import assert from 'node:assert/strict';
import {FrameStore,priorities,chapterFor,TOTAL} from '../c6-11-player.mjs';
const tick=()=>new Promise(r=>setTimeout(r,0));
test('prioritizes actual target in both directions and clamps endpoints',()=>{
 assert.deepEqual(priorities(0,1,3),[0,1,2,3]);assert.deepEqual(priorities(449,-1,3),[449,448,447,446]);
 assert.equal(priorities(200,-1,6)[1],199);assert.equal(TOTAL,450);
});
test('all editorial boundaries are deterministic when reversing',()=>{
 const frames=[0,99,100,204,205,299,300,351,352,449];
 assert.deepEqual(frames.map(chapterFor),[0,0,1,1,2,2,3,3,4,4]);
 assert.deepEqual([...frames].reverse().map(chapterFor).reverse(),frames.map(chapterFor));
});
test('rapid reversal aborts stale work, prioritizes destination and closes bitmaps',async()=>{
 const pending=[],closed=[];let ready=0;
 const store=new FrameStore({limit:3,parallel:2,radius:3,url:i=>i,onReady:()=>ready++,load:(i,signal)=>new Promise((resolve,reject)=>{
  pending.push({i,resolve});signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true});
 })});
 store.request(400);await tick();assert.deepEqual(pending.map(x=>x.i),[400,401]);
 store.request(5);await tick();assert.equal(store.active.size,2);assert.deepEqual(pending.slice(2).map(x=>x.i),[5,4]);
 pending[2].resolve({close:()=>closed.push(5)});await tick();assert.equal(store.closest(5),5);assert.equal(ready,1);
 store.close();await tick();assert.deepEqual(closed,[5]);assert.equal(store.cache.size,0);
});
test('decoded memory stays bounded and evicted images release memory',async()=>{
 let closeCount=0;const store=new FrameStore({limit:4,parallel:2,radius:3,url:i=>i,onReady:()=>{},load:async()=>({close:()=>closeCount++})});
 store.request(200);for(let i=0;i<8;i++)await tick();assert(store.cache.size<=4);assert(store.peak<=4);
 store.request(2);for(let i=0;i<8;i++)await tick();assert.equal(store.closest(2),2);assert(store.cache.size<=4);assert(closeCount>0);store.close();
});
test('failed requests do not loop or block the queue',async()=>{
 let calls=0;const store=new FrameStore({limit:4,parallel:2,radius:2,url:i=>i,onReady:()=>{},load:async(i)=>{calls++;if(i===10)throw Error('404');return {close(){}};}});
 store.request(10);for(let i=0;i<8;i++)await tick();assert(store.errors.has(10));assert(store.closest(10)>=0);const count=calls;store.request(10);await tick();assert.equal(calls,count);store.close();
});
test('idle at one frame reaches a steady state without reloading evicted neighbours',async()=>{
 let calls=0;const store=new FrameStore({limit:4,parallel:2,radius:9,url:i=>i,onReady:()=>store.request(150),load:async()=>{calls++;return {close(){}};}});
 store.request(150);for(let i=0;i<15;i++)await tick();assert.equal(calls,4);assert.equal(store.active.size,0);assert.equal(store.queue.length,0);store.close();
});
