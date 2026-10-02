const {spawn}=require('child_process');
const fs=require('fs'),path=require('path'),os=require('os'),{EventEmitter}=require('events');
function findCodex(){
 const dir=path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'AppData','Local'),'OpenAI','Codex','bin');
 const candidates=[];try{for(const name of fs.readdirSync(dir)){const f=path.join(dir,name,'codex.exe');if(fs.existsSync(f))candidates.push({file:f,time:fs.statSync(f).mtimeMs})}}catch{}
 if(!candidates.length)throw Error('未找到已安装的 Codex 命令行组件，请先打开 Codex。');
 return candidates.sort((a,b)=>b.time-a.time)[0].file;
}
class CodexClient extends EventEmitter{
 constructor(){super();this.pending=new Map();this.requests=new Map();this.items=new Map();this.nextId=1;this.child=null;this.initializing=null;this.threadId=null;this.turnId=null;this.running=false;this.output='';this.progress='尚未发送任务';this.error=null}
 snapshot(){return {threadId:this.threadId,turnId:this.turnId,running:this.running,output:this.output,progress:this.progress,error:this.error,requests:[...this.requests.values()]}}
 changed(){this.emit('change',this.snapshot())}
 receive(m){
  if(m.id!=null&&!m.method){const p=this.pending.get(m.id);if(p){clearTimeout(p.timer);this.pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}return}
  if(m.id!=null&&m.method){
   const supported=['item/commandExecution/requestApproval','item/fileChange/requestApproval','item/tool/requestUserInput'];
   if(!supported.includes(m.method)){this.write({id:m.id,error:{code:-32601,message:'此桌宠不支持该交互，请在 Codex 主窗口执行此任务。'}});return}
   const item=this.items.get(m.params?.itemId);this.requests.set(m.id,{id:m.id,method:m.method,params:{...m.params,changes:item?.changes}});this.progress='等待你的确认';this.changed();return;
  }
  const p=m.params||{};if(p.threadId&&p.threadId!==this.threadId)return;
  if(m.method==='turn/started'){this.running=true;this.turnId=p.turn?.id;this.progress='正在思考'}
  if(m.method==='item/started'){const type=p.item?.type;if(p.item?.id)this.items.set(p.item.id,p.item);this.progress=({commandExecution:'正在执行命令',fileChange:'正在修改文件',webSearch:'正在搜索',mcpToolCall:'正在调用工具',reasoning:'正在思考',agentMessage:'正在回复'})[type]||'正在处理任务'}
  if(m.method==='item/agentMessage/delta')this.output=(this.output+(p.delta||'')).slice(-100000);
  if(m.method==='turn/completed'){this.running=false;this.turnId=null;this.requests.clear();const state=p.turn?.status;this.progress=state==='failed'?'任务失败':state==='interrupted'?'任务已停止':'任务完成';this.error=p.turn?.error?.message||null}
  if(m.method==='error')this.error=p.error?.message||'任务发生错误';
  this.changed();
 }
 write(m){if(!this.child?.stdin.writable)throw Error('Codex 连接已关闭');this.child.stdin.write(JSON.stringify(m)+'\n')}
 request(method,params={}){const id=this.nextId++;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(Error(method+' 响应超时'))},60000);this.pending.set(id,{resolve,reject,timer});try{this.write({id,method,params})}catch(e){clearTimeout(timer);this.pending.delete(id);reject(e)}})}
 async connect(){
  if(this.initializing)return this.initializing;
  this.initializing=(async()=>{
   this.child=spawn(findCodex(),['app-server','--stdio'],{windowsHide:true,env:{...process.env,CODEX_HOME:process.env.CODEX_HOME||path.join(os.homedir(),'.codex')},stdio:['pipe','pipe','pipe']});
   let buffer='';this.child.stdout.setEncoding('utf8');this.child.stdout.on('data',text=>{buffer+=text;let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);try{this.receive(JSON.parse(line))}catch{}}});
   // Server diagnostics may contain private paths; they are not written to disk.
   this.child.stderr.on('data',()=>{});
   const disconnected=(err)=>{for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error(err))}this.pending.clear();this.child=null;this.initializing=null;this.running=false;this.turnId=null;this.threadId=null;this.error=err;this.changed()};
   this.child.on('error',e=>disconnected(e.message));this.child.on('exit',()=>disconnected('Codex 指令连接已结束'));
   await this.request('initialize',{clientInfo:{name:'esperanta_desktop',title:'思衡托桌宠',version:'2.0.0'}});this.write({method:'initialized'});this.error=null;
  })();try{return await this.initializing}catch(e){this.initializing=null;throw e}
 }
 async send(text,cwd,newThread=false){
  if(typeof text!=='string'||!text.trim()||text.length>80000)throw Error('请输入 1–80000 字的指令。');
  if(typeof cwd!=='string'||!path.isAbsolute(cwd)||!fs.statSync(cwd).isDirectory())throw Error('请选择有效的工作目录。');
  if(this.running)throw Error('上一条桌宠任务仍在运行，可停止后继续。');
  await this.connect();
  if(!this.threadId||newThread){const result=await this.request('thread/start',{cwd,approvalPolicy:'on-request',approvalsReviewer:'user',sandbox:'workspace-write'});this.threadId=result.thread.id}
  this.output='';this.items.clear();this.error=null;this.progress='正在发送';this.running=true;this.changed();
  try{const result=await this.request('turn/start',{threadId:this.threadId,cwd,input:[{type:'text',text}]});this.turnId=result.turn.id;this.changed();return {threadId:this.threadId}}catch(e){this.running=false;this.error=e.message;this.changed();throw e}
 }
 async interrupt(){if(this.running&&this.threadId&&this.turnId)await this.request('turn/interrupt',{threadId:this.threadId,turnId:this.turnId})}
 answer(id,value){const req=this.requests.get(id);if(!req)throw Error('请求已过期');let result;
  if(req.method.endsWith('requestApproval')){if(!['accept','decline'].includes(value))throw Error('无效确认');result={decision:value}}
  else{const answers={};for(const q of req.params.questions||[]){const s=value?.[q.id];if(typeof s!=='string')throw Error('请回答所有问题');answers[q.id]={answers:[s]}}result={answers}}
  this.write({id:req.id,result});this.requests.delete(id);this.progress='正在继续';this.changed();
 }
 close(){this.child?.kill()}
}
function threadLink(id,prompt='',cwd=''){
 if(id&&!/^[a-zA-Z0-9-]{8,100}$/.test(id))throw Error('无效任务标识');
 const url=new URL('codex://threads/'+(id||'new'));if(prompt)url.searchParams.set('prompt',prompt);if(cwd&&!id)url.searchParams.set('path',cwd);return url.href;
}
module.exports={CodexClient,findCodex,threadLink};
