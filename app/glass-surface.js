const defaults={glassColor:'#365949',glassTransparency:60,glassBlur:true};
export function paintGlass(config={},native=false){
 const c={...defaults,...config},color=/^#[0-9a-f]{6}$/i.test(c.glassColor)?c.glassColor:defaults.glassColor;
 const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)),alpha=1-Math.min(100,Math.max(0,Number(c.glassTransparency)||0))/100;
 const luminance=rgb.reduce((sum,v,i)=>sum+(v/255<=.04045?v/3294.6:((v/255+.055)/1.055)**2.4)*[.2126,.7152,.0722][i],0);const light=luminance>.45&&alpha>.32;
 const root=document.documentElement;root.style.setProperty('--glass-rgb',rgb.join(' '));root.style.setProperty('--glass-alpha',alpha.toFixed(2));
 root.dataset.menuTone=luminance>.45?'light':'dark';root.dataset.glassTone=light?'light':'dark';root.dataset.nativeGlass=String(native);root.dataset.glassBlur=String(c.glassBlur!==false);
}
export function bindGlassLight(card){
 let frame=0,point=null;const motion=matchMedia('(prefers-reduced-motion: reduce)');
 card.addEventListener('pointermove',e=>{if(motion.matches)return;const b=card.getBoundingClientRect();point=[(e.clientX-b.left)/b.width,(e.clientY-b.top)/b.height];if(!frame)frame=requestAnimationFrame(()=>{frame=0;card.style.setProperty('--glint-x',Math.round(point[0]*100)+'%');card.style.setProperty('--glint-y',Math.round(point[1]*100)+'%')})},{passive:true});
 const reset=()=>{cancelAnimationFrame(frame);frame=0;card.style.removeProperty('--glint-x');card.style.removeProperty('--glint-y')};card.addEventListener('pointerleave',reset);motion.addEventListener('change',reset);
}
