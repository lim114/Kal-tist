// Report activity only; never send the draft text for animation tracking.
export function bindInputActivity(api,root=document){
 let timer=null,active=false;
 const stop=()=>{clearTimeout(timer);if(active){active=false;api.typing(false)}};
 const pulse=e=>{if(!e.target.matches('textarea,input[type="text"]'))return;active=true;api.typing(true);clearTimeout(timer);timer=setTimeout(stop,1800)};
 for(const type of ['input','compositionstart','compositionupdate','compositionend'])root.addEventListener(type,pulse);
 root.addEventListener('focusout',e=>{if(e.target.matches('textarea,input[type="text"]'))stop()});
 root.addEventListener('submit',stop);window.addEventListener('blur',stop);window.addEventListener('pagehide',stop);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});return{stop};
}
