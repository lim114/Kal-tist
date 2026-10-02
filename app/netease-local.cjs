// Local-only adapter. Based on the control-channel pattern documented by
// https://github.com/Seraph310/cloudmusic-desktop-mcp (MIT).
// Runtime module IDs are discovered by capability; no account/queue data read.
const PORT=19263;
const setup=`(()=>{
 if(!window.__esperantaMusic){
  let req;webpackJsonp.push([[987667],{987667:function(m,e,r){req=r}},[[987667]]]);
  let store,audio;
  for(const m of Object.values(req.c)){const ex=m.exports||{};
   if(ex.AudioPlayer&&typeof ex.AudioPlayer.subscribePlayStatus==='function')audio=ex.AudioPlayer;
   for(const v of Object.values(ex))if(v&&typeof v.getStore==='function'&&typeof v.getDispatch==='function'&&v.getStore()?.playing)store=v;
  }
  if(!store||!audio)throw Error('Unsupported NetEase runtime');
  const link={store,audio,progress:null};window.__esperantaMusic=link;
  audio.subscribePlayStatus({type:'playprogress',callback:p=>{link.progress={playId:p.playId,current:p.current,time:Date.now()}}});
 }
 return true;
})()`;
const snapshot=`(async()=>{
 const l=window.__esperantaMusic,s=l.store.getStore().playing,p=l.progress;
 const position=p?.playId===s.playId?p.current:s.restoreResource?.current;
 const artists=s.resourceArtists||[];
 return {title:String(s.resourceName||''),artist:artists.map(a=>typeof a==='string'?a:a.name||'').join(' / '),duration:Number(s.resourceDuration)||0,position:Number.isFinite(position)?position:null,observedAt:p?.playId===s.playId?p.time:Date.now(),playing:s.playingState===2,rate:Number(s.playingSpeed)||1,mode:s.playingMode,trackId:String(s.resourceTrackId||''),canSeek:!!s.resourceTrackId};
})()`;
class NetEaseLocal{
 constructor(){this.connected=false;this.retryAt=0;this.last=null}
 async evaluate(expression){
  const response=await fetch(`http://127.0.0.1:${PORT}/json`,{signal:AbortSignal.timeout(1000)}),targets=await response.json();
  const target=targets.find(t=>t.type==='page'&&t.url.startsWith('orpheus://'));
  if(!target)throw Error('网易云本地控制页未就绪');
  const u=new URL(target.webSocketDebuggerUrl);
  if(u.protocol!=='ws:'||u.hostname!=='127.0.0.1'||u.port!==String(PORT))throw Error('无效的本地媒体地址');
  return new Promise((resolve,reject)=>{const ws=new WebSocket(u.href);let done=false;
   const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);ws.close();error?reject(error):resolve(value)};
   const timer=setTimeout(()=>finish(Error('网易云控制响应超时')),7000);
   ws.onopen=()=>ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression:setup+';'+expression,returnByValue:true,awaitPromise:true}}));
   ws.onerror=()=>finish(Error('网易云本地连接已断开'));
   ws.onclose=()=>{if(!done)finish(Error('网易云本地连接已关闭'))};
   ws.onmessage=e=>{try{const r=JSON.parse(e.data);if(r.id!==1)return;if(r.error||r.result?.exceptionDetails)finish(Error('此版本网易云未接受媒体操作'));else finish(null,r.result?.result?.value)}catch(err){finish(err)}};
  });
 }
 async read(){if(Date.now()<this.retryAt)return null;try{const s=await this.evaluate(snapshot);this.connected=true;this.last=s;return s}catch{this.connected=false;this.retryAt=Date.now()+5000;return null}}
 async command(command,{position,mode,enabled}={}){
  let action,payload;
  if(command==='seek'){if(!Number.isFinite(position)||!this.last||position<0||position>this.last.duration)throw Error('无效的播放位置');action='playing/setPlayingPosition';payload={duration:position}}
  else if(command==='repeat'){const m={None:'playOrder',List:'playCycle',Track:'playOneCycle'}[mode];if(!m)throw Error('无效的循环模式');action='playing/switchPlayingMode';payload={playingMode:m,triggerScene:'sysTray',HeartBeatFlage:false}}
  else if(command==='shuffle'){if(typeof enabled!=='boolean')throw Error('无效的随机模式');action='playing/switchPlayingMode';payload={playingMode:enabled?'playRandom':'playCycle',triggerScene:'sysTray',HeartBeatFlage:false}}
  else throw Error('无效的本地媒体操作');
  await this.evaluate(`(async()=>{await window.__esperantaMusic.store.getDispatch()(${JSON.stringify({type:action,payload})});return true})()`);
 }
}
module.exports={NetEaseLocal,PORT};
