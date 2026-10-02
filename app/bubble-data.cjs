// Only user-visible assistant final messages are read, never reasoning or tool output.
const fs=require('fs');
function finalReply(line){let d;try{d=JSON.parse(line)}catch{return null}
 if(d.type==='event_msg'&&d.payload?.type==='task_complete'&&typeof d.payload.last_agent_message==='string')return{text:d.payload.last_agent_message,time:d.timestamp};
 const p=d.payload;if(d.type==='response_item'&&p?.type==='message'&&p.role==='assistant'&&p.channel==='final')return{text:(p.content||[]).filter(x=>x.type==='output_text'||x.type==='text').map(x=>x.text||'').join('\n'),time:d.timestamp};
 return null;
}
class ReplyReader{constructor(){this.cache=new Map()}
 read(file){try{const st=fs.statSync(file),cached=this.cache.get(file);if(cached?.size===st.size&&cached.mtime===st.mtimeMs)return cached.reply;const start=Math.max(0,st.size-2*1024*1024),b=Buffer.alloc(st.size-start),fd=fs.openSync(file,'r');try{fs.readSync(fd,b,0,b.length,start)}finally{fs.closeSync(fd)}const lines=b.toString('utf8').split('\n');if(start)lines.shift();if(!lines.at(-1))lines.pop();let reply=null;for(let i=lines.length-1;i>=0;i--){reply=finalReply(lines[i]);if(reply?.text)break}if(reply)reply.text=reply.text.slice(0,32000);this.cache.set(file,{size:st.size,mtime:st.mtimeMs,reply});return reply}catch{return null}}
}
module.exports={finalReply,ReplyReader};
