// Compact listbox, using the Radix Select interaction pattern without a
// framework or a native OS popup. Titles always enter the DOM as text.
export class TaskPicker {
 constructor(root,onChange){
  this.root=root;this.onChange=onChange;this.items=[];this.selected='';this.active='';this.opened=false;
  this.trigger=root.querySelector('[role=combobox]');this.label=root.querySelector('.task-label');this.popup=root.querySelector('.task-popover');this.list=root.querySelector('[role=listbox]');this.count=root.querySelector('.task-count');
  // Top-layer rendering samples the complete card below the menu instead of
  // being trapped inside the header's compositing/animation group.
  this.popup.setAttribute('popover','manual');
  addEventListener('resize',()=>{if(this.opened)this.fit()});
  document.getElementById('bubble').addEventListener('scroll',()=>{if(this.opened)this.fit()},{passive:true});
  this.trigger.onclick=()=>this.opened?this.close():this.open();
  this.trigger.onkeydown=e=>this.key(e);
  this.list.onpointermove=e=>{const row=e.target.closest('[role=option]');if(row)this.activate(row.dataset.id,false)};
  this.list.onpointerdown=e=>e.preventDefault();
  this.list.onclick=e=>{const row=e.target.closest('[role=option]');if(row)this.choose(row.dataset.id)};
  document.addEventListener('pointerdown',e=>{if(!root.contains(e.target))this.close(false)});
  document.addEventListener('focusin',e=>{if(!root.contains(e.target))this.close(false)});
  addEventListener('blur',()=>this.close(false));
 }
 update(items,selected){
  this.items=items;this.selected=selected||'';
  this.label.textContent=items.find(t=>t.id===selected)?.title||'思衡托 · 已就绪';this.trigger.title=this.label.textContent;
  const ids=items.map(t=>t.id).join('|'),changed=ids!==this.ids;this.ids=ids;
  if(changed){this.list.replaceChildren();items.forEach((t,i)=>{const row=document.createElement('div');row.id='task-option-'+i;row.role='option';row.dataset.id=t.id;row.innerHTML='<span class="task-state"></span><span class="task-option-label"></span><svg class="task-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';this.list.append(row)})}
  this.count.textContent=String(items.length);this.trigger.disabled=!items.length;
  for(const row of this.list.children){const t=items.find(t=>t.id===row.dataset.id);row.querySelector('.task-option-label').textContent=t.title;row.title=t.title;row.setAttribute('aria-selected',String(t.id===selected));row.querySelector('.task-state').classList.toggle('running',!!t.running);row.querySelector('.task-state').title=t.running?'进行中':'已完成'}
  if(!items.some(t=>t.id===this.active))this.active=selected||items[0]?.id||'';
  if(this.opened){if(!items.length)this.close();else{this.activate(this.active);this.fit()}}
 }
 fit(){const trigger=this.trigger.getBoundingClientRect(),card=document.getElementById('bubble').getBoundingClientRect(),width=Math.max(120,Math.min(356,card.width-20,innerWidth-20)),left=Math.max(card.left+10,Math.min(trigger.left-8,card.right-width-10)),top=trigger.bottom+6;this.popup.style.width=width+'px';this.popup.style.left=left+'px';this.popup.style.top=top+'px';this.list.style.maxHeight=Math.max(44,Math.min(208,innerHeight-top-48,card.bottom-top-48))+'px'}
 open(){if(!this.items.length)return;clearTimeout(this.closeTimer);this.opened=true;this.popup.hidden=false;this.popup.inert=false;this.popup.dataset.open='true';if(!this.popup.matches(':popover-open'))this.popup.showPopover();this.trigger.setAttribute('aria-expanded','true');this.root.classList.add('open');this.fit();this.activate(this.selected||this.items[0].id);this.trigger.focus({preventScroll:true})}
 close(focus=false){if(!this.opened)return;this.opened=false;this.popup.dataset.open='false';this.popup.inert=true;this.root.classList.remove('open');this.trigger.setAttribute('aria-expanded','false');this.trigger.removeAttribute('aria-activedescendant');clearTimeout(this.closeTimer);this.closeTimer=setTimeout(()=>{if(!this.opened){this.popup.hidePopover();this.popup.hidden=true}},140);if(focus)this.trigger.focus({preventScroll:true})}
 activate(id,scroll=true){this.active=id;for(const row of this.list.children){row.classList.toggle('active',row.dataset.id===id);if(row.dataset.id===id){this.trigger.setAttribute('aria-activedescendant',row.id);if(scroll)row.scrollIntoView({block:'nearest'})}}}
 choose(id){if(!this.items.some(t=>t.id===id))return;this.close(true);if(id!==this.selected)this.onChange(id)}
 key(e){
  const keys=['ArrowDown','ArrowUp','Home','End','Enter',' ','Escape'];if(e.key==='Tab'){this.close(false);return}if(!keys.includes(e.key)){if(e.key.length===1&&!e.ctrlKey&&!e.metaKey){clearTimeout(this.typeTimer);this.query=(this.query||'')+e.key.toLocaleLowerCase();this.typeTimer=setTimeout(()=>this.query='',650);const found=this.items.find(t=>t.title.toLocaleLowerCase().startsWith(this.query));if(found){if(!this.opened)this.open();this.activate(found.id)}}return}
  e.preventDefault();if(e.key==='Escape'){this.close(true);return}if(!this.opened){this.open();if(e.key==='End')this.activate(this.items.at(-1).id);return}if(e.key==='Enter'||e.key===' '){this.choose(this.active);return}
  let i=this.items.findIndex(t=>t.id===this.active);i=e.key==='Home'?0:e.key==='End'?this.items.length-1:Math.max(0,Math.min(this.items.length-1,i+(e.key==='ArrowDown'?1:-1)));if(this.items[i])this.activate(this.items[i].id);
 }
}
