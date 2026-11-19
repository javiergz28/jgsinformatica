/* DEV-007 independent C6.6 study. Never replaces the published BOOT until visual approval. */
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
  if(reduce||saveData||total!==96) {
    document.body.classList.add('film-static');
    phase.textContent=reduce?'MODO ESTÁTICO / MOVIMIENTO REDUCIDO':'MODO ESTÁTICO';
    return;
  }
  const ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
  if(!ctx) {document.body.classList.add('film-static');return}
  const chapters=[
    {end:.17,head:'01 / SYSTEM BOOT',title:'La transformación<br><em>comienza aquí.</em>',copy:'Una sola computadora. Un recorrido real desde su primer impulso.'},
    {end:.36,head:'02 / APPROACH',title:'Cada detalle<br><em>importa.</em>',copy:'La cámara acompaña la carcasa y encuentra el punto exacto de encendido.'},
    {end:.61,head:'03 / POWER',title:'Un gesto.<br><em>Todo cambia.</em>',copy:'Nos detenemos en el botón principal. La luz cian revela el sistema.'},
    {end:.82,head:'04 / THROUGH GLASS',title:'Más allá<br><em>del vidrio.</em>',copy:'Sin cortes: el plano desciende y atraviesa la estructura hacia el hardware.'},
    {end:1.01,head:'05 / HARDWARE',title:'El corazón<br><em>del sistema.</em>',copy:'Memoria, refrigeración y GPU. El siguiente capítulo empieza aquí.'}
  ];
  const clamp=x=>Math.min(1,Math.max(0,x));
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
  const small=window.matchMedia('(max-width:850px)').matches;
  const cache=new Map(),pending=new Set(),queue=[],failed=new Set();
  const MAX_PARALLEL=4,MAX_DECODED=small?17:32;
  let inFlight=0, last=-1, raf=0, current=0, currentChapter=-1;
  function url(i){return './assets/boot/c6-6/core01-'+String(i).padStart(3,'0')+'.webp'}
  function enqueue(i){
    if(i<0||i>=total||cache.has(i)||pending.has(i)||failed.has(i))return;
    pending.add(i);queue.push(i);pump();
  }
  function pump(){
    while(inFlight<MAX_PARALLEL&&queue.length){
      const index=queue.shift();inFlight++;
      const im=new Image();im.decoding='async';
      im.onload=()=>{
        pending.delete(index);cache.set(index,im);inFlight--;
        if(cache.size>MAX_DECODED){
          const far=[...cache.keys()].sort((a,b)=>Math.abs(b-last)-Math.abs(a-last));
          for(const k of far.slice(0,cache.size-MAX_DECODED))cache.delete(k);
        }
        request();pump();
      };
      im.onerror=()=>{pending.delete(index);failed.add(index);inFlight--;request();pump()};
      im.src=url(index);
    }
  }
  function queueAround(i){
    for(const offset of [0,1,-1,2,-2,3,4,-3,5,6,7,8,9,10,11,12])enqueue(i+offset);
    // If the visitor jumps a chapter, queued frames from the old position must
    // not starve the new shot. Prioritize the requested position both directions.
    queue.sort((a,b)=>Math.abs(a-i)-Math.abs(b-i));
    pump();
  }
  function draw(i){
    let match=cache.has(i)?i:-1;
    if(match<0){for(let diff=1;diff<=4;diff++){
      if(cache.has(i-diff)){match=i-diff;break}
      if(cache.has(i+diff)){match=i+diff;break}
    }}
    if(match<0)return;
    if(match!==last){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(cache.get(match),0,0,canvas.width,canvas.height);
      canvas.dataset.currentFrame=String(match);
      label.textContent=String(match).padStart(3,'0')+' / 095';
      last=match;document.body.classList.add('has-film');
    }
  }
  function scrollProgress(){
    const rect=reel.getBoundingClientRect();
    return clamp(-rect.top/Math.max(1,rect.height-window.innerHeight));
  }
  function update(){
    raf=0;
    const target=scrollProgress();
    if(Math.abs(target-current)>.00012)current+=(target-current)*.28;
    else current=target;
    const desired=Math.round(current*(total-1));
    queueAround(desired);
    draw(desired);
    // The 3D camera already moves into the case: CSS overscan stays subtle,
    // preserving AIO/RAM framing instead of simulating another abrupt zoom.
    art.style.setProperty('--scale',(1+0.16*smooth(.58,.99,current)).toFixed(3));
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
})();
