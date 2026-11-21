// Bounded native-frame loader. Each image is an independent Blender render.
export const TOTAL=450;
export const clamp=(n,a=0,b=TOTAL-1)=>Math.max(a,Math.min(b,n));
export function chapterFor(frame){return frame<100?0:frame<205?1:frame<300?2:frame<352?3:4;}
export function priorities(target,direction,radius){
  const list=[target];
  for(let d=1;d<=radius;d++){list.push(target+d*direction);if(d<=4)list.push(target-d*direction);}
  return [...new Set(list.filter(i=>i>=0&&i<TOTAL))];
}
export class FrameStore{
 constructor({limit,parallel,radius,url,load,onReady}){
  Object.assign(this,{limit,parallel,radius,url,load,onReady});this.cache=new Map();this.active=new Map();this.queue=[];this.errors=new Set();this.target=0;this.direction=1;this.closed=false;this.peak=0;this.abortCount=0;
 }
 request(target){
  target=clamp(Math.round(target));if(target!==this.target)this.direction=target>this.target?1:-1;this.target=target;
  this.queue=priorities(target,this.direction,this.radius).slice(0,this.limit).filter(i=>!this.cache.has(i)&&!this.active.has(i)&&!this.errors.has(i));
  for(const [i,c] of this.active)if(Math.abs(i-target)>this.radius+4){c.abort();this.abortCount++;}
  this.pump();
 }
 pump(){
  while(!this.closed&&this.active.size<this.parallel&&this.queue.length){
   const i=this.queue.shift();if(this.cache.has(i)||this.active.has(i))continue;
   const controller=new AbortController();this.active.set(i,controller);
   Promise.resolve().then(()=>this.load(this.url(i),controller.signal)).then(bitmap=>{
    if(this.closed||controller.signal.aborted||Math.abs(i-this.target)>this.radius+4){bitmap.close?.();return;}
    this.cache.set(i,bitmap);this.prune();this.peak=Math.max(this.peak,this.cache.size);this.onReady();
   }).catch(error=>{if(error.name!=='AbortError')this.errors.add(i);}).finally(()=>{
    this.active.delete(i);this.pump();
   });
  }
 }
 prune(){
  const far=[...this.cache.keys()].sort((a,b)=>Math.abs(b-this.target)-Math.abs(a-this.target));
  while(this.cache.size>this.limit){const i=far.shift();this.cache.get(i).close?.();this.cache.delete(i);}
 }
 closest(target){
  let best=-1;for(const i of this.cache.keys())if(best<0||Math.abs(i-target)<Math.abs(best-target))best=i;
  return best;
 }
 close(){this.closed=true;for(const c of this.active.values())c.abort();for(const b of this.cache.values())b.close?.();this.cache.clear();this.queue=[];}
}
