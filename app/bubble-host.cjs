const{BrowserWindow,ipcMain,screen}=require('electron');const path=require('path');
const {NativeGlass}=require('./native-glass.cjs');
class BubbleHost{
 constructor(pet,{preload,panel,testRuntime=false,config={},persist=()=>{},raisePet=()=>{}}){this.pet=pet;this.config=config;this.persist=persist;this.raisePet=raisePet;this.hidden=!!config.bubbleHidden;this.testRuntime=testRuntime;this.height=145;this.dismissed=null;this.key='';this.panel=panel;
  this.win=new BrowserWindow({width:460,height:this.height,transparent:true,thickFrame:false,backgroundColor:'#00000000',frame:false,alwaysOnTop:true,resizable:false,hasShadow:false,skipTaskbar:true,show:false,webPreferences:{preload,contextIsolation:true,nodeIntegration:false,sandbox:true,offscreen:testRuntime}});this.glass=new NativeGlass(this.win,{testRuntime,raisePet});this.glass.update(config);this.win.loadFile(path.join(__dirname,'bubble.html'));this.win.webContents.setWindowOpenHandler(()=>({action:'deny'}));this.win.webContents.on('will-navigate',e=>e.preventDefault());
  ipcMain.on('bubble-resize',(e,height)=>{if(e.sender!==this.win.webContents||!Number.isFinite(height))return;this.height=Math.min(680,Math.max(68,Math.ceil(height)));this.position()});ipcMain.on('bubble-dismiss',e=>{if(e.sender===this.win.webContents){this.hidden=true;this.config.bubbleHidden=true;this.persist();this.win.hide()}});
  this.win.on('will-move',(_e,b)=>{this.config.bubblePosition={x:b.x,y:b.y};this.persist()});
  pet.on('move',()=>this.position());pet.on('resize',()=>this.position());this.win.webContents.once('did-finish-load',()=>{this.ready=true;if(this.latest)this.update(this.latest)});
 }
 position(){if(this.pet.isDestroyed()||this.win.isDestroyed())return;const p=this.pet.getBounds(),saved=this.config.bubblePosition,area=screen.getDisplayMatching(saved?{...saved,width:460,height:this.height}:p).workArea,width=Math.min(460,area.width-20),height=Math.min(this.height,area.height-20);const prefer=p.x-width+55,x=prefer>=area.x?prefer:Math.min(area.x+area.width-width,p.x+p.width-55),y=Math.max(area.y,Math.min(p.y-height+65,area.y+area.height-height));this.win.setBounds({x:Math.round(saved?Math.max(area.x,Math.min(saved.x,area.x+area.width-width)):x),y:Math.round(saved?Math.max(area.y,Math.min(saved.y,area.y+area.height-height)):y),width,height})}
 reveal(){this.win.webContents.send('preview',{bubbleShown:true});this.win.showInactive();this.raisePet()}
 update(s){this.latest=s;const t=s.tasks?.find(t=>t.running)||s.tasks?.[0];this.key=[t?.id,!!t?.running,t?.reply?.time||'',s.client?.requests?.length||0].join('|');if(!this.ready||this.win.isDestroyed())return;this.glass.update(s.config||{});this.win.webContents.send('status',{...s,glassNative:this.glass.active});this.position();if(this.suspended)this.win.hide();else if(!this.testRuntime&&!this.hidden&&!this.win.isVisible())this.reveal()}
 suspend(on){this.suspended=on;if(on)this.win.hide();else if(this.latest)this.update(this.latest)}
 show(){this.hidden=false;this.config.bubbleHidden=false;this.persist();if(!this.win.isDestroyed()){this.position();if(!this.testRuntime)this.reveal()}}
 close(){if(!this.win.isDestroyed())this.win.destroy()}
}
module.exports={BubbleHost};
