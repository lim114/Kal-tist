const {app,BrowserWindow,ipcMain,Menu,screen,session,shell,dialog,Tray,nativeImage}=require('electron');
app.commandLine.appendSwitch('enable-font-antialiasing');
const {installAppIdentity,iconPath}=require('./app-identity.cjs');installAppIdentity(app);
const fs=require('fs'),path=require('path'),os=require('os');
const {readGlass,validateGlass}=require('./glass-settings.cjs');
const {BubbleHost}=require('./bubble-host.cjs'),{ReplyReader}=require('./bubble-data.cjs');
const {PetWindowStack}=require('./window-stack.cjs');
const replyReader=new ReplyReader();
const {MediaHost}=require('./media-host.cjs');
const {openNetEase}=require('./netease-launch.cjs');
const {TaskMonitor}=require('./monitor.cjs'),{readThreads}=require('./thread-index.cjs');
const {CodexClient,threadLink}=require('./codex-client.cjs'),{setAutostart,codexOpen}=require('./lifecycle.cjs');
const {DesktopChat}=require('./desktop-chat.cjs'),{ConversationHub}=require('./conversation-hub.cjs');
const root=path.resolve(__dirname,'..'),dataDir=path.join(root,'data'),qa=process.argv.includes('--qa'),testRuntime=process.argv.includes('--test-runtime');fs.mkdirSync(dataDir,{recursive:true});
app.setPath('userData',dataDir);app.setName('思衡托桌宠');
const configFile=path.join(dataDir,'settings.json');let config={size:340,facing:'auto',gaze:true,autoStart:false,bubbleHidden:true,mediaDetached:false,cwd:path.resolve(root,'../..')};try{config={...config,...JSON.parse(fs.readFileSync(configFile))}}catch{}
config={...config,...readGlass(config)};
if(!app.requestSingleInstanceLock()){app.quit()}else{
 const {DisplayTracking}=require('./display-tracking.cjs');
 const {startWindowDrag,moveWindowDrag}=require('./drag-window.cjs');
 const {nativeLayout}=require('./native-layout.cjs');let nativeView=null;
 const baseBounds=()=>{const b=interactionBounds||win.getContentBounds();return{x:b.x+(nativeView?.padX||0),y:b.y,width:config.size,height:config.size+40}};
 const inputActivity=new Map();
 const media=new MediaHost();
 let win,panel,music,tray,bubble,windowStack,displayTracking,interactionBounds=null,drag=null,pointerOver=false,manual=null,desktopOpen=true,quitting=false,indexTime=0;
 const client=new CodexClient(),monitor=new TaskMonitor(path.join(process.env.CODEX_HOME||path.join(os.homedir(),'.codex'),'sessions'));
 const conversations=new ConversationHub({bridge:new DesktopChat({carrierThreadId:process.env.CODEX_THREAD_ID}),file:path.join(dataDir,'conversations.json')});conversations.recover();
 let status={running:false,count:0,tasks:[]};
 const save=()=>{if(win&&!win.isDestroyed()){const b=baseBounds();config.x=b.x;config.y=b.y}fs.writeFileSync(configFile,JSON.stringify(config,null,2))};
 function snapshot(){const cs=client.snapshot(),tasks=[...(status.tasks||[])];if(cs.threadId&&!tasks.some(t=>t.id===cs.threadId))tasks.unshift({id:cs.threadId,title:'桌宠任务',running:cs.running,activity:cs.progress,updatedAt:new Date().toISOString(),stage:cs.requests.length?'waiting':cs.error?'error':'thinking'});else if(cs.threadId){const t=tasks.find(t=>t.id===cs.threadId);t.running=cs.running;t.activity=cs.progress;t.stage=cs.requests.length?'waiting':cs.error?'error':'thinking'}
  for(const t of tasks){const meta=monitor.index.find(m=>m.id===t.id);if(meta?.rollout_path)t.reply=replyReader.read(meta.rollout_path)}
  const external=Object.values(conversations.states).filter(t=>t.running&&!tasks.some(existing=>existing.id===t.threadId&&existing.running)).length,count=tasks.filter(t=>t.running).length+external,active=tasks.filter(t=>t.running),stage=cs.requests.length?'waiting':active.some(t=>t.stage==='waiting')?'waiting':count?'thinking':cs.error&&cs.threadId?'error':'idle';return {...status,viewport:nativeView?.frame,count,running:count>0,tasks,stage,inputActive:[...inputActivity.values()].some(t=>Date.now()-t<2300),manual,desktopOpen,config,glass:{native:!!bubble?.glass.active,supported:!!bubble?.glass.available},sizeLimit:win?Math.min(1000,screen.getDisplayMatching(win.getBounds()).workArea.height-55):1000,client:cs,conversations:conversations.snapshot()}}
 function send(){const s=snapshot();for(const w of [win,panel])if(w&&!w.isDestroyed())w.webContents.send('status',s);bubble?.update(s)}
 function poll(){if(Date.now()-indexTime>5000){monitor.index=readThreads(path.dirname(monitor.root));indexTime=Date.now()}status=monitor.poll(desktopOpen||client.running);send()}
 function setSize(value){const n=Number(value);if(!Number.isFinite(n))throw Error('大小必须是数字');const area=screen.getDisplayMatching(win.getBounds()).workArea,size=Math.max(120,Math.min(1000,Math.floor((area.height-30)/1.36)-40,Math.round(n))),b=baseBounds();config.size=size;nativeView=nativeLayout({x:b.x+(b.width-size)/2,y:b.y+b.height-size-40,width:size,height:size+40},area);win.setBounds(nativeView.bounds);if(drag)drag=startWindowDrag(win,screen.getCursorScreenPoint(),nativeView.bounds);save();send();return size}
 function safeWindow(w){w.webContents.setWindowOpenHandler(()=>({action:'deny'}));w.webContents.on('will-navigate',e=>e.preventDefault())}
 function openPanel(){
  if(panel&&!panel.isDestroyed()){panel.show();panel.focus();send();return}
  const area=screen.getDisplayMatching(win.getBounds()).workArea,b=win.getBounds(),width=470,height=Math.min(850,area.height-40);
  panel=new BrowserWindow({width,height,x:Math.max(area.x,Math.min(b.x-width+30,area.x+area.width-width)),y:Math.max(area.y,Math.min(b.y,area.y+area.height-height)),title:'思衡托 · 任务助手',frame:false,autoHideMenuBar:true,backgroundColor:'#15221f',show:false,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,offscreen:testRuntime}});
  windowStack.attach(panel);panel.on('hide',()=>{inputActivity.delete(panel.webContents.id);send()});
  safeWindow(panel);panel.loadFile(path.join(__dirname,'panel.html'));panel.once('ready-to-show',()=>{if(!testRuntime)panel.show();send()});panel.on('close',e=>{if(!quitting){e.preventDefault();panel.hide()}});
 }
 function mediaState(){return {...media.state,detached:!!config.mediaDetached}}
 function broadcastMedia(){for(const w of [panel,bubble?.win,music])if(w&&!w.isDestroyed())w.webContents.send('media-status',mediaState())}
 function floatMedia(){
  config.mediaDetached=true;save();
  if(music&&!music.isDestroyed()){if(!testRuntime)music.showInactive();broadcastMedia();return}
  const area=screen.getDisplayMatching(win.getBounds()).workArea,b=config.musicPosition||{x:area.x+80,y:area.y+80};
  music=new BrowserWindow({width:460,height:222,x:Math.max(area.x,Math.min(b.x,area.x+area.width-460)),y:Math.max(area.y,Math.min(b.y,area.y+area.height-222)),transparent:true,backgroundColor:'#00000000',frame:false,alwaysOnTop:true,resizable:false,hasShadow:false,skipTaskbar:true,show:false,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,offscreen:testRuntime}});
  windowStack.attach(music);safeWindow(music);music.loadFile(path.join(__dirname,'media.html'));music.on('will-move',(_e,b)=>{config.musicPosition={x:b.x,y:b.y};save()});music.once('ready-to-show',()=>{broadcastMedia();if(!testRuntime)music.showInactive()});music.on('close',e=>{if(!quitting){e.preventDefault();music.hide()}});broadcastMedia();
 }
 function openMedia(){if(config.mediaDetached)floatMedia();else{bubble?.show();const reveal=()=>bubble?.win.webContents.send('preview',{focusMedia:true});if(bubble?.ready)reveal();else bubble?.win.webContents.once('did-finish-load',reveal)}media.poll()}

 function menu(){win.setIgnoreMouseEvents(false);Menu.buildFromTemplate([
  {label:'任务面板 / 输入指令',click:openPanel},
  {label:'网易云音乐播放器',click:openMedia},
  {label:'显示对话气泡',click:()=>bubble?.show()},
  {label:'打开 Codex',click:()=>shell.openExternal('codex://launch')},
  {label:'自由调整大小…',click:openPanel},
  {label:'朝向',submenu:['auto','left','right'].map((v,i)=>({label:['随鼠标','朝左','朝右'][i],type:'radio',checked:config.facing===v,click(){config.facing=v;save();send()}}))},
  {label:'眼睛追随鼠标',type:'checkbox',checked:config.gaze,click(i){config.gaze=i.checked;save();send()}},
  {label:'动作预览',submenu:[['auto','自动'],['idle','待机'],['wave','放松示意'],['typing','输入中 · 低头读字'],['thinking','思考'],['waiting','等待 · 单手叉腰'],['error','困惑']].map(([s,label])=>({label,type:'radio',checked:(manual||'auto')===s,click(){manual=s==='auto'?null:s;send()}}))},
  {type:'separator'},{label:'退出桌宠',click:requestQuit}
 ]).popup({window:win,callback(){if(!win.isDestroyed())win.setIgnoreMouseEvents(!pointerOver,{forward:true})}})}
 async function requestQuit(){if(client.running){const r=await dialog.showMessageBox(win,{type:'question',buttons:['继续运行','中断桌宠任务并退出'],defaultId:0,cancelId:0,message:'桌宠发起的任务还在运行。',detail:'退出会中断该任务；Codex 主窗口的其他任务不受影响。'});if(r.response===0)return;await client.interrupt().catch(()=>{})}app.quit()}
 app.whenReady().then(()=>{
  session.defaultSession.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!details.url.startsWith('file:')&&!details.url.startsWith('data:')}));
  const savedPosition=Number.isFinite(config.x)&&Number.isFinite(config.y),area=(savedPosition?screen.getDisplayMatching({x:config.x,y:config.y,width:config.size,height:config.size+40}):screen.getPrimaryDisplay()).workArea,sz=Math.min(config.size,Math.floor((area.height-30)/1.36)-40);config.size=sz;
  nativeView=nativeLayout({x:config.x??area.x+area.width-sz-45,y:config.y??area.y+area.height-sz-55,width:sz,height:sz+40},area);
  win=new BrowserWindow({...nativeView.bounds,transparent:true,frame:false,resizable:false,hasShadow:false,alwaysOnTop:true,skipTaskbar:true,show:false,backgroundColor:'#00000000',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,offscreen:testRuntime,backgroundThrottling:false}});
  safeWindow(win);win.on('close',save);win.loadFile(path.join(__dirname,'index.html'));win.setIgnoreMouseEvents(true,{forward:true});
  windowStack=new PetWindowStack(win);win.on('show',()=>windowStack.schedule());
  displayTracking=new DisplayTracking({screen,win,canApply:()=>!interactionBounds,apply:display=>{
   const b=baseBounds();nativeView=nativeLayout(b,display.workArea);win.setBounds(nativeView.bounds);
   if(drag)drag=startWindowDrag(win,screen.getCursorScreenPoint(),nativeView.bounds);
   // Recover utility windows after a monitor is removed or the work area moves.
   for(const w of [panel,music])if(w&&!w.isDestroyed()){
    const r=w.getBounds(),a=screen.getDisplayMatching(r).workArea,width=Math.min(r.width,a.width),height=Math.min(r.height,a.height);
    w.setBounds({x:Math.round(Math.max(a.x,Math.min(r.x,a.x+a.width-width))),y:Math.round(Math.max(a.y,Math.min(r.y,a.y+a.height-height))),width,height});
   }
   bubble?.position();send();
  }});

  bubble=new BubbleHost(win,{preload:path.join(__dirname,'preload.cjs'),panel:openPanel,testRuntime,config,persist:save,raisePet:()=>windowStack.schedule()});windowStack.attach(bubble.win);bubble.win.on('hide',()=>{if(inputActivity.delete(bubble.win.webContents.id))send()});
  if(!qa&&!testRuntime){tray=new Tray(iconPath);tray.setToolTip('思衡托 · 双击角色触摸互动 · 右键打开任务面板');tray.setContextMenu(Menu.buildFromTemplate([{label:'打开任务面板',click:openPanel},{label:'网易云音乐播放器',click:openMedia},{label:'退出桌宠',click:requestQuit}]));tray.on('click',openPanel)}
  const timer=setInterval(poll,1000),processTimer=setInterval(async()=>{desktopOpen=await codexOpen();send()},4000);
  const pointerTimer=setInterval(()=>{if(!win||win.isDestroyed())return;const p=screen.getCursorScreenPoint();if(drag){const dx=moveWindowDrag(win,drag,p);win.webContents.send('pointer',{x:drag.x,y:drag.y,dragging:true,dx});return}const b=win.getBounds();win.webContents.send('pointer',{x:p.x-b.x,y:p.y-b.y})},33);
  media.on('change',broadcastMedia);media.watch();
  if(process.argv.includes('--music'))win.once('ready-to-show',openMedia);
  const chatTimer=setInterval(()=>{if(!testRuntime&&conversations.mode!=='codex'&&(panel?.isVisible()||bubble?.win?.isVisible()))conversations.read(conversations.mode).catch(()=>{})},12000);
  client.on('change',send);conversations.on('change',send);app.on('before-quit',()=>{quitting=true;displayTracking?.close();clearInterval(chatTimer);conversations.close();clearInterval(timer);clearInterval(processTimer);clearInterval(pointerTimer);save();media.close();music?.destroy();bubble?.close();client.close()});
  if(qa)win.webContents.once('did-finish-load',()=>setTimeout(runQA,5000));
 });
 async function runQA(){const out=path.join(root,'qa');fs.mkdirSync(out,{recursive:true});const painted=()=>win.webContents.executeJavaScript('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');const capture=async(name,code)=>{await win.webContents.executeJavaScript(code);await painted();fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG())};
  try{fs.writeFileSync(path.join(out,'initial.json'),JSON.stringify(await win.webContents.executeJavaScript('window.petQA.info()'),null,2));const states=['idle','wave','thinking','waiting','error'];for(const s of states)await capture(s,`window.petQA.freeze('${s}',0)`);for(const a of states)for(const b of states)if(a!==b)await capture(`${a}-to-${b}`,`window.petQA.freeze('${b}',0,'${a}>${b}',0.5)`);for(let i=0;i<=40;i++)await capture('motion-'+String(i).padStart(3,'0'),`window.petQA.freeze('thinking',0,'idle>thinking',${i/40})`);
   for(const direction of ['left','right'])await capture('face-'+direction,`window.petQA.direction('${direction}')`);
   await capture('gaze-left',`window.petQA.eye(-1,0)`);await capture('gaze-right',`window.petQA.eye(1,0)`);
   await capture('touch-head',`window.petQA.touch('head')`);await capture('touch-body',`window.petQA.touch('body')`);
   openPanel();await new Promise(r=>setTimeout(r,800));fs.writeFileSync(path.join(out,'panel.png'),(await panel.webContents.capturePage()).toPNG());
   fs.writeFileSync(path.join(out,'complete.json'),JSON.stringify({ok:true,statePreviews:6,transitionPreviews:30,eyeAndDirectionPreviews:4}));
  }catch(e){fs.writeFileSync(path.join(out,'error.txt'),String(e))}finally{app.quit()}}
 ipcMain.handle('interaction-frame',(_e,bounds)=>{
  if(!bounds){if(interactionBounds){win.setContentBounds(interactionBounds);interactionBounds=null;displayTracking?.flush();bubble?.suspend(false)}return null}
  if(interactionBounds)return null;if(!['minX','minY','maxX','maxY'].every(k=>Number.isFinite(bounds[k])))throw Error('Invalid interaction bounds');
  const b=baseBounds(),area=screen.getDisplayMatching(win.getBounds()).workArea,{layoutInteraction,frameForBounds}=require('./interaction-layout.cjs'),layout=layoutInteraction(b,area,bounds);
  interactionBounds=win.getContentBounds();bubble?.suspend(true);win.setContentBounds(layout.bounds);return frameForBounds(win.getContentBounds(),layout.anchor,bounds);
 });
 ipcMain.on('media-ready',e=>{if([panel?.webContents,bubble?.win?.webContents,music?.webContents].includes(e.sender)){e.sender.send('media-status',mediaState());media.poll()}});
 ipcMain.on('typing',(e,active)=>{if(typeof active!=='boolean'||![panel?.webContents,bubble?.win?.webContents].includes(e.sender))return;if(active)inputActivity.set(e.sender.id,Date.now());else inputActivity.delete(e.sender.id);send()});
 ipcMain.on('ready',()=>{poll();if(!testRuntime)win.showInactive()});ipcMain.on('panel-ready',send);
 ipcMain.on('hit',(_e,on)=>{pointerOver=on;win.setIgnoreMouseEvents(!on,{forward:true})});ipcMain.on('menu',menu);ipcMain.on('panel',openPanel);
 ipcMain.on('resize-step',(_e,delta)=>{if(Number.isFinite(delta))setSize(config.size+Math.max(-30,Math.min(30,delta)))});
 ipcMain.on('drag',(_e,on)=>{if(on){drag=startWindowDrag(win,screen.getCursorScreenPoint(),nativeView.bounds);win.setIgnoreMouseEvents(false)}else{drag=null;save()}});
 ipcMain.on('report',(_e,data)=>fs.writeFileSync(path.join(dataDir,'render-status.json'),JSON.stringify(data,null,2)));
 ipcMain.on('pet-above-panel',e=>{if(windowStack?.accepts(e.sender))windowStack.schedule()});
 ipcMain.handle('action',async(_e,action,p={})=>{try{let value;switch(action){
  case 'conversationMode':value=conversations.setMode(p.mode);break;
  case 'conversationRefresh':await conversations.refresh();await conversations.read(p.mode||conversations.mode);break;
  case 'conversationBind':await conversations.bind(p.mode,p.threadId);break;
  case 'conversationOpen':{const id=conversations.states[p.mode]?.threadId;if(!id)throw Error('请先选择会话');await conversations.bridge.open(id);break;}
  case 'detachMedia':floatMedia();break;
  case 'dockMedia':config.mediaDetached=false;save();music?.hide();broadcastMedia();openMedia();break;
  case 'followBubble':delete config.bubblePosition;save();bubble?.position();break;
  case 'showMedia':openMedia();break;
  case 'hideMedia':music?.hide();break;
  case 'openNetEase':await openNetEase();break;
  case 'mediaRefresh':await media.poll();break;
  case 'mediaControl':value=await media.command(p.command,p.position,p.mode,p.enabled);break;
  case 'hidePanel':panel?.hide();break;
  case 'size':value=setSize(p.size);break;
  case 'pose':if(!['auto','idle','wave','typing','thinking','waiting','error'].includes(p.state))throw Error('无效动作');manual=p.state==='auto'?null:p.state;send();break;
  case 'settings':{const glass=validateGlass(p);if(p.facing!=null){if(!['auto','left','right'].includes(p.facing))throw Error('无效朝向');config.facing=p.facing}if(typeof p.gaze==='boolean')config.gaze=p.gaze;if(typeof p.autoStart==='boolean'){const old=config.autoStart;config.autoStart=p.autoStart;save();try{await setAutostart(root,p.autoStart)}catch(e){config.autoStart=old;save();throw e}}Object.assign(config,glass);save();send();break;}
  case 'chooseDir':{const result=await dialog.showOpenDialog(panel,{title:'选择任务工作目录',defaultPath:config.cwd,properties:['openDirectory']});if(!result.canceled){config.cwd=result.filePaths[0];save();value=config.cwd;send()}break}
  case 'openCodex':await shell.openExternal(p.threadId?threadLink(p.threadId):'codex://launch');break;
  case 'openGPT':await shell.openExternal('https://chatgpt.com/');break;
  case 'draft':if(typeof p.text!=='string'||p.text.length>12000)throw Error('带入主窗口的指令最多 12000 字。');await shell.openExternal(threadLink(null,p.text,config.cwd));break;
  case 'send':{inputActivity.delete(_e.sender.id);const mode=p.mode||conversations.mode;if(mode==='codex')value=await client.send(p.text,config.cwd,!!p.newThread);else{if(p.threadId!==conversations.states[mode]?.threadId)throw Error('目标会话已改变，请确认后重新发送。');value=await conversations.send(mode,p.text)}break;}
  case 'stop':await client.interrupt();break;
  case 'answer':client.answer(p.id,p.value);break;
  default:throw Error('不支持的操作')}
  return {ok:true,value};}catch(e){return {ok:false,error:e.message}}});
 app.on('second-instance',(_e,args)=>{if(win)win.showInactive();if(args.includes('--music'))openMedia();else if(!args.includes('--auto'))openPanel()});app.on('window-all-closed',()=>app.quit());
}

