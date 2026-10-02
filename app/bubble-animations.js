const easing='cubic-bezier(.2,.75,.2,1)';
export const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
export function replaceText(el,text){if(el.textContent!==text)el.textContent=text}
export function fadeContent(els){if(reducedMotion())return;for(const el of els){el.getAnimations().forEach(a=>a.cancel());el.animate([{opacity:.35,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:190,easing})}}
// Change only the wrapper's measured height. Text is never scaled or blurred.
export async function resizeContent(wrapper,change){
 const old=wrapper.getBoundingClientRect().height;wrapper.getAnimations().forEach(a=>a.cancel());change();const next=wrapper.getBoundingClientRect().height;
 if(reducedMotion()||Math.abs(old-next)<1)return;
 const animation=wrapper.animate([{height:old+'px'},{height:next+'px'}],{duration:240,easing});try{await animation.finished}catch{}
}
