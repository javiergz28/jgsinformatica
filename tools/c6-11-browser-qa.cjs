const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),{spawn}=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=process.env.QA_OUTPUT,quick=process.env.QA_QUICK==='1';
if(!out)throw Error('QA_OUTPUT required outside repository');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const server=http.createServer((req,res)=>{
 const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
 if(!f.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(f,(e,data)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'application/javascript','.mjs':'application/javascript','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png'})[path.extname(f)]||'application/octet-stream');res.end(data);});
});
let chrome,ws,profile;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=process.env.QA_BASE||`http://127.0.0.1:${server.address().port}`;
 profile=fs.mkdtempSync(path.join(os.tmpdir(),'jg-c611-qa-'));
 chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--disable-background-networking','about:blank'],{stdio:'ignore'});
 const portFile=path.join(profile,'DevToolsActivePort');for(let i=0;i<100&&!fs.existsSync(portFile);i++)await sleep(100);assert(fs.existsSync(portFile),'Chrome startup');
 const port=fs.readFileSync(portFile,'utf8').split('\n')[0];const pages=await(await fetch(`http://127.0.0.1:${port}/json`)).json();ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});let id=0,pend=new Map(),errors=[],httpErrors=[],bytes=0,requests=0;
 ws.onmessage=e=>{const z=JSON.parse(e.data);if(z.id){const q=pend.get(z.id);if(q){pend.delete(z.id);z.error?q.reject(Error(JSON.stringify(z.error))):q.resolve(z.result);}}
  if(z.method==='Runtime.exceptionThrown')errors.push(z.params.exceptionDetails);
  if(z.method==='Network.responseReceived'&&z.params.response.status>=400&&!z.params.response.url.endsWith('/favicon.ico'))httpErrors.push(z.params.response.url);
  if(z.method==='Network.loadingFinished')bytes+=z.params.encodedDataLength;
  if(z.method==='Network.requestWillBeSent')requests++;
 };
 const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pend.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
 const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 await call('Page.enable');await call('Runtime.enable');await call('Network.enable');
 const results=[];const viewports=[{name:'desktop',width:1440,height:900,mobile:false,dpr:1},{name:'mobile',width:390,height:844,mobile:true,dpr:2}];
 const state=()=>ev(`(()=>{const q=window.__jgFilmQA();return {...q,overflow:document.documentElement.scrollWidth>innerWidth+1,poster:document.querySelector('.static-poster img').naturalWidth>0,brand:document.querySelector('.wordmark img').naturalWidth>0,canvasOpacity:getComputedStyle(document.querySelector('canvas')).opacity,heading:document.querySelector('.chapter-panel.is-current .kicker').textContent,contact:document.querySelector('.contact').getBoundingClientRect().top>=0&&document.querySelector('.contact').getBoundingClientRect().bottom<innerHeight};})()`);
 const navigate=async(extra='')=>{await call('Page.navigate',{url:base+'/c6-11-preview.html'+extra});await sleep(450);for(let i=0;i<50;i++){if(await ev('typeof window.__jgFilmQA==="function"'))return;await sleep(100);}throw Error('player unavailable');};
 const goto=async p=>ev(`scrollTo(0,document.querySelector('[data-reel]').offsetTop+(document.querySelector('[data-reel]').offsetHeight-innerHeight)*${p})`);
 const shot=async name=>{const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(r.data,'base64'));};
 for(const v of viewports){
  await call('Emulation.setDeviceMetricsOverride',{width:v.width,height:v.height,mobile:v.mobile,deviceScaleFactor:v.dpr});
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await call('Network.setCacheDisabled',{cacheDisabled:false});
  await navigate('?qa='+v.name);await sleep(1000);
  const checks=[];
  for(const p of (quick?[0]:[0,.12,.28,.46,.6,.7,.765,.78,.9,1,.78,.46,.22,0])){
   await goto(p);let q;
   for(let i=0;i<70;i++){await sleep(60);q=await state();if(q.shown===Math.round(p*449))break;}
   assert(!q.overflow&&q.poster&&q.brand&&q.contact,JSON.stringify(q));assert.equal(q.shown,q.wanted,'settled frame mismatch');
   assert.equal(q.chapter,q.shown<100?0:q.shown<205?1:q.shown<300?2:q.shown<352?3:4);
   assert(q.decoded<= (v.mobile?12:18));assert(q.peakDecoded<=(v.mobile?12:18));
   assert.equal(q.canvasOpacity,'1');checks.push({p,...q});
   if(p===0||p===1||p===.78)await shot('c6-11-'+v.name+'-'+(p===0?'start':p===1?'nucleus':'glass'));
  }
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await navigate('?reduced='+v.name);await sleep(300);const reduced=await state();assert(reduced.static&&reduced.poster&&reduced.brand&&!reduced.visible&&!reduced.overflow);
  await shot('c6-11-'+v.name+'-reduced');
  results.push({viewport:v,checks,reduced});console.log('VIEWPORT_QA',v.name,checks.length,'PASS');
 }
 if(!quick){
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  const script=await call('Page.addScriptToEvaluateOnNewDocument',{source:'Object.defineProperty(navigator,"connection",{value:{saveData:true},configurable:true})'});
  await navigate('?saveData=1');await sleep(300);const saved=await state();assert(saved.static&&saved.poster&&!saved.visible);await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:script.identifier});results.push({saveData:saved});
  await call('Emulation.setScriptExecutionDisabled',{value:true});await call('Page.navigate',{url:base+'/c6-11-preview.html?nojs=1'});await sleep(600);await shot('c6-11-mobile-nojs');await call('Emulation.setScriptExecutionDisabled',{value:false});
  // Throttled laboratory test: 80 ms RTT, 400 KB/s, CPU x3. Never claim physical-phone or p75 field metrics.
  await call('Network.setCacheDisabled',{cacheDisabled:true});await call('Network.clearBrowserCache');
  await call('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:400000,uploadThroughput:200000});await call('Emulation.setCPUThrottlingRate',{rate:3});
  bytes=0;requests=0;await navigate('?throttle=1');await sleep(1500);
  const jumps=[];
  for(const p of [0,.20,.42,.58,.70,.84,1,.65,.35,0]){
   await goto(p);const start=Date.now();let q,nearMs=null,settledMs=null,hiddenMs=0,mismatch=0,prev=Date.now();
   while(Date.now()-start<1600){await sleep(50);q=await state();const now=Date.now();if(!q.visible)hiddenMs+=now-prev;prev=now;
    if(q.chapter!==(q.shown<100?0:q.shown<205?1:q.shown<300?2:q.shown<352?3:4))mismatch++;
    if(Math.abs(q.shown-q.wanted)<=2&&nearMs===null)nearMs=now-start;if(q.shown===q.wanted&&settledMs===null)settledMs=now-start;
   }
   jumps.push({p,nearMs,settledMs,hiddenMs,editorialMismatch:mismatch,...q});
  }
  results.push({throttle:{latency:80,bytesPerSecond:400000,cpuRate:3,bytes,requests,jumps}});
  await call('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});await call('Emulation.setCPUThrottlingRate',{rate:1});
 }
 const report={date:new Date().toISOString(),base,quick,environment:'Chrome desktop/mobile emulation; not physical phone',results,errors,httpErrors};fs.writeFileSync(path.join(out,'browser-qa'+(quick?'-initial':process.env.QA_BASE?'-public':'')+'.json'),JSON.stringify(report,null,2));
 assert.equal(errors.length,0);assert.equal(httpErrors.length,0);console.log('QA_COMPLETE',base,results.length);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{ws?.close();if(chrome){chrome.kill('SIGTERM');await new Promise(r=>{if(chrome.exitCode!==null)r();else chrome.once('exit',r);});}server.close();if(profile)fs.rmSync(profile,{recursive:true,force:true});});
