const fs=require('fs'),{EventEmitter}=require('events');
const MODES=['codex','chat','work'];
const state=()=>({threadId:null,title:'',running:false,output:'',progress:'选择会话后开始对话',error:null,pending:false});
const userText=(t,carrier)=>{const direct=(t.items||[]).filter(x=>x.type==='userMessage').flatMap(x=>x.content||[]).filter(x=>x.type==='text').map(x=>x.text).join('\n');if(direct)return direct;for(const x of t.items||[]){if(x.type!=='functionCallOutput'||x.name!=='send_message_to_thread'||x.namespace!=='codex_app'||x.output?.truncated)continue;const m=x.output?.text?.match(/^<codex_delegation>\s*<source_thread_id>([^<]+)<\/source_thread_id>\s*<input>([\s\S]*)<\/input>\s*<\/codex_delegation>$/);if(m&&carrier&&m[1]===carrier)return m[2]}return ''};
const assistantText=t=>{const all=(t.items||[]).filter(x=>x.type==='agentMessage'),final=all.filter(x=>x.phase==='final');return(final.length?final:all).map(x=>x.text||'').join('\n\n')};
const active=s=>['active','inProgress','in_progress','running'].includes(typeof s==='object'?s?.type:s);
class ConversationHub extends EventEmitter{
 constructor({bridge,file,clock=()=>Date.now(),sleep=ms=>new Promise(r=>setTimeout(r,ms))}){super();this.bridge=bridge;this.file=file;this.clock=clock;this.sleep=sleep;this.mode='codex';this.states={chat:state(),work:state()};this.threads=[];this.error=null;this.loading=false;this.refreshing=null;this.reads=new Map();this.closed=false;this.operations=new Set();try{const saved=JSON.parse(fs.readFileSync(file));if(MODES.includes(saved.mode))this.mode=saved.mode;for(const m of ['chat','work'])if(saved.bindings?.[m])Object.assign(this.states[m],saved.bindings[m]);if(saved.carrierThreadId)this.bridge.carrierThreadId=saved.carrierThreadId}catch{}}
 save(){const bindings=Object.fromEntries(['chat','work'].map(m=>[m,{threadId:this.states[m].threadId,title:this.states[m].title}]));fs.writeFileSync(this.file,JSON.stringify({mode:this.mode,carrierThreadId:this.bridge.carrierThreadId,bindings},null,2))}
 snapshot(){return{mode:this.mode,states:Object.fromEntries(Object.entries(this.states).map(([m,s])=>[m,{threadId:s.threadId,title:s.title,running:s.running,output:s.output,progress:s.progress,error:s.error,pending:s.pending}])),threads:this.threads.map(t=>({...t})),loading:this.loading,error:this.error}}
 changed(){this.emit('change')}
 setMode(mode){if(!MODES.includes(mode))throw Error('无效对话模式');this.mode=mode;this.save();this.changed();if(mode!=='codex')this.refresh().then(()=>this.read(mode)).catch(()=>{});return this.snapshot()}
 async refresh(){if(this.refreshing)return this.refreshing;this.loading=true;this.changed();this.refreshing=(async()=>{try{const raw=await this.bridge.list();const seen=new Set();this.threads=[...(raw.pinnedThreads||[]),...(raw.threads||[])].filter(t=>['chatgpt','codex'].includes(t.kind)&&!seen.has(t.id)&&seen.add(t.id)).map(t=>({id:t.id,title:t.title,kind:t.kind,running:active(t.status)}));this.error=null;return this.threads}catch(e){this.error=e.message;throw e}finally{this.loading=false;this.refreshing=null;this.changed()}})();return this.refreshing}
 async bind(mode,id){if(!['chat','work'].includes(mode))throw Error('无效对话模式');const s=this.states[mode];if(s.running||s.pending)throw Error('当前会话仍在处理中，请等待结束后更换。');const t=this.threads.find(t=>t.id===id);if(!t||(mode==='chat'&&t.kind!=='chatgpt'))throw Error('请选择有效会话');if(this.states[mode==='chat'?'work':'chat'].threadId===id)throw Error('聊天和工作模式应绑定不同会话，以保留各自上下文。');Object.assign(s,state(),{threadId:id,title:t.title,progress:'正在读取会话'});this.save();this.changed();await this.read(mode)}
 async read(mode){const s=this.states[mode],id=s?.threadId;if(!id||s.running||this.closed)return;if(this.reads.has(mode))return this.reads.get(mode);
  const run=(async()=>{try{const raw=await this.bridge.read(id);if(s.threadId!==id)return;const turns=raw.turns||[],last=turns.find(t=>assistantText(t));s.output=last?assistantText(last):'';s.error=null;if(!s.pending)s.progress=active(raw.thread?.status)?'客户端正在处理':'已同步客户端回复';if(s.pending&&s.pendingText){const match=turns.find(t=>!s.baselineIds?.includes(t.id)&&userText(t,this.bridge.carrierThreadId)===s.pendingText);if(match&&['completed','failed','interrupted'].includes(match.status)){s.output=assistantText(match);s.pending=false;s.pendingText=null;s.baselineIds=null;s.progress=match.status==='completed'?'回复完成':'任务已结束';s.error=null;this.writeReceipt(mode,s)}}this.changed();return raw}catch(e){if(s.threadId===id){s.error=e.message;this.changed()}throw e}finally{this.reads.delete(mode)}})();this.reads.set(mode,run);return run;
 }
 async send(mode,text){
  if(!['chat','work'].includes(mode))throw Error('无效对话模式');if(typeof text!=='string'||!text.trim()||text.length>18000)throw Error('请输入 1–18000 字的内容');
  const s=this.states[mode],id=s.threadId;if(!id)throw Error('请先选择要发送到的会话');if(s.running||s.pending||this.operations.has(id))throw Error('该会话仍在处理或等待确认，请先刷新回复，不要重复发送。');
  this.operations.add(id);s.running=true;s.error=null;s.progress='正在检查会话';this.changed();let before;
  try{before=await this.bridge.read(id);if(!before.thread||before.thread.id!==id)throw Error('客户端返回的会话不匹配');if(mode==='chat'&&before.thread.kind!=='chatgpt')throw Error('目标不是 ChatGPT 聊天');if(active(before.thread.status))throw Error('目标会话正在运行，请等待当前回复完成')}catch(e){s.running=false;s.error=e.message;this.operations.delete(id);this.changed();throw e}
  s.output='';s.progress='正在发送';s.baselineIds=(before.turns||[]).map(t=>t.id);s.pendingText=text;s.pending=true;this.changed();
  // Persist an unresolved receipt before sending. Restart never silently retries.
  this.writeReceipt(mode,s);
  let sendError=null;try{await this.bridge.send(id,text)}catch(e){sendError=e.message}
  s.progress=sendError?'正在确认消息是否送达':'正在等待回复';this.changed();
  void this.observe(mode,id,text,s.baselineIds,sendError);return{accepted:true,mode,threadId:id,deliveryUncertain:!!sendError};
 }
 writeReceipt(mode,s){const records={};try{Object.assign(records,JSON.parse(fs.readFileSync(this.file+'.pending')))}catch{}if(s.pending)records[mode]={threadId:s.threadId,text:s.pendingText,baselineIds:s.baselineIds};else delete records[mode];fs.writeFileSync(this.file+'.pending',JSON.stringify(records))}
 recover(){try{const records=JSON.parse(fs.readFileSync(this.file+'.pending'));for(const [mode,r]of Object.entries(records))if(this.states[mode]?.threadId===r.threadId){Object.assign(this.states[mode],{pending:true,pendingText:r.text,baselineIds:r.baselineIds,progress:'上次发送结果尚需确认，请刷新回复'});}}catch{}}
 async observe(mode,id,text,baselineIds,sendError){const s=this.states[mode],deadline=this.clock()+10*60*1000;let matched=false;
  while(!this.closed&&(matched||this.clock()<deadline)){try{const raw=await this.bridge.read(id),turn=(raw.turns||[]).find(t=>!baselineIds.includes(t.id)&&userText(t,this.bridge.carrierThreadId)===text);if(turn){matched=true;s.output=assistantText(turn);s.progress=s.output?'正在回复':'正在思考';s.error=null;if(['completed','failed','interrupted'].includes(turn.status)){s.running=false;s.pending=false;s.pendingText=null;s.baselineIds=null;s.progress=turn.status==='completed'?'回复完成':turn.status==='interrupted'?'已停止':'任务失败';s.error=turn.error?.message||null;this.writeReceipt(mode,s);this.operations.delete(id);this.changed();return}}else s.progress=sendError?'尚未确认送达，正在读取会话':'正在等待客户端开始回复';this.changed()}catch(e){s.error=e.message;s.progress='连接暂时中断，正在恢复读取';this.changed()}
   await this.sleep(3500);
  }
  s.running=false;s.progress=matched?'回复尚未结束，请稍后刷新':'尚未确认送达，请刷新会话后检查';s.error='不会自动重发此消息。';this.operations.delete(id);this.changed();
 }
 close(){this.closed=true}
}
module.exports={ConversationHub,userText,assistantText,active};
