const path=require('path');
const appId='Esperanta.Companion.Desktop';
const iconPath=path.join(__dirname,'assets','theme','esperanta-app.ico');
const pngPath=path.join(__dirname,'assets','theme','esperanta-app.png');
function installAppIdentity(app){
 if(process.platform==='win32')app.setAppUserModelId(appId);
 app.on('browser-window-created',(_event,win)=>{
  win.setIcon(pngPath);
  if(process.platform==='win32')win.setAppDetails({appId,appIconPath:iconPath,appIconIndex:0,
   relaunchCommand:`"${process.execPath}" "${__dirname}"`,relaunchDisplayName:'思衡托桌宠'});
 });
}
module.exports={installAppIdentity,appId,iconPath,pngPath};
