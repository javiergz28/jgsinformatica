/* C6.9-B G1.1 / frame-based cinematic camera study.
 * Genuine Cycles 25-keyframe animatic, NOT the final high-density reel.
 * Keep the still photo visible until a matching frame has loaded; never blank canvas.
 */
(()=>{
  const reel=document.querySelector('[data-reel]');
  const canvas=document.querySelector('[data-film-canvas]');
  const label=document.querySelector('[data-pose-label]');
  const fill=document.querySelector('[data-progress-fill]');
  if(!reel||!canvas||!label||!fill)return;
  const total=Number(canvas.dataset.frameCount);
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData=navigator.connection?.saveData===true;
  if(reduce||saveData||total!==25){document.body.classList.add('film-static');return;}
  const ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx){document.body.classList.add('film-static');return;}
  const clamp=n=>Math.max(0,Math.min(1,n));
  const frames=new Map(),pending=new Set(),queue=[];
  const small=matchMedia('(max-width:850px)').matches;
  const MAX_PARALLEL=small?2:4;
  let inFlight=0,raf=0,current=0,lastTime=0,requested=0,shown=-1;
  const url=i=>'./assets/boot/c6-9-b/pose-'+String(i).padStart(2,'0')+'.webp';
  const checkQueue=()=>{
    queue.sort((a,b)=>Math.abs(a-requested)-Math.abs(b-requested));
    while(inFlight<MAX_PARALLEL&&queue.length){
      const i=queue.shift();
      if(frames.has(i))continue;
      inFlight++;
      const image=new Image();
      image.decoding='async';
      image.onload=()=>{frames.set(i,image);pending.delete(i);inFlight--;request();checkQueue();};
      image.onerror=()=>{pending.delete(i);inFlight--;checkQueue();};
      image.src=url(i);
    }
  };
  function prioritize(i){
    requested=i;
    for(let k=0;k<total;k++)if(!pending.has(k)&&!frames.has(k)){pending.add(k);queue.push(k);}
    checkQueue();
  }
  const progress=()=>{
    const rect=reel.getBoundingClientRect();
    return clamp(-rect.top/Math.max(1,rect.height-innerHeight));
  };
  function draw(p){
    const raw=p*(total-1),base=Math.floor(raw),next=Math.min(total-1,base+1);
    let match=-1;
    if(frames.has(base))match=base;
    else{
      for(let d=1;d<=4;d++){
        if(frames.has(base-d)){match=base-d;break}
        if(frames.has(base+d)){match=base+d;break}
      }
    }
    if(match<0)return; // Keep the last successful frame or accessible poster visible.
    const blend=match===base&&next!==base&&frames.has(next);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.globalAlpha=1;
    ctx.drawImage(frames.get(match),0,0,canvas.width,canvas.height);
    if(blend){ctx.globalAlpha=raw-base;ctx.drawImage(frames.get(next),0,0,canvas.width,canvas.height);ctx.globalAlpha=1;}
    document.body.classList.add('has-frame');
    shown=match;
    canvas.dataset.currentFrame=String(shown);
    label.textContent='FRAME '+String(Math.round(raw)+1).padStart(3,'0')+' / 025';
  }
  function request(){if(!raf)raf=requestAnimationFrame(update);}
  function update(now){
    raf=0;
    const target=progress();
    const dt=lastTime?Math.max(1,Math.min(64,now-lastTime)):16;
    lastTime=now;
    const alpha=1-Math.exp(-dt/85);
    current=Math.abs(target-current)>.0001?current+(target-current)*alpha:target;
    prioritize(Math.round(target*(total-1)));
    draw(current);
    fill.style.transform='scaleX('+current.toFixed(4)+')';
    reel.dataset.progress=current.toFixed(3);
    if(Math.abs(target-current)>.0001)request();
  }
  window.addEventListener('scroll',request,{passive:true});
  window.addEventListener('resize',request,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)request()});
  window.__jgFilmQA=()=>({requested,shown,readyFrames:frames.size,hasFrame:document.body.classList.contains('has-frame')});
  prioritize(0);request();
})();
