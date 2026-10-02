// One shared UI for both composers; all live data comes from MediaHost.
export function mountMedia(element,{floating=false}={}){
 const root=element.attachShadow({mode:'open'}),host=window.petHost;
 root.innerHTML=`<link rel="stylesheet" href="media-widget.css"><div class="detached-note" hidden>音乐已分离 <button id="showDetached">显示</button><button id="redock">嵌回</button></div><div class="media-content" aria-label="网易云音乐播放器"><div class="song"><div class="art"><span id="placeholder" aria-hidden="true">♫</span><img id="cover" alt="专辑封面" hidden></div><div class="info"><p id="status">正在连接</p><h1 id="title">等待网易云音乐</h1><p id="artist">在网易云里播放，即可在这里控制。</p><p id="album"></p></div></div>
<div class="timeline"><input id="seek" type="range" min="0" max="1" step="0.1" value="0" aria-label="播放进度" disabled><div><span id="elapsed">--:--</span><span id="duration">--:--</span></div></div>
<div class="controls"><button id="repeat" class="mode" title="循环模式" aria-label="循环模式" disabled>↻</button><button id="previous" title="上一首" aria-label="上一首" disabled><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M5 5.5a1 1 0 0 1 2 0v5.1l12-6.3a.8.8 0 0 1 1.2.7v14a.8.8 0 0 1-1.2.7L7 13.4v5.1a1 1 0 0 1-2 0z"/></svg></button><button id="play" title="播放" aria-label="播放" class="play" disabled><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M8 5 L19 12 L8 19 Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></button><button id="next" title="下一首" aria-label="下一首" disabled><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M19 5.5a1 1 0 0 0-2 0v5.1L5 4.3a.8.8 0 0 0-1.2.7v14a.8.8 0 0 0 1.2.7L17 13.4v5.1a1 1 0 0 0 2 0z"/></svg></button><button id="shuffle" class="mode" title="随机播放" aria-label="随机播放" disabled>⤨</button></div>
<p id="message" role="status">读取 Windows 媒体会话…</p><div class="media-links"><button id="open">打开网易云</button><button id="refresh">重新连接</button><button id="detach">分离音乐框</button><span id="link">网易云音乐</span></div></div>`;
 const $=id=>root.getElementById(id);
let state={connected:false,controls:{}},seeking=false,busy=false,commandError='',artwork='';
const fmt=n=>Number.isFinite(n)&&n>=0?`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`:'--:--';
function positionAt(s,now=Date.now()){if(!(s.duration>0)||s.positionKnown===false)return 0;const delta=s.playing?Math.max(0,(now-s.observedAt)/1000)*(s.rate??1):0;return Math.max(0,Math.min(s.duration,(s.position||0)+delta))}
function paint(s){state=s;root.querySelector('.media-content').hidden=!floating&&!!s.detached;root.querySelector('.detached-note').hidden=floating||!s.detached;$('detach').hidden=floating;const c=s.controls||{},online=s.connected;
 $('status').textContent=online?(s.playing?'正在播放':'已暂停'):s.reason==='bridge-error'?'连接暂不可用':'等待连接';
 $('title').textContent=online?(s.title||'未提供歌名'):'等待网易云音乐';$('title').title=s.title||'';
 $('artist').textContent=online?(s.artist||'未提供歌手'):'在网易云里播放，即可在这里控制。';$('album').textContent=online?s.album||'':'';
 const art=online&&/^data:image\/(png|jpeg|jpg|webp|bmp|gif);base64,/.test(s.artwork||'')?s.artwork:'';
 if(art!==artwork){artwork=art;if(art)$('cover').src=art;else $('cover').removeAttribute('src');$('cover').hidden=!art;$('placeholder').hidden=!!art}
 const playAction=s.playing?'pause':'play';$('play').innerHTML=s.playing?'<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx=".8"/><rect x="14" y="4" width="4" height="16" rx=".8"/></svg>':'<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M8 5 L19 12 L8 19 Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';$('play').title=s.playing?'暂停':'播放';$('play').setAttribute('aria-label',$('play').title);
 $('play').disabled=!online||busy||!(c[playAction]||c.toggle);for(const k of ['next','previous'])$(k).disabled=!online||busy||!c[k];
 $('repeat').disabled=!online||busy||!c.repeat;$('repeat').textContent='↻';$('repeat').dataset.badge=s.repeat==='Track'?'1':s.repeat==='List'?'∞':'';$('repeat').title=c.repeat?({None:'顺序播放',Track:'单曲循环',List:'列表循环'}[s.repeat]||'循环模式')+' · 点击切换':'当前客户端未提供循环控制';$('repeat').setAttribute('aria-label',$('repeat').title);
 $('shuffle').disabled=!online||busy||!c.shuffle;$('shuffle').classList.toggle('selected',!!s.shuffle);
 $('seek').disabled=!online||busy||!c.seek||!(s.duration>0);$('seek').max=s.duration||1;$('duration').textContent=s.duration>0?fmt(s.duration):'--:--';
 $('message').classList.toggle('error',!!commandError||!!(online&&!s.localConnected&&s.duration<=0));$('message').textContent=commandError||(s.error?'媒体连接暂不可用，点击“重新连接”重试。':!online?'请先在网易云中播放歌曲。若仍未连接，请检查客户端是否支持 Windows 系统媒体控制。':!s.localConnected&&s.duration<=0?'请退出网易云，再点击这里的“打开网易云”启用进度与循环控制。':!c.seek?'进度已同步；网易云当前未开放拖动定位。':'播放控制已连接，拖动进度条可调整播放位置。');
 tick();
}
function tick(){if(!seeking){const value=positionAt(state);$('seek').value=value;$('elapsed').textContent=state.duration>0&&state.positionKnown!==false?fmt(value):'--:--'}}
async function command(name,payload={}){if(busy)return;busy=true;commandError='';paint(state);try{const r=await host.action(name,payload);if(!r.ok)commandError=r.error||'操作未完成'}catch{commandError='连接中断，请重试'}finally{busy=false;paint(state)}}
$('repeat').onclick=()=>command('mediaControl',{command:'repeat',mode:{None:'List',List:'Track',Track:'None'}[state.repeat]||'List'});
$('shuffle').onclick=()=>command('mediaControl',{command:'shuffle',enabled:!state.shuffle});
$('play').onclick=()=>command('mediaControl',{command:state.controls[state.playing?'pause':'play']?(state.playing?'pause':'play'):'toggle'});
for(const k of ['next','previous'])$(k).onclick=()=>command('mediaControl',{command:k});
$('seek').addEventListener('input',()=>{seeking=true;$('elapsed').textContent=fmt(Number($('seek').value))});
$('seek').addEventListener('change',async()=>{const position=Number($('seek').value);await command('mediaControl',{command:'seek',position});seeking=false;tick()});
$('seek').addEventListener('blur',()=>{seeking=false;tick()});
$('cover').onerror=()=>{$('cover').hidden=true;$('placeholder').hidden=false};
$('detach').onclick=()=>command('detachMedia');$('showDetached').onclick=()=>command('showMedia');$('redock').onclick=()=>command('dockMedia');
$('open').onclick=()=>command('openNetEase');$('refresh').onclick=()=>command('mediaRefresh');
host.onMedia(paint);host.mediaReady();setInterval(tick,250);


 return {focus(){element.scrollIntoView({block:'nearest',behavior:'smooth'});$('open').focus({preventScroll:true})}};
}
