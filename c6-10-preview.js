/* C6.10 | CORE-01 cinematic continuity: close Bezier introduction, real original nucleus.
   Frames 0..60 are from canonical master C6.10 bridge; 61..159 are unaltered C6.7.
   No fake camera zoom, no autoplay video, no blank Canvas when jumping backwards. */
(()=>{
  const reel=document.querySelector('[data-reel]');
  const art=document.querySelector('[data-art]');
  const canvas=document.querySelector('[data-film-canvas]');
  const fill=document.querySelector('[data-progress-fill]');
  const phase=document.querySelector('[data-phase]');
  const frameLabel=document.querySelector('[data-frame-label]');
  const panels=[...document.querySelectorAll('[data-chapter-panel]')];
  if(!reel||!art||!canvas||!fill||!phase||!frameLabel||panels.length!==5)return;

  const total=160,bridgeEnd=60,reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData=navigator.connection?.saveData===true;
  if(reduce||saveData||Number(canvas.dataset.frameCount)!==total){
    document.body.classList.add('film-static');
    phase.textContent=reduce?'MOVIMIENTO REDUCIDO':'AHORRO DE DATOS';
    return;
  }
  const ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
  if(!ctx){document.body.classList.add('film-static');return;}
  const mobile=matchMedia('(max-width:850px)').matches;
  const maxDecoded=mobile?12:22,maxParallel=mobile?3:4;
  const cache=new Map(),pending=new Set(),failed=new Set(),queue=[];
  const chapterEnds=[.17,.38,.65,.81,1.01];
  const phases=['INICIO / 00','OBSERVAR / 01','ENCENDER / 02','EXPLORAR / 03','HARDWARE / 04'];
  let inFlight=0,current=0,desired=0,shown=-1,chapter=-1,lastTime=0,raf=0,lastComposite=-1;
  const clamp=x=>Math.min(1,Math.max(0,x));
  const frameURL=i=>i<=bridgeEnd
    ?'./assets/boot/c6-10-intro/core01-'+String(i).padStart(3,'0')+'.webp'
    :'./assets/boot/c6-7/core01-'+String(i).padStart(3,'0')+'.webp';

  function prune(){
    if(cache.size<=maxDecoded)return;
    const far=[...cache.keys()].sort((a,b)=>Math.abs(b-desired)-Math.abs(a-desired));
    for(const i of far.slice(0,cache.size-maxDecoded))cache.delete(i);
  }
  function pump(){
    queue.sort((a,b)=>Math.abs(a-desired)-Math.abs(b-desired));
    while(inFlight<maxParallel && queue.length){
      const index=queue.shift();
      if(cache.has(index)||failed.has(index))continue;
      inFlight++;
      const img=new Image();
      img.decoding='async';
      img.onload=()=>{
        pending.delete(index);inFlight--;cache.set(index,img);
        prune();request();pump();
      };
      img.onerror=()=>{
        pending.delete(index);inFlight--;failed.add(index);request();pump();
      };
      img.src=frameURL(index);
    }
  }
  function enqueue(i){
    if(i<0||i>=total||cache.has(i)||pending.has(i)||failed.has(i))return;
    pending.add(i);queue.push(i);
  }
  function queueAround(center){
    desired=center;
    // Target first, then immediate neighbors, in both scroll directions.
    const offsets=[0,1,-1,2,-2,3,-3,4,-4,5,-5,6,-6,7,-7,8,-8];
    for(const d of offsets)enqueue(center+d);
    pump();
  }
  function draw(position){
    const base=Math.floor(position),next=Math.min(total-1,base+1),fraction=position-base;
    let match=cache.has(base)?base:-1;
    if(match<0){
      for(let d=1;d<=6;d++){
        if(cache.has(base-d)){match=base-d;break;}
        if(cache.has(base+d)){match=base+d;break;}
      }
    }
    // Preserve previous drawn frame, or the accessible poster; no empty Canvas.
    if(match<0)return;
    const blended=match===base && next>base && cache.has(next);
    const composition=blended?position:match;
    if(Math.abs(composition-lastComposite)<.055)return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.globalAlpha=1;ctx.drawImage(cache.get(match),0,0,canvas.width,canvas.height);
    if(blended){
      ctx.globalAlpha=fraction;
      ctx.drawImage(cache.get(next),0,0,canvas.width,canvas.height);
      ctx.globalAlpha=1;
    }
    shown=match;lastComposite=composition;
    canvas.dataset.currentFrame=String(match);
    frameLabel.textContent=String(match).padStart(3,'0')+' / 159';
    document.body.classList.add('has-film');
  }
  function getProgress(){
    const box=reel.getBoundingClientRect();
    return clamp(-box.top/Math.max(1,box.height-innerHeight));
  }
  function setChapter(p){
    let chosen=chapterEnds.findIndex(end=>p<end);
    if(chosen<0)chosen=panels.length-1;
    if(chosen===chapter)return;
    panels.forEach((el,i)=>{
      const active=i===chosen;
      el.classList.toggle('is-current',active);
      el.setAttribute('aria-hidden',active?'false':'true');
    });
    chapter=chosen;
    phase.textContent=phases[chapter];
    reel.dataset.chapter=String(chapter+1);
  }
  function request(){if(!raf)raf=requestAnimationFrame(update)}
  function update(now=performance.now()){
    raf=0;
    const target=getProgress();
    const dt=lastTime?Math.max(1,Math.min(64,now-lastTime)):16;
    lastTime=now;
    const factor=1-Math.exp(-dt/75);
    if(Math.abs(target-current)>.00015)current+=(target-current)*factor;
    else current=target;
    desired=Math.round(target*(total-1));
    queueAround(desired);
    draw(current*(total-1));
    setChapter(current);
    fill.style.transform='scaleX('+current.toFixed(5)+')';
    reel.dataset.progress=current.toFixed(4);
    if(Math.abs(target-current)>.00015)request();
  }
  window.addEventListener('scroll',request,{passive:true});
  window.addEventListener('resize',request,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)request()});
  // Exposed only for reproducible QA, never for user tracking.
  window.__jgFilmQA=()=>({
    desired,shown,chapter,decoded:cache.size,pending:pending.size,
    visible:document.body.classList.contains('has-film'),currentProgress:current,
    bridgeEnd,total,failed:[...failed]
  });
  queueAround(0);request();
})();
