import{mountMedia}from'./media-widget.js';
import{bindInputActivity}from'./input-activity.js';
import{TaskPicker}from'./task-picker.js';
import{replaceText,fadeContent,resizeContent,reducedMotion}from'./bubble-animations.js';
import{paintGlass,bindGlassLight}from'./glass-surface.js';
import{ConversationUI}from'./conversation-ui.js';
bindGlassLight(document.getElementById('bubble'));
const api=window.petHost,$=id=>document.getElementById(id),typingActivity=bindInputActivity(api);
let snapshot={},selected=null,codexSelected=null,displayed=null,sizeFrame=0,lastHeight=0,closing=false;
const conversation=new ConversationUI({api,prompt:$('prompt'),onChange:()=>typingActivity.stop(),notice:text=>{replaceText($('notice'),text);size()}});$('bubble').querySelector('header').after(conversation.root);
const readable=text=>String(text||'').replace(/!\[([^\]]*)\]\([^)]*\)/g,'[附件：$1]').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/^#{1,6}\s+/gm,'').replace(/\*\*([^*]+)\*\*/g,'$1').replace(/^[-*]\s+/gm,'• ');
function size(){if(sizeFrame)return;sizeFrame=requestAnimationFrame(()=>{sizeFrame=0;const h=Math.ceil($('bubble').scrollHeight)+18;if(h!==lastHeight){lastHeight=h;api.bubbleResize(h)}if(picker.opened)picker.fit()})}
const picker=new TaskPicker($('taskPicker'),id=>{if(conversation.remote)conversation.select(id);else{selected=codexSelected=id;render(snapshot,true)}});
const resizeObserver=new ResizeObserver(size);resizeObserver.observe($('bubble'));resizeObserver.observe($('reply-wrap'));
function render(s,animate=false){
 snapshot=s;paintGlass(s.config,!!s.glassNative);conversation.update(s);let list=conversation.remote?[...conversation.threads]:(s.tasks||[]);const c=conversation.remote?conversation.state:s.client||{};
 if(conversation.remote){selected=c.threadId||'';if(selected&&!list.some(t=>t.id===selected))list.unshift({id:selected,title:c.title,running:c.running})}else{selected=codexSelected;if(!list.some(t=>t.id===selected))selected=(list.find(t=>t.running)||list[0])?.id||'';codexSelected=selected}
 picker.update(list,selected);const task=list.find(t=>t.id===selected),own=conversation.remote||!!task&&task.id===c.threadId,running=own?c.running:task?.running;
 $('dot').classList.toggle('running',!!running);
 replaceText($('activity'),conversation.remote?(c.progress||'请选择会话'):(task?.activity||'双击角色可触摸互动')+(s.count>1?` · 共 ${s.count} 个任务`:''));
 const replyText=readable((own?c.output:'')||task?.reply?.text||'');
 const displayKey=conversation.mode+':'+selected,changed=displayed!==null&&displayed!==displayKey;
 if(changed||animate){resizeContent($('reply-wrap'),()=>replaceText($('reply'),replyText));fadeContent([$ ('activity'),$('reply')]);$('reply').scrollTop=0}else replaceText($('reply'),replyText);
 displayed=displayKey;
 replaceText($('notice'),c.requests?.length?'需要你的确认，请打开任务面板。':c.error||'');$('send').disabled=!!c.running||!!c.pending||conversation.busy||(conversation.remote&&!selected);$('open').disabled=!task;$('open').textContent=conversation.remote?'打开会话':'打开任务';$('draft').hidden=conversation.remote;$('taskPicker').querySelector('.task-menu-caption span').textContent=conversation.mode==='work'?'选择已有工作会话':conversation.remote?'切换聊天':'切换任务';
 $('follow').classList.toggle('attached',!s.config?.bubblePosition);size();
}
async function call(action,p={}){const r=await api.action(action,p);if(!r.ok)throw Error(r.error);return r.value}
const safe=fn=>async e=>{try{await fn(e)}catch(err){replaceText($('notice'),err.message);size()}};
$('follow').onclick=safe(async()=>{await call('followBubble');$('follow').classList.remove('confirmed');requestAnimationFrame(()=>$('follow').classList.add('confirmed'));setTimeout(()=>$('follow').classList.remove('confirmed'),550)});
$('expand').onclick=()=>{picker.close();const on=!document.body.classList.contains('expanded');resizeContent($('reply-wrap'),()=>document.body.classList.toggle('expanded',on));$('expand').setAttribute('aria-expanded',String(on));$('expand').title=on?'收起回复':'展开回复';$('expand').setAttribute('aria-label',$('expand').title);size()};
$('close').onclick=async()=>{if(closing)return;closing=true;picker.close();typingActivity.stop();document.body.classList.remove('ui-enter');document.body.classList.add('ui-exit');if(!reducedMotion())await new Promise(r=>setTimeout(r,150));api.bubbleDismiss();document.body.classList.remove('ui-exit');closing=false};
$('open').onclick=safe(()=>conversation.remote?call('conversationOpen',{mode:conversation.mode}):call('openCodex',{threadId:selected}));
$('codex').onclick=safe(()=>call('openCodex'));
$('input').onclick=()=>{picker.close();$('composer').hidden=!$('composer').hidden;$('embeddedMusic').hidden=$('composer').hidden;$('input').textContent=$('composer').hidden?'输入指令':'收起输入';if(!$('composer').hidden){fadeContent([$ ('composer'),$('embeddedMusic')]);$('prompt').focus()}else typingActivity.stop();size()};
$('notice').onclick=()=>{if(snapshot.client?.requests?.length)api.panel()};
$('draft').onclick=safe(()=>call('draft',{text:$('prompt').value}));
$('composer').onsubmit=safe(async e=>{e.preventDefault();typingActivity.stop();await conversation.send();size()});
api.onStatus(render);api.panelReady();
const media=mountMedia($('embeddedMusic'));
function revealMedia(){$('composer').hidden=false;$('embeddedMusic').hidden=false;$('input').textContent='收起输入';size();media.focus()}
$('music').onclick=revealMedia;
api.onPreview(s=>{if(s?.focusMedia)revealMedia();if(s?.bubbleShown){document.body.classList.remove('ui-exit','ui-enter');requestAnimationFrame(()=>document.body.classList.add('ui-enter'));setTimeout(()=>document.body.classList.remove('ui-enter'),240)}});
