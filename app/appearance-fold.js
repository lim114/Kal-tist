export function bindAppearanceFold(){
 const details=document.getElementById('appearanceSettings'),summary=details.querySelector('summary'),body=document.getElementById('appearanceBody'),key='esperanta.appearance.open';let animation=null,version=0,target=false;
 try{target=localStorage.getItem(key)==='true'}catch{}details.open=target;
 const save=()=>{try{localStorage.setItem(key,String(target))}catch{}};
 summary.addEventListener('click',e=>{
  e.preventDefault();target=!target;save();const current=details.open?body.getBoundingClientRect().height:0,token=++version;animation?.cancel();
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){details.open=target;body.style.height='';return}
  details.open=true;const end=target?body.scrollHeight:0;
  animation=body.animate([{height:current+'px',opacity:current?1:0},{height:end+'px',opacity:target?1:0}],{duration:230,easing:'cubic-bezier(.2,.75,.2,1)'});
  animation.onfinish=()=>{if(token!==version)return;details.open=target;animation=null;if(!target&&body.contains(document.activeElement))summary.focus()};
 });
}
