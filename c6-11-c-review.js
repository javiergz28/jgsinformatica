(()=>{
  const frameNumbers=[0,100,180,240,300,360,449];
  const names=['PC Y BOTÓN','DESCENSO INICIAL','CURVA Y PROFUNDIDAD','HACIA EL VIDRIO','SISTEMA A LA VISTA','ANTES DEL UMBRAL','NÚCLEO'];
  const slider=document.getElementById('shot-range');
  const old=document.getElementById('old-shot');
  const updated=document.getElementById('new-shot');
  const label=document.getElementById('shot-label');
  if(!slider||!old||!updated||!label)return;
  let index=0;
  const pad=n=>String(n).padStart(3,'0');
  function show(newIndex){
    const i=Math.max(0,Math.min(frameNumbers.length-1,Math.round(Number(newIndex))));
    if(i===index)return;
    index=i;const f=pad(frameNumbers[i]);
    old.src='./assets/boot/c6-11/desktop/core01-'+f+'.webp';
    updated.src='./assets/boot/c6-11-c-study/wide-'+f+'.webp';
    label.textContent=String(i+1).padStart(2,'0')+' / 07 · '+names[i];
  }
  slider.addEventListener('input',()=>show(slider.value));
})();
