const {EventEmitter}=require('events');
const {spawn}=require('child_process');
const path=require('path');
const {NetEaseLocal}=require('./netease-local.cjs');
const empty=()=>({available:true,connected:false,reason:'connecting',title:'',artist:'',artwork:'',position:0,duration:0,playing:false,controls:{}});
class MediaHost extends EventEmitter {
 constructor(){super();this.local=new NetEaseLocal();this.state=empty();this.child=null;this.pending=new Map();this.id=0;this.buffer='';this.closed=false;this.polling=false;this.timer=null;this.lastStart=0}
 start(){if(this.closed||this.child||Date.now()-this.lastStart<4000)return;this.lastStart=Date.now();
  this.child=spawn(path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe'),['-NoProfile','-Mta','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'media-bridge.ps1')],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  this.buffer='';const child=this.child;let errors='';
  child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{this.buffer+=chunk;if(this.buffer.length>12000000){this.fail('媒体封面数据过大');child.kill();return}let n;while((n=this.buffer.indexOf('\n'))>=0){const line=this.buffer.slice(0,n);this.buffer=this.buffer.slice(n+1);try{const r=JSON.parse(line);const p=this.pending.get(r.id);if(!p)continue;clearTimeout(p.timer);this.pending.delete(r.id);if(r.ok){p.resolve(r.state)}else p.reject(Error(r.error||'播放器拒绝了操作'))}catch{}}});
  child.stderr.on('data',b=>{errors=(errors+b.toString()).slice(-1500)});
  child.on('error',()=>this.fail('无法启动 Windows 媒体连接'));
  child.on('exit',()=>{if(this.child!==child)return;this.child=null;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('Windows 媒体连接已断开'))}this.pending.clear();if(!this.closed)this.fail('Windows 媒体连接暂不可用');this.lastError=errors});
 }
 update(state){this.state={...empty(),...state,receivedAt:Date.now()};this.emit('change',this.state)}
 fail(message){this.update({available:false,connected:false,reason:'bridge-error',error:message})}
 request(command,extra={}){if(this.closed)return Promise.reject(Error('播放器已关闭'));this.start();if(!this.child)return Promise.reject(Error('正在重新连接 Windows 媒体服务'));const id=++this.id;
  return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('播放器响应超时'));this.child?.kill()},14000);this.pending.set(id,{resolve,reject,timer});this.child.stdin.write(JSON.stringify({id,command,...extra})+'\n',e=>{if(e){clearTimeout(timer);this.pending.delete(id);reject(e)}})});
 }
 async merge(state){const local=await this.local.read();if(local?.title){const same=state.title===local.title,known=Number.isFinite(local.position);state={...state,available:true,connected:true,source:state.source||'cloudmusic.exe',title:local.title,artist:local.artist||state.artist,artwork:same?state.artwork:'',duration:local.duration,position:known?local.position:0,positionKnown:known,observedAt:local.observedAt,playing:local.playing,rate:local.rate,localConnected:true,repeat:{playOrder:'None',playOneCycle:'Track',playCycle:'List',playRandom:'List'}[local.mode]||'None',shuffle:local.mode==='playRandom',controls:{...state.controls,seek:local.canSeek&&local.duration>0,repeat:true,shuffle:true}}}this.update(state);return this.state}
 async poll(){if(this.polling||this.closed)return;this.polling=true;try{await this.merge(await this.request('snapshot'))}catch{if(!this.closed)this.fail('正在重新连接 Windows 媒体服务')}finally{this.polling=false}}
 watch(){this.poll();this.timer=setInterval(()=>this.poll(),1000)}
 async command(command,position,mode,enabled){if(!['play','pause','toggle','next','previous','seek','repeat','shuffle'].includes(command))throw Error('无效的播放器操作');if(!this.state.connected)throw Error('请先在网易云音乐中播放歌曲');if(command==='seek'&&!Number.isFinite(position))throw Error('无效的播放位置');if(!this.state.controls[command])throw Error('网易云当前没有提供此控制');if(['seek','repeat','shuffle'].includes(command)&&this.state.localConnected){await this.local.command(command,{position,mode,enabled});return this.merge(await this.request('snapshot'))}return this.merge(await this.request(command,{source:this.state.source,position,mode,enabled}))}
 close(){this.closed=true;clearInterval(this.timer);for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('播放器已关闭'))}this.pending.clear();this.child?.kill();this.child=null}
}
module.exports={MediaHost};

