import{bindAppearanceFold}from'./appearance-fold.js';bindAppearanceFold();
import{bindGlassControls}from'./glass-controls.js';
const glassControls=bindGlassControls(window.petHost);
import{mountMedia}from'./media-widget.js';
import{bindInputActivity}from'./input-activity.js';
import{ConversationUI}from'./conversation-ui.js';
const typingActivity=bindInputActivity(window.petHost);
const api=window.petHost,$=id=>document.getElementById(id);let snapshot,editingSize=false,newThread=false,requestKey='';
const tell=text=>$('result').textContent=text;
const conversation=new ConversationUI({api,prompt:$('prompt'),onChange:()=>typingActivity.stop(),notice:tell});
$('prompt').before(conversation.root);const binding=document.createElement('select');binding.className='conversation-binding';binding.setAttribute('aria-label','当前模式会话');binding.hidden=true;conversation.root.after(binding);binding.onchange=()=>conversation.select(binding.value);
async function call(action,payload={}){const r=await api.action(action,payload);if(!r.ok)throw Error(r.error);return r.value}
const safe=fn=>async(...args)=>{try{await fn(...args)}catch(e){tell(e.message)}};
$('hide').onclick=()=>api.action('hidePanel');$('codex').onclick=safe(()=>call('openCodex'));$('gpt').onclick=safe(()=>call('openGPT'));
async function size(value){const v=Number(value);if(!Number.isFinite(v))return;const result=await call('size',{size:v});$('size').value=$('sizeNumber').value=result;$('sizeLabel').textContent=result+' px'}
let sizeTimer;for(const id of ['size','sizeNumber']){$(id).oninput=()=>{editingSize=true;clearTimeout(sizeTimer);const value=$(id).value;sizeTimer=setTimeout(safe(async()=>{await size(value);editingSize=false}),35)};$(id).onchange=safe(async()=>{await size($(id).value);editingSize=false})}
for(const id of ['facing','gaze','autoStart'])$(id).onchange=safe(async()=>{await call('settings',{[id]:id==='facing'?$(id).value:$(id).checked})});
$('pose').onchange=safe(()=>call('pose',{state:$('pose').value}));$('chooseDir').onclick=safe(async()=>{const dir=await call('chooseDir');if(dir)$('cwd').textContent=dir});
$('newTask').onclick=()=>{newThread=true;$('threadMode').textContent='新建桌宠任务';$('prompt').focus()};
async function send(){typingActivity.stop();if(!$('prompt').value.trim())return;$('send').disabled=true;try{await conversation.send({newThread});newThread=false}finally{$('send').disabled=!!conversation.state.running||!!conversation.state.pending}}
$('send').onclick=safe(send);$('prompt').onkeydown=safe(async e=>{if(e.ctrlKey&&e.key==='Enter'){e.preventDefault();await send()}});
$('draft').onclick=safe(async()=>{await call('draft',{text:$('prompt').value});tell('已带入 Codex 输入框，请在主窗口发送。')});$('stop').onclick=safe(()=>call('stop'));
function requestUI(requests){
 const key=JSON.stringify(requests.map(r=>r.id));if(key===requestKey)return;requestKey=key;$('requests').replaceChildren();
 for(const req of requests){const box=document.createElement('div');box.className='request';const title=document.createElement('strong');title.textContent=req.method.endsWith('requestApproval')?'需要你确认':'需要补充信息';box.append(title);
  const p=document.createElement('p');p.textContent=[req.params.reason,req.params.command,req.params.cwd].filter(Boolean).join('\n');box.append(p);
  if(req.params.changes){const diff=document.createElement('pre');diff.textContent=req.params.changes.map(c=>[c.path,c.diff||JSON.stringify(c)].join('\n')).join('\n\n');box.append(diff)}
  if(req.method.endsWith('requestApproval')){for(const [text,value] of [['仅本次允许','accept'],['拒绝','decline']]){const b=document.createElement('button');b.textContent=text;b.onclick=safe(()=>call('answer',{id:req.id,value}));box.append(b)}}
  else{const fields=[];for(const q of req.params.questions||[]){const label=document.createElement('label');label.textContent=q.question;const input=document.createElement('textarea');input.placeholder=(q.options||[]).map(o=>o.label).join(' / ');label.append(input);box.append(label);fields.push([q.id,input])}const b=document.createElement('button');b.textContent='提交回答';b.onclick=safe(()=>call('answer',{id:req.id,value:Object.fromEntries(fields.map(([id,input])=>[id,input.value]))}));box.append(b)}
  $('requests').append(box);
 }
}
api.onStatus(s=>{
 snapshot=s;glassControls.update(s);conversation.update(s);binding.hidden=!conversation.remote;
 if(conversation.remote){const threads=conversation.threads;const ids=threads.map(t=>t.id+':'+t.title).join('|');if(binding.dataset.items!==ids){binding.dataset.items=ids;binding.replaceChildren(new Option('选择已有会话',''),...threads.map(t=>new Option(t.title,t.id)))}binding.value=conversation.state.threadId||'';binding.disabled=!!conversation.state.running||!!conversation.state.pending}
 for(const id of ['newTask','chooseDir','cwd','draft','stop'])$(id).hidden=conversation.remote;
 const c=s.config||{};$('size').max=$('sizeNumber').max=s.sizeLimit||1000;if(!editingSize){$('size').value=$('sizeNumber').value=c.size||340;$('sizeLabel').textContent=(c.size||340)+' px'}
 $('facing').value=c.facing||'auto';$('gaze').checked=c.gaze!==false;$('autoStart').checked=!!c.autoStart;$('pose').value=s.manual||'auto';$('cwd').textContent=c.cwd||'';
 $('connection').textContent=s.desktopOpen?'Codex 已打开':'Codex 未打开';$('taskCount').textContent=s.count+' 个运行中';
 $('tasks').replaceChildren();for(const t of (s.tasks||[]).slice(0,12)){const row=document.createElement('div');row.className='task'+(t.running?' running':'');const b=document.createElement('button');b.textContent=t.title;b.title=t.title;b.onclick=safe(()=>call('openCodex',{threadId:t.id}));const p=document.createElement('p');p.textContent=(t.running?'● ':'○ ')+t.activity+' · '+new Date(t.updatedAt).toLocaleTimeString('zh-CN');row.append(b,p);$('tasks').append(row)}
 const client=conversation.remote?conversation.state:s.client||{};$('send').disabled=!!client.running||!!client.pending||conversation.busy||(conversation.remote&&!client.threadId);$('stop').disabled=!client.running;if($('reply').textContent!==(client.output||''))$('reply').textContent=client.output||'';if(conversation.remote)$('threadMode').textContent=client.title||'请选择客户端中的已有会话';else if(!newThread)$('threadMode').textContent=client.threadId?'继续上一个桌宠任务':'新建桌宠任务';if(client.running)tell(client.progress||'正在运行');else if(client.error)tell(client.error);else if(conversation.remote)tell(client.progress||'');requestUI(s.client?.requests||[]);
});
api.panelReady();

const media=mountMedia($('embeddedMusic'));$('music').onclick=()=>media.focus();
