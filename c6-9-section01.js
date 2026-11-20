/* C6.9-A G1: intentional pose selector, not a promise of smooth final motion. */
(()=>{
  const slider=document.querySelector('[data-pose-slider]');
  const image=document.querySelector('[data-pose-image]');
  const label=document.querySelector('[data-pose-label]');
  if(!slider||!image||!label)return;
  const uri=i=>'./assets/boot/c6-9-g1/pose-'+String(i).padStart(2,'0')+'.webp';
  let active=0;
  function show(index){
    const next=Math.min(6,Math.max(0,Number(index)|0));
    if(next===active)return;
    image.src=uri(next);
    image.dataset.pose=String(next);
    label.textContent='POSE '+String(next+1).padStart(2,'0')+' / 07';
    active=next;
  }
  slider.addEventListener('input',()=>show(slider.value));
  slider.addEventListener('change',()=>show(slider.value));
})();
