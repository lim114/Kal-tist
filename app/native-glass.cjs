const os=require('os');
function supported(platform=process.platform,release=os.release()){return platform==='win32'&&Number(release.split('.')[2])>=22621}
// A separate native backing surface prevents DWM from painting the transparent
// web window's outer padding. The foreground retains all input and text.
class NativeGlass{
 constructor(win,{testRuntime=false,raisePet=()=>{}}={}){
  this.win=win;this.raisePet=raisePet;this.available=supported()&&!testRuntime;this.active=false;this.failed=false;this.backdrop=null;
  for(const event of ['move','resize'])win.on(event,()=>this.sync());
  win.on('show',()=>this.sync());win.on('hide',()=>this.backdrop?.hide());win.on('focus',()=>this.raise());
  win.on('closed',()=>{if(this.backdrop&&!this.backdrop.isDestroyed())this.backdrop.destroy()});
 }
 raise(){if(!this.active||!this.backdrop?.isVisible()||this.win.isDestroyed())return;this.backdrop.moveTop();this.win.moveTop();this.raisePet()}
 sync(){if(!this.active||this.win.isDestroyed()||!this.backdrop)return;
  // DWM corners are rounded in physical pixels, CSS corners in DIP. Keep the
  // native material two DIP inside the card so fractional scaling cannot leak.
  const b=this.win.getBounds();this.backdrop.setBounds({x:b.x+10,y:b.y+10,width:Math.max(1,b.width-20),height:Math.max(1,b.height-22)});
  if(this.win.isVisible()){if(!this.backdrop.isVisible())this.backdrop.showInactive();this.raise()}else this.backdrop.hide();
 }
 disable(error){this.failed=!!error;this.active=false;this.backdrop?.hide()}
 update(config){const on=this.available&&!this.failed&&config.glassBlur!==false;if(on===this.active)return;if(!on){this.disable();return}
  try{if(!this.backdrop){const {BrowserWindow}=require('electron');
   this.backdrop=new BrowserWindow({width:444,height:150,frame:false,thickFrame:false,transparent:false,backgroundColor:'#00000000',backgroundMaterial:'acrylic',roundedCorners:true,resizable:false,focusable:false,skipTaskbar:true,alwaysOnTop:true,show:false,hasShadow:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
   this.backdrop.setIgnoreMouseEvents(true);this.backdrop.webContents.setWindowOpenHandler(()=>({action:'deny'}));
   const path=require('path'),{execFile}=require('child_process'),shell=path.join(process.env.SystemRoot||'C:\\Windows','System32/WindowsPowerShell/v1.0/powershell.exe');
   execFile(shell,['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'native-corners.ps1'),'-WindowHandle',this.backdrop.getNativeWindowHandle().readBigUInt64LE().toString(),'-OwnerProcessId',String(process.pid)],{windowsHide:true,timeout:8000,env:{...process.env,PSModulePath:path.join(path.dirname(shell),'Modules')}},error=>{this.cornerError=error?.message||null});
   this.backdrop.loadURL('data:text/html;charset=utf-8,%3Cstyle%3Ehtml,body%7Bmargin:0;background:transparent%7D%3C/style%3E').catch(e=>this.disable(e));
  }this.active=true;this.sync()}catch(e){this.disable(e)}
 }
}
module.exports={NativeGlass,supported};
