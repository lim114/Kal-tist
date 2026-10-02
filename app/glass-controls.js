const defaults={glassColor:'#365949',glassTransparency:60,glassBlur:true};
export function bindGlassControls(api){
 const $=id=>document.getElementById(id);let current={...defaults},timer=0,revision=0,pending=false;
 function display(){ $('glassColor').value=current.glassColor;$('glassHex').value=current.glassColor;$('glassTransparency').value=$('glassTransparencyNumber').value=current.glassTransparency;$('glassBlur').checked=current.glassBlur; }
 async function commit(value,version){try{const r=await api.action('settings',value);if(!r.ok)throw Error(r.error);if(version===revision){pending=false;$('glassFeedback').textContent='已保存，气泡实时生效'}}catch(e){if(version===revision){pending=false;$('glassFeedback').textContent=e.message}}}
 function change(p){current={...current,...p};pending=true;revision++;clearTimeout(timer);display();$('glassFeedback').textContent='正在应用…';const version=revision,value={...current};timer=setTimeout(()=>commit(value,version),60)}
 $('glassColor').addEventListener('input',e=>change({glassColor:e.target.value}));
 $('glassHex').addEventListener('change',e=>{if(!/^#[\da-f]{6}$/i.test(e.target.value)){$('glassFeedback').textContent='请输入六位颜色，例如 #365949';display();return}change({glassColor:e.target.value.toLowerCase()})});
 for(const id of ['glassTransparency','glassTransparencyNumber'])$(id).addEventListener('input',e=>{if(e.target.value==='')return;const value=Number(e.target.value);if(!Number.isFinite(value))return;change({glassTransparency:Math.max(0,Math.min(100,Math.round(value)))})});
 $('glassBlur').addEventListener('change',e=>change({glassBlur:e.target.checked}));
 for(const b of document.querySelectorAll('[data-color]'))b.addEventListener('click',()=>change({glassColor:b.dataset.color}));
 $('glassReset').addEventListener('click',()=>change(defaults));display();
 return{update(s){if(!pending&&document.activeElement!==$('glassHex')){current={...defaults,glassColor:s.config?.glassColor??defaults.glassColor,glassTransparency:s.config?.glassTransparency??defaults.glassTransparency,glassBlur:s.config?.glassBlur??defaults.glassBlur};display()}$('glassSupport').textContent=s.glass?.native?'原生背景模糊已启用':s.glass?.supported?'背景模糊已关闭':'当前环境使用透明玻璃兼容显示'}};
}
