/* Reproducible C6.8 lab: use isolated Chrome CDP port and local HTTP server.
 * node tools/c6-8-performance-audit.cjs c6-7-preview.html /tmp/control.json
 * node tools/c6-8-performance-audit.cjs c6-8-preview.html /tmp/candidate.json
 * Optionally CDP_PORT=9244 PREVIEW_PORT=8769, set up before running.
 */
const route=process.argv[2]||'c6-7-preview.html';
if(!/^c6-[78]-preview\.html$/.test(route))throw Error('Unsupported route: '+route);
const output=process.argv[3]||'/tmp/jg-C6-8-performance-latest.json';
const cdpPort=Number(process.env.CDP_PORT||9244);
const webPort=Number(process.env.PREVIEW_PORT||8769);
const fs=require('node:fs');
const assert=require('node:assert/strict');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
  const pages=await(await fetch('http://127.0.0.1:'+cdpPort+'/json')).json();
  const page=pages.find(p=>p.type==='page');
  assert(page?.webSocketDebuggerUrl,'QA Chrome page missing');
  const ws=new WebSocket(page.webSocketDebuggerUrl),pending=new Map();let id=0;
  await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true})});
  ws.addEventListener('message',e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(!p)return;pending.delete(x.id);x.error?p.reject(Error(x.error.message)):p.resolve(x.result)});
  const call=(method,params={})=>new Promise((resolve,reject)=>{const i=++id;pending.set(i,{resolve,reject});ws.send(JSON.stringify({id:i,method,params}))});
  const evalJS=async(expression)=>{
    const x=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(x.exceptionDetails)throw Error(JSON.stringify(x.exceptionDetails));
    return x.result.value;
  };
  const errors=[],httpFailures=[];
  ws.addEventListener('message',e=>{
    const x=JSON.parse(e.data);
    if(x.method==='Runtime.exceptionThrown')errors.push(x.params?.exceptionDetails?.text||'Exception');
    if(x.method==='Network.responseReceived'&&x.params?.response?.status>=400&&!x.params.response.url.endsWith('/favicon.ico')) {
      httpFailures.push({url:x.params.response.url,status:x.params.response.status});
    }
  });
  await call('Page.enable');await call('Runtime.enable');await call('Network.enable');
  await call('Network.setCacheDisabled',{cacheDisabled:true});
  await call('Emulation.setCPUThrottlingRate',{rate:3});
  const results=[];
  for(const viewport of [{name:'mobile-440',width:440,height:900,mobile:true},{name:'desktop-1440',width:1440,height:900,mobile:false}]){
    await call('Emulation.setDeviceMetricsOverride',{width:viewport.width,height:viewport.height,mobile:viewport.mobile,screenWidth:viewport.width,screenHeight:viewport.height,deviceScaleFactor:1});
    await call('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:400000,uploadThroughput:400000});
    await call('Page.navigate',{url:'http://127.0.0.1:'+webPort+'/'+route+'?performanceQA=1'});
    await sleep(900);
    await evalJS(`(()=>{
      window.__jgPerf={frameGaps:[],longTasks:[],prev:0,activeTarget:null,activeStart:0,activeSamples:[]};
      const p=window.__jgPerf;
      p.begin=(target)=>{
        p.activeTarget=target;
        p.activeStart=performance.now();
        p.activeSamples=[];
      };
      p.measure=()=>{
        const a=p.activeSamples;
        let hiddenMs=0,visibleFarMs=0;
        for(let i=0;i<a.length-1;i++){
          const span=Math.max(0,a[i+1].t-a[i].t);
          if(!a[i].visible)hiddenMs+=span;
          else if(a[i].error>5)visibleFarMs+=span;
        }
        const near=a.find(s=>s.visible&&s.error<=2);
        return {firstNearMs:near?Math.round(near.t):null,hiddenMs:Math.round(hiddenMs),
          visibleFarMs:Math.round(visibleFarMs),samples:a.length,
          finalError:a.length?a[a.length-1].error:null};
      };
      const loop=(now)=>{
        if(p.prev)p.frameGaps.push(now-p.prev);
        p.prev=now;
        if(p.activeTarget!==null){
          const c=document.querySelector('[data-film-canvas]');
          const frame=Number(c.dataset.currentFrame??-1);
          p.activeSamples.push({t:Math.max(0,now-p.activeStart),
            visible:document.body.classList.contains('has-film'),
            error:Math.abs(Math.round(p.activeTarget*159)-frame)});
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
      try{new PerformanceObserver(list=>{for(const x of list.getEntries())p.longTasks.push(x.duration)}).observe({entryTypes:['longtask']})}catch{}
      return true;
    })()`);
    const checkpoints=[];
    for(const target of [0,.20,.42,.58,.70,.84,1,.65,.35,0]){
      await evalJS(`(()=>{const e=document.querySelector('[data-reel]');window.__jgPerf.begin(${target});window.scrollTo(0,Math.round((e.offsetHeight-innerHeight)*${target}));return scrollY})()`);
      await sleep(450);
      let state=await evalJS(`(()=>{
        const c=document.querySelector('[data-film-canvas]'),s=document.querySelector('[data-reel]'),r=performance.getEntriesByType('resource').filter(x=>x.name.includes('/assets/boot/c6-7/core01-'));
        return {p:Number(s.dataset.progress||0),frame:Number(c.dataset.currentFrame??-1),desired:Math.round(Number(s.dataset.progress||0)*159),resourceRequests:r.length,transferBytes:r.reduce((n,x)=>n+x.transferSize,0),frameGaps:window.__jgPerf.frameGaps.length,overflow:document.documentElement.scrollWidth>innerWidth,hasFilm:document.body.classList.contains('has-film'),timing:window.__jgPerf.measure()}
      })()`);
      checkpoints.push({target,...state});
      assert(!state.overflow,'horizontal overflow on '+viewport.name);
      console.log('C6_8_PERF_POINT',viewport.name,target,'frame',state.frame,'desired',state.desired,'resources',state.resourceRequests);
    }
    // Two additional held jumps (1.5 s each) measure late recovery without
    // changing the original ten 450 ms checkpoints or their comparability.
    const recoveries=[];
    for(const target of [.82,.23]){
      await evalJS(`(()=>{const e=document.querySelector('[data-reel]');window.__jgPerf.begin(${target});window.scrollTo(0,Math.round((e.offsetHeight-innerHeight)*${target}));return true})()`);
      await sleep(1500);
      recoveries.push({target,...await evalJS('window.__jgPerf.measure()')});
    }
    let diagnostic=await evalJS(`(()=>{
      const p=window.__jgPerf,g=p.frameGaps.slice().sort((a,b)=>a-b),r=performance.getEntriesByType('resource').filter(x=>x.name.includes('/assets/boot/c6-7/core01-'));
      return {rafSamples:g.length,rafP50:g[Math.floor(g.length*.5)]||null,rafP95:g[Math.floor(g.length*.95)]||null,rafLongOver50:g.filter(x=>x>50).length,longTasks:p.longTasks.length,longTaskTotalMs:p.longTasks.reduce((a,b)=>a+b,0),resourceRequests:r.length,transferBytes:r.reduce((n,x)=>n+x.transferSize,0),jsHeapBytes:performance.memory?.usedJSHeapSize??null}
    })()`);
    results.push({viewport:viewport.name,checkpoints,recoveries,diagnostic});
    console.log('C6_8_PERF_SUMMARY',viewport.name,JSON.stringify(diagnostic));
  }
  const report={version:'C6.8-B visible-frame audit (450ms cadence + held recovery)',route,deviceEmulation:'Chrome CDP 3x CPU, 80ms RTT, 400000 bytes/s, not real device',limitations:'RAF sampling does not prove a painted frame or real-device performance; firstNearMs null is a right-censored timeout, not 0ms',results,errors,httpFailures};
  fs.writeFileSync(output,JSON.stringify(report,null,2));
  console.log('C6_8_PERFORMANCE_AUDIT_COMPLETE',results.length,'errors',errors.length,'httpFailures',httpFailures.length);
  assert.equal(errors.length,0,'Chrome runtime exceptions detected');
  assert.equal(httpFailures.length,0,'HTTP errors detected');
  ws.close();
})().catch(e=>{console.error('C6_8_PERFORMANCE_FAILED',e);process.exitCode=1});
