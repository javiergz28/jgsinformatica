import {TOTAL,FrameStore,chapterFor,clamp} from './c6-11-player.mjs';
const reel=document.querySelector('[data-reel]'),canvas=document.querySelector('canvas'),panels=[...document.querySelectorAll('[data-chapter-panel]')];
const reduce=matchMedia('(prefers-reduced-motion: reduce)'),save=navigator.connection?.saveData||/^(slow-)?2g$/.test(navigator.connection?.effectiveType||'');
const mobile=matchMedia('(max-width:850px)').matches,size=mobile?720:1080;
const ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
let wanted=0,shown=-1,chapter=0,raf=0,store,drawCount=0,maxGap=0;
function staticMode(){store?.close();document.body.classList.add('film-static');document.body.classList.remove('has-film');}
function progress(){const r=reel.getBoundingClientRect();return clamp(-r.top/Math.max(1,r.height-innerHeight),0,1);}
function request(){if(!raf)raf=requestAnimationFrame(update);}
function update(){
 raf=0;if(document.body.classList.contains('film-static'))return;
 wanted=Math.round(progress()*(TOTAL-1));store.request(wanted);
 const index=store.closest(wanted);
 if(index>=0&&index!==shown){
  const bitmap=store.cache.get(index);ctx.clearRect(0,0,size,size);ctx.drawImage(bitmap,0,0,size,size);
  shown=index;drawCount++;document.body.classList.add('has-film');canvas.dataset.currentFrame=String(shown);
  chapter=chapterFor(shown);panels.forEach((p,i)=>{p.classList.toggle('is-current',i===chapter);p.setAttribute('aria-hidden',String(i!==chapter));});
  // Copy follows the image actually visible, including during reversals and slow networks.
 }
 maxGap=Math.max(maxGap,Math.abs(wanted-shown));
 reel.dataset.progress=String(progress());reel.dataset.chapter=String(chapter+1);
 document.querySelector('[data-loading]').hidden=shown>=0&&Math.abs(wanted-shown)<12;
}
if(reduce.matches||save||!ctx||typeof createImageBitmap!=='function')staticMode();
else{
 canvas.width=canvas.height=size;
 store=new FrameStore({limit:mobile?12:18,parallel:mobile?3:4,radius:mobile?9:15,
  url:i=>`./assets/boot/c6-11/${mobile?'mobile':'desktop'}/core01-${String(i).padStart(3,'0')}.webp`,
  load:async(url,signal)=>{const r=await fetch(url,{signal,cache:'force-cache'});if(!r.ok)throw Error(`Frame ${r.status}`);const b=await r.blob();return createImageBitmap(b);},onReady:request});
 addEventListener('scroll',request,{passive:true});addEventListener('resize',request,{passive:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)request();});
 addEventListener('pagehide',()=>store.close(),{once:true});addEventListener('pageshow',e=>{if(e.persisted)location.reload();});reduce.addEventListener('change',e=>{if(e.matches)staticMode();});request();
}
window.__jgFilmQA=()=>({total:TOTAL,wanted,shown,chapter,drawCount,maxGap,decoded:store?.cache.size||0,peakDecoded:store?.peak||0,active:store?.active.size||0,queued:store?.queue.length||0,aborted:store?.abortCount||0,failed:[...(store?.errors||[])],decodedBudgetBytes:(mobile?12:18)*size*size*4,visible:document.body.classList.contains('has-film'),static:document.body.classList.contains('film-static')});
