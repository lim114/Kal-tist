// Read status envelopes only. Conversation contents are neither retained nor sent anywhere.
const fs=require('fs'),path=require('path');
const TERMINAL=new Set(['task_complete','task_completed','turn_aborted','task_failed','turn_cancelled']);
function statusEvent(line){
 if(line.length>1024*1024||!line.includes('event_msg'))return null;
 let d;try{d=JSON.parse(line)}catch{return null}
 if(d.type!=='event_msg')return null;
 const p=d.payload||{},t=p.type;
 if(t==='task_started')return {running:true,turn:p.turn_id,time:d.timestamp,stage:'thinking',activityLabel:'正在思考'};
 if(TERMINAL.has(t))return {running:false,turn:p.turn_id,time:d.timestamp,stage:t==='task_failed'?'error':'idle',activityLabel:t==='task_failed'?'任务失败':t==='turn_aborted'?'已取消':'已完成'};
 if(t==='item_started'||t==='item_completed'){
  const item=p.item||{},kind=item.type||'',name=String(item.name||item.tool||'');
  const waiting=/requestUserInput|requestApproval|request_user_input/i.test(kind+' '+name);
  const editing=/fileChange|apply_patch/i.test(kind+' '+name);
  const label=waiting?'等待你的输入':editing?'正在修改文件':/commandExecution|exec_command/i.test(kind+' '+name)?'正在执行命令':/webSearch|web__run/i.test(kind+' '+name)?'正在查阅资料':/reasoning/i.test(kind)?'正在思考':/agentMessage/i.test(kind)?'正在回复':/mcp|tool|function/i.test(kind)?'正在使用工具':'正在处理任务';
  return {running:true,turn:p.turn_id,time:d.timestamp,activity:true,stage:waiting&&t==='item_started'?'waiting':'thinking',activityLabel:label};
 }
 // Recent activity recovers a task whose start was earlier than the bounded tail.
 if(t==='agent_reasoning'||t==='agent_message')return {running:true,turn:p.turn_id,time:d.timestamp,activity:true,stage:'thinking',activityLabel:t==='agent_message'?'正在回复':'正在思考'};
 return null;
}
class TaskMonitor{
 constructor(root,{bootTime=Date.now()-require('os').uptime()*1000}={}){this.root=root;this.bootTime=bootTime;this.files=new Map();this.lastScan=0;this.error=null;this.index=[]}
 discover(){
  const found=[];const days=[];
  for(let ago=0;ago<3;ago++){const d=new Date(Date.now()-ago*86400000);days.push(path.join(this.root,String(d.getFullYear()),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')))}
  for(const dir of days){try{for(const f of fs.readdirSync(dir))if(f.endsWith('.jsonl'))found.push(path.join(dir,f))}catch(e){if(e.code!=='ENOENT')this.error=e.code}}
  return [...new Set([...found,...this.files.keys(),...this.index.map(t=>t.rollout_path).filter(Boolean)])];
 }
 poll(processAlive=true){
  this.error=null;
  if(!fs.existsSync(this.root))return {running:false,count:0,error:'找不到本地任务目录'};
  for(const file of this.discover()){
   try{
    const st=fs.statSync(file),old=this.files.get(file);
    if(old&&old.size===st.size&&old.mtime===st.mtimeMs)continue;
    const max=4*1024*1024,start=Math.max(0,st.size-max),buf=Buffer.alloc(st.size-start),fd=fs.openSync(file,'r');
    try{fs.readSync(fd,buf,0,buf.length,start)}finally{fs.closeSync(fd)}
    const lines=buf.toString('utf8').split('\n');if(start)lines.shift();lines.pop();
    let state=old?.state||null;
    for(let i=lines.length-1;i>=0;i--){const event=statusEvent(lines[i]);if(event){state=event;break}}
    this.files.set(file,{size:st.size,mtime:st.mtimeMs,state});
   }catch(e){if(e.code==='ENOENT')this.files.delete(file);else this.error=e.code}
  }
  const tasks=[];
  for(const [file,entry] of this.files){const meta=this.index.find(t=>path.resolve(t.rollout_path||'.')===path.resolve(file));if(!meta&&this.index.length)continue;
   const running=!!(entry.state?.running&&Date.parse(entry.state.time)>=this.bootTime&&processAlive);
   tasks.push({id:meta?.id||path.basename(file).match(/[a-f0-9]{8}-[a-f0-9-]{27,}/)?.[0],title:meta?.title||'本地 Codex 任务',cwd:meta?.cwd||'',running,stage:running?(entry.state?.stage||'thinking'):'idle',activity:running?(entry.state?.activityLabel||'正在处理'):(entry.state?.activityLabel||'待机'),updatedAt:entry.state?.time||new Date(entry.mtime).toISOString()});
  }
  tasks.sort((a,b)=>Number(b.running)-Number(a.running)||Date.parse(b.updatedAt)-Date.parse(a.updatedAt));
  const count=tasks.filter(t=>t.running).length;
  return {running:count>0,count,tasks:tasks.slice(0,30),error:this.error};
 }
}
module.exports={TaskMonitor,statusEvent};
