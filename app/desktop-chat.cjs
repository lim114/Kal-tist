// Native Desktop bridge, informed by kajmahal/chatgpt-conversations-mcp
// (Apache-2.0). No cookies, login database, token extraction or app patching.
const fs=require('fs'),net=require('net'),{randomUUID}=require('crypto');
class DesktopChat{
 constructor({carrierThreadId,timeout=30000}={}){this.carrierThreadId=carrierThreadId;this.timeout=timeout;this.pipe=null;this.locating=null}
 request(pipe,request){return new Promise((resolve,reject)=>{
  const bytes=Buffer.from(JSON.stringify(request)),frame=Buffer.alloc(bytes.length+4);frame.writeUInt32LE(bytes.length);bytes.copy(frame,4);
  const socket=net.createConnection(pipe);let buffer=Buffer.alloc(0),done=false;
  const finish=(err,result)=>{if(done)return;done=true;clearTimeout(timer);socket.destroy();err?reject(err):resolve(result)};
  const timer=setTimeout(()=>finish(Error('客户端响应超时')),this.timeout);
  socket.once('connect',()=>socket.write(frame));socket.once('error',e=>finish(Error(e.code==='EPERM'?'客户端连接权限不足':'客户端连接已断开')));socket.once('close',()=>finish(Error('客户端连接已关闭')));
  socket.on('data',chunk=>{buffer=Buffer.concat([buffer,chunk]);if(buffer.length<4)return;const length=buffer.readUInt32LE(0);if(length>16*1024*1024)return finish(Error('客户端响应过大'));if(buffer.length<length+4)return;try{finish(null,JSON.parse(buffer.subarray(4,length+4).toString('utf8')))}catch{finish(Error('客户端响应格式无效'))}});
 })}
 async locate(){
  if(this.pipe)return this.pipe;if(this.locating)return this.locating;
  this.locating=(async()=>{for(const name of fs.readdirSync('\\\\.\\pipe\\').filter(n=>n.startsWith('codex-browser-use-'))){const pipe=`\\\\.\\pipe\\${name}`;try{const r=await this.request(pipe,{jsonrpc:'2.0',id:randomUUID(),method:'tools/list',params:{threadStartKind:'all'}});if(r.result?.tools?.some(t=>t.name==='send_message_to_thread'))return this.pipe=pipe}catch{}}throw Error('未连接到 ChatGPT 客户端，请先打开并登录客户端。')})();
  try{return await this.locating}finally{this.locating=null}
 }
 async call(tool,args={},write=false){
  if(!this.carrierThreadId)throw Error('尚未配置本机对话桥接上下文。');
  if(!['list_threads','read_thread','send_message_to_thread','navigate_to_codex_page'].includes(tool))throw Error('不支持的桌面桥接操作');
  for(let attempt=0;attempt<(write?1:2);attempt++){
   try{const pipe=await this.locate(),r=await this.request(pipe,{jsonrpc:'2.0',id:randomUUID(),method:'tools/call',params:{namespace:'codex_app',callerSource:'codex',threadId:this.carrierThreadId,turnId:randomUUID(),callId:randomUUID(),tool,arguments:args}});if(r.error)throw Error(r.error.message);if(r.result?.success!==true)throw Error('客户端暂时无法完成请求，请在主窗口检查连接。');const text=r.result.contentItems?.find(x=>x.type==='inputText')?.text;if(!text)throw Error('客户端没有返回数据');return JSON.parse(text)}catch(e){this.pipe=null;if(write||attempt===1)throw e}
  }
 }
 list(){return this.call('list_threads',{limit:50})}
 read(id){return this.call('read_thread',{threadId:id,turnLimit:10,includeOutputs:true,maxOutputCharsPerItem:20000})}
 send(id,text){return this.call('send_message_to_thread',{threadId:id,prompt:text},true)}
 open(id){return this.call('navigate_to_codex_page',{threadId:id},true)}
}
module.exports={DesktopChat};
