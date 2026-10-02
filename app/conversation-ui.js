// Mode changes preserve drafts in this window; outgoing requests capture mode/id.
export class ConversationUI{
 constructor({api,prompt,onChange,notice}){this.api=api;this.prompt=prompt;this.onChange=onChange;this.notice=notice;this.mode='codex';this.key='codex';this.drafts=new Map();this.data={};this.busy=false;
  this.root=document.createElement('div');this.root.className='conversation-controls';
  this.root.innerHTML='<div class="conversation-modes" role="group" aria-label="对话模式"><button type="button" data-mode="chat" aria-pressed="false">ChatGPT 聊天</button><button type="button" data-mode="work" aria-pressed="false">工作模式</button><button type="button" data-mode="codex" aria-pressed="true">Codex</button></div><div class="conversation-tools" hidden><button type="button" data-chat-refresh>刷新会话</button><span class="conversation-hint"></span></div>';
  this.root.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>this.run(()=>api.action('conversationMode',{mode:b.dataset.mode})));
  this.root.querySelector('[data-chat-refresh]').onclick=()=>this.run(()=>api.action('conversationRefresh',{mode:this.mode}));
 }
 async run(fn){try{const r=await fn();if(!r.ok)throw Error(r.error)}catch(e){this.notice(e.message)}}
 update(snapshot){const d=snapshot.conversations||{mode:'codex',states:{},threads:[]},mode=d.mode||'codex',key=mode==='codex'?'codex':mode+':'+(d.states?.[mode]?.threadId||'');if(key!==this.key){this.drafts.set(this.key,this.prompt.value);this.prompt.value=this.drafts.get(key)||'';this.key=key;this.mode=mode;this.onChange?.()}
  this.mode=mode;this.data=d;this.root.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));this.root.querySelector('.conversation-tools').hidden=mode==='codex';this.root.querySelector('[data-chat-refresh]').disabled=!!d.loading;
  this.root.querySelector('.conversation-hint').textContent=d.loading?'正在连接客户端…':d.error|| (mode==='work'?'沿用所选工作会话的执行环境':'沿用当前客户端登录');
  this.prompt.maxLength=mode==='codex'?80000:18000;this.prompt.placeholder=mode==='codex'?'输入指令…':mode==='work'?'向工作会话发送任务…':'输入聊天内容…';
 }
 get remote(){return this.mode!=='codex'}
 get state(){return this.data.states?.[this.mode]||{}}
 get threads(){return(this.data.threads||[]).filter(t=>this.mode==='work'||t.kind==='chatgpt')}
 async select(id){await this.run(()=>this.api.action('conversationBind',{mode:this.mode,threadId:id}))}
 async send(extra={}){if(this.busy)return;const text=this.prompt.value.trim();if(!text)return;const mode=this.mode,key=this.key,threadId=this.state.threadId;this.busy=true;
  try{const r=await this.api.action('send',{...extra,text,mode,...(mode==='codex'?{}:{threadId})});if(!r.ok)throw Error(r.error);if(this.key===key&&this.prompt.value.trim()===text)this.prompt.value='';if((this.drafts.get(key)||'').trim()===text)this.drafts.delete(key);this.notice('已发送');return r.value}finally{this.busy=false}
 }
}
