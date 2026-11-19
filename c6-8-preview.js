/* DEV-009 / C6.8 — bounded prefetch + priority-aware scroll study.
 * Does not replace C6.7; shares its original approved 160 WebP frames.
 */
(()=>{
  const reel=document.querySelector('[data-reel]');
  const canvas=document.querySelector('[data-film-canvas]');
  const art=document.querySelector('[data-art]');
  const progressFill=document.querySelector('[data-progress-fill]');
  const phase=document.querySelector('[data-phase]');
  const label=document.querySelector('[data-frame-label]');
  const chapterNumber=document.querySelector('[data-chapter-number]');
  const chapterText=document.querySelector('[data-chapter-text]');
  if(!reel||!canvas||!art||!progressFill||!phase||!label||!chapterNumber||!chapterText) return;
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData=navigator.connection?.saveData===true;
  const total=Number(canvas.dataset.frameCount);
  if(reduce||saveData||total!==160) {
    document.body.classList.add('film-static');
    phase.textContent=reduce?'MODO ESTÁTICO / MOVIMIENTO REDUCIDO':'MODO ESTÁTICO';
    return;
  }
  const ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
  if(!ctx) {document.body.classList.add('film-static');return}
  const chapters=[
    {end:.17,head:'01 / SYSTEM BOOT',title:'La transformación<br><em>comienza aquí.</em>',copy:'Una sola computadora. Un recorrido real desde su primer impulso.'},
    {end:.38,head:'02 / APPROACH',title:'Cada detalle<br><em>importa.</em>',copy:'La cámara acompaña la carcasa y encuentra el punto exacto de encendido.'},
    {end:.65,head:'03 / POWER',title:'Un gesto.<br><em>Todo cambia.</em>',copy:'Nos detenemos en el botón principal. La luz cian revela el sistema.'},
    {end:.81,head:'04 / THROUGH GLASS',title:'Más allá<br><em>del vidrio.</em>',copy:'Sin cortes: el plano desciende y atraviesa la estructura hacia el hardware.'},
    {end:1.01,head:'05 / HARDWARE',title:'El corazón<br><em>del sistema.</em>',copy:'Memoria, refrigeración y GPU. El siguiente capítulo empieza aquí.'}
  ];
  const clamp=x=>Math.min(1,Math.max(0,x));
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
  const small=window.matchMedia('(max-width:850px)').matches;
  const cache=new Map(),pending=new Set(),queue=[],failed=new Set();
  const MAX_PARALLEL=small?2:4,MAX_DECODED=small?7:16;
  const PREFETCH_RADIUS=small?4:6;
  let inFlight=0, last=-1, raf=0, current=0, currentChapter=-1, desiredIndex=0, lastTick=0;
  function url(i){return './assets/boot/c6-7/core01-'+String(i).padStart(3,'0')+'.webp'}
  function enqueue(i){
    if(i<0||i>=total||cache.has(i)||pending.has(i)||failed.has(i))return;
    pending.add(i);queue.push(i);
  }
  function pump(){
    while(inFlight<MAX_PARALLEL&&queue.length){
      const index=queue.shift();inFlight++;
      const im=new Image();im.decoding='async';
      im.onload=()=>{
        pending.delete(index);
        if(Math.abs(index-desiredIndex)<=PREFETCH_RADIUS+2)cache.set(index,im);
        inFlight--;
        if(cache.size>MAX_DECODED){
          const far=[...cache.keys()].sort((a,b)=>Math.abs(b-desiredIndex)-Math.abs(a-desiredIndex));
          for(const k of far.slice(0,cache.size-MAX_DECODED))cache.delete(k);
        }
        canvas.dataset.decodedFrames=String(cache.size);
        request();pump();
      };
      im.onerror=()=>{pending.delete(index);failed.add(index);inFlight--;request();pump()};
      im.src=url(index);
    }
  }
  function queueAround(i){
    // A quick scroll can move 100+ positions while old frames are queued.
    // Remove work that no longer serves the viewport instead of downloading
    // the full path between the old and new target. Keep inflight requests
    // bounded; they finish naturally without risking network callbacks.
    const retained=queue.filter(n=>Math.abs(n-i)<=PREFETCH_RADIUS);
    for(const n of queue){
      if(Math.abs(n-i)>PREFETCH_RADIUS)pending.delete(n);
    }
    queue.length=0;
    queue.push(...retained);
    const offsets=small?[0,-1,1,-2,2,-3,3,-4,4]:[0,-1,1,-2,2,-3,3,-4,4,-5,5,-6,6];
    for(const off of offsets)enqueue(i+off);
    queue.sort((a,b)=>Math.abs(a-i)-Math.abs(b-i));
    canvas.dataset.queuedFrames=String(queue.length);
    canvas.dataset.decodedFrames=String(cache.size);
    pump();
  }
  let lastComposition=-1;
  function draw(framePosition){
    const base=Math.floor(framePosition),next=Math.min(total-1,base+1),fraction=framePosition-base;
    let match=cache.has(base)?base:-1;
    if(match<0){for(let diff=1;diff<=5;diff++){
      if(cache.has(base-diff)){match=base-diff;break}
      if(cache.has(base+diff)){match=base+diff;break}
    }}
    if(match<0){
      if(last>=0&&Math.abs(last-framePosition)>8)document.body.classList.remove('has-film');
      return;
    }
    const blend=match===base&&cache.has(next)&&next!==base;
    const key=blend?framePosition:match;
    if(Math.abs(key-lastComposition)<.09)return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.globalAlpha=1;
    ctx.drawImage(cache.get(match),0,0,canvas.width,canvas.height);
    if(blend){
      ctx.globalAlpha=fraction;
      ctx.drawImage(cache.get(next),0,0,canvas.width,canvas.height);
      ctx.globalAlpha=1;
    }
    canvas.dataset.currentFrame=String(match);
    canvas.dataset.blended=String(blend);
    label.textContent=String(match).padStart(3,'0')+' / 159';
    last=match;lastComposition=key;
    document.body.classList.add('has-film');
  }
  function scrollProgress(){
    const rect=reel.getBoundingClientRect();
    return clamp(-rect.top/Math.max(1,rect.height-window.innerHeight));
  }
  function update(now=performance.now()){
    raf=0;
    const target=scrollProgress();
    const delta=lastTick?Math.min(64,Math.max(1,now-lastTick)):16;
    lastTick=now;
    const alpha=1-Math.exp(-delta/70);
    if(Math.abs(target-current)>.00012)current+=(target-current)*alpha;
    else current=target;
    const position=current*(total-1);
    // The eventual scroll target takes network priority immediately. Camera
    // easing can trail behind it; downloading every intermediary frame during
    // a large wheel/touch jump would cause visibly stale screenshots.
    const requested=Math.round(target*(total-1));
    desiredIndex=requested;
    queueAround(requested);
    draw(position);
    // The 3D camera already moves into the case: CSS overscan stays subtle,
    // preserving AIO/RAM framing instead of simulating another abrupt zoom.
    art.style.setProperty('--scale',(1+0.10*smooth(.60,.99,current)).toFixed(3));
    reel.dataset.progress=current.toFixed(3);
    progressFill.style.transform='scaleX('+current.toFixed(4)+')';
    let chapterIndex=chapters.findIndex(c=>current<c.end);
    if(chapterIndex<0)chapterIndex=chapters.length-1;
    if(chapterIndex!==currentChapter){
      const chapter=chapters[chapterIndex];
      chapterNumber.textContent=chapter.head;
      chapterText.innerHTML='<h1>'+chapter.title+'</h1><p>'+chapter.copy+'</p>';
      currentChapter=chapterIndex;
      reel.dataset.chapter=String(chapterIndex+1);
    }
    phase.textContent=['STANDBY / 00','APPROACH / 01','POWER / 02','GLASS / 03','HARDWARE / 04'][chapterIndex];
    if(Math.abs(target-current)>.00012)request();
  }
  function request(){if(!raf)raf=requestAnimationFrame(update)}
  queueAround(0);
  window.addEventListener('scroll',request,{passive:true});
  window.addEventListener('resize',request,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)request()});
  update();
  const previews=document.querySelectorAll('.story-preview');
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries) if(entry.isIntersecting){
        entry.target.classList.add('is-visible');observer.unobserve(entry.target);
      }
    },{threshold:.13});
    previews.forEach(el=>observer.observe(el));
  }else previews.forEach(el=>el.classList.add('is-visible'));
})();
